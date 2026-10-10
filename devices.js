/* Devices & E2EE key transfer UI for the Uxaoro web/desktop client.
 * Hooks into the existing globals (CryptoApp, api(), toast(), connectWs, etc.)
 * exposed by app.js and adds:
 *   - "Linked devices" card in settings
 *   - Pair-new-device modal (shows pairing code + SAS, imports key on success)
 *   - Incoming-pairing-request notification (shown as a floating banner,
 *     with approve flow: confirm pairing code, confirm SAS, upload encrypted blob)
 */
(() => {
  if (window.__uxaDevicesLoaded) return;
  window.__uxaDevicesLoaded = true;

  /* Icons come from the shared icons/ folder via icons.js (window.Ico), loaded
     before this file. Guarded so a missing runtime never breaks the UI. */
  const icoAsset = (name, cls) => (window.Ico && window.Ico.asset ? window.Ico.asset(name, cls) : "");

  const LS_DEV_ID = "uxa_device_id";
  let deviceId = localStorage.getItem(LS_DEV_ID) || "";
  if (!deviceId) {
    const arr = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    deviceId = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(LS_DEV_ID, deviceId);
  }

  // Fetch helper that adds X-Device-Id header and uses existing token.
  async function apiDev(path, opts = {}) {
    return window.api(path, { ...opts, headers: { ...(opts.headers || {}), "X-Device-Id": deviceId } });
  }

  // ---------- WS event hook ----------
  // Monkey-patch the WebSocket onmessage to also surface our device_transfer_* events.
  function hookWs() {
    const old = window.connectWs;
    if (!old || old.__patched) return;
    window.connectWs = function () {
      const r = old.apply(this, arguments);
      const ws = S.ws;
      if (!ws) return r;
      // Wait a tick; ws is assigned inside connectWs synchronously.
      setTimeout(() => attachToWs(S.ws), 0);
      return r;
    };
    old.__patched = true;
    attachToWs(S.ws);
  }
  function attachToWs(ws) {
    if (!ws) return;
    // Already wrapped AND our wrapper is still the active handler → done.
    // (connectWs reassigns ws.onmessage on every reconnect, so re-wrap when
    // the active handler is no longer our wrapper.)
    if (ws.__devicesHooked && ws.__devicesHooked === ws.onmessage) return;
    const oldHandler = ws.onmessage;
    const wrapped = function (ev) {
      try {
        const msg = JSON.parse(ev.data);
        if (msg && msg.event === "chats_reset") {
          window.location.reload();
          return;
        }
        if (msg && ["e2ee_key_reroll_required", "e2ee_key_rotation_ready"].includes(msg.event)) {
          processKeyRotation().catch((error) => toast(error.message || "Could not rotate E2EE keys", "🔐"));
          return;
        }
        if (msg && msg.event && msg.event.startsWith("device_transfer_")) {
          handleDeviceEvent(msg.event, msg.data || {});
          return;
        }
      } catch (_) {}
      if (oldHandler) oldHandler.apply(this, arguments);
    };
    ws.onmessage = wrapped;
    ws.__devicesHooked = wrapped;
  }
  // Keep (re)attaching the hook: connectWs() replaces S.ws on every
  // reconnect, so a one-shot hook would lose device_transfer_* events after
  // the first reconnect. attachToWs() is idempotent (__devicesHooked flag).
  setInterval(() => {
    try {
      const ws = window.S && S.ws;
      if (ws) attachToWs(ws);
    } catch (_) {}
  }, 1000);

  // ---------- State ----------
  let incoming = null;       // pending transfer request seen by THIS (existing) device
  let newFlow = null;        // state for "pair this device" modal
  let pollTimer = null;
  let approveSasState = null; // when we're showing SAS confirmation for approval

  function handleDeviceEvent(event, data) {
    if (event === "device_transfer_request") {
      incoming = data;
      renderIncomingBanner();
    } else if (event === "device_transfer_ready") {
      if (newFlow && newFlow.transfer && data.transfer_id === newFlow.transfer.transfer_id) {
        onApprovedOnNew(data);
      }
    } else if (event === "device_transfer_completed") {
      toast("New device linked", "🔐");
      incoming = null;
      renderIncomingBanner();
      if (window.render) render();
    } else if (event === "device_transfer_denied") {
      if (newFlow) newFlow.fail = "Request denied";
    }
  }

  let rotationFlight = null;
  let rotationRetry = null;

  async function processKeyRotation() {
    if (rotationFlight) return rotationFlight;
    rotationFlight = (async () => {
      const state = await apiDev("/devices/key-rotation");
      if (!state || state.status === "none") return;
      try { localStorage.setItem("uxa_c_chats", "[]"); } catch (_) {}
      if (state.status === "no_key") {
        await apiDev("/devices/key-rotation/ack", { method: "POST", body: { rotation_id: state.rotation_id } });
        return;
      }
      if (state.status === "pending" || state.status === "claimed") {
        if (!CryptoApp.hasKeys()) return;
        const claim = await apiDev("/devices/key-rotation/claim", { method: "POST" });
        if (claim.status !== "claimed" || !claim.claim_token) {
          if (claim.status === "claimed") scheduleRotationRetry();
          return;
        }
        if (CryptoApp.publicPem() !== claim.old_pubkey) return;
        const prepared = await CryptoApp.prepareKeyRotation({
          userId: S.me.id,
          rotationId: claim.rotation_id,
          oldPublicPem: claim.old_pubkey,
        });
        await apiDev("/devices/key-rotation/complete", {
          method: "POST",
          body: {
            rotation_id: claim.rotation_id,
            claim_token: claim.claim_token,
            new_pubkey: prepared.publicPem,
            ciphertext: prepared.ciphertext,
            nonce: prepared.nonce,
            keys_json: prepared.keys_json,
          },
        });
        CryptoApp.importKeyPair(prepared.privatePem, prepared.publicPem);
        S.me.pubkey = prepared.publicPem;
        await apiDev("/devices/register", { method: "POST", body: { label: isDesktop() ? "Desktop" : "Web", platform: isDesktop() ? "desktop" : "web", device_pubkey: prepared.publicPem } });
        await apiDev("/devices/key-rotation/ack", { method: "POST", body: { rotation_id: claim.rotation_id } });
        toast("E2EE keys rotated on this device", "🔐");
        return;
      }
      if (state.status !== "ready" || !CryptoApp.hasKeys()) return;
      if (CryptoApp.publicPem() !== state.new_pubkey) {
        await CryptoApp.importKeyRotation({
          userId: S.me.id,
          rotationId: state.rotation_id,
          newPublicPem: state.new_pubkey,
          ciphertext: state.ciphertext,
          nonce: state.nonce,
          keysJson: state.keys_json,
        });
      }
      S.me.pubkey = state.new_pubkey;
      await apiDev("/devices/register", { method: "POST", body: { label: isDesktop() ? "Desktop" : "Web", platform: isDesktop() ? "desktop" : "web", device_pubkey: state.new_pubkey } });
      await apiDev("/devices/key-rotation/ack", { method: "POST", body: { rotation_id: state.rotation_id } });
      toast("E2EE keys updated on this device", "🔐");
    })();
    try { await rotationFlight; } finally { rotationFlight = null; }
  }

  function scheduleRotationRetry() {
    if (rotationRetry) return;
    rotationRetry = setTimeout(() => {
      rotationRetry = null;
      processKeyRotation().catch(() => {});
    }, 60_000);
  }

  window.UxaoroDeviceSecurity = { processKeyRotation };

  // ---------- Settings panel injection ----------
  function injectSettingsPanel() {
    const obs = new MutationObserver(() => {
      const root = document.getElementById("root");
      if (!root) return;
      if (S.view !== "settings") return;
      const anchor = root.querySelector(".sec-label");
      if (!anchor) return;
      if (root.querySelector("#devices-card")) return;
      const card = document.createElement("div");
      card.id = "devices-card";
      card.className = "card";
      card.innerHTML = `
        <div class="row spread">
          <div>
            <b>🔐 Linked devices — E2EE key transfer</b>
            <div class="tiny">Your private encryption key never leaves your device unencrypted. Pair a new device to securely copy E2EE keys via ECDH+AES-GCM.</div>
          </div>
          <button type="button" class="ghost" id="btn-devices">${icoAsset("devices")}<span>Manage</span></button>
        </div>
        <div id="dev-list" style="margin-top:10px"></div>
      `;
      // Insert at top of settings, right after the first h1.
      const h1 = root.querySelector("h1.h1");
      if (h1 && h1.nextSibling) h1.parentNode.insertBefore(card, h1.nextSibling);
      else root.insertBefore(card, root.firstChild);
      document.getElementById("btn-devices").onclick = openDevicesModal;
      loadDevicesInto(card.querySelector("#dev-list"));
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  async function loadDevicesInto(container) {
    if (!container) return;
    let items = [];
    try {
      items = await apiDev("/devices");
    } catch (e) { container.innerHTML = `<div class="tiny err">${esc(e.message)}</div>`; return; }
    if (!items.length) {
      container.innerHTML = `<div class="tiny muted">No other devices paired yet.</div>`;
      return;
    }
    container.innerHTML = items.map((d) => `
      <div class="row spread" style="padding:6px 0;border-top:1px solid var(--line)">
        <div>
          <b>${esc(d.label || "Unnamed device")}</b> ${d.is_current ? `<span class="nsfw-tag" style="background:var(--ok,#22c55e)">This device</span>` : ""}
          <div class="tiny">${esc(d.platform || "unknown")} · linked ${esc(when(d.created_at))}</div>
        </div>
        ${d.is_current ? "" : `<button class="ghost tiny" data-revoke-dev="${esc(d.id)}" style="padding:4px 8px;font-size:11px">${icoAsset("link-broken")}<span>Remove</span></button>`}
      </div>
    `).join("");
    container.querySelectorAll("[data-revoke-dev]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Remove this device? It will be signed out and need to pair again to read E2EE messages.")) return;
        try { await apiDev("/devices/" + encodeURIComponent(b.getAttribute("data-revoke-dev")), { method: "DELETE" }); toast("Device removed", "🔐"); loadDevicesInto(container); }
        catch (e) { alert(e.message); }
      };
    });
  }

  // ---------- Pairing modals ----------
  function openDevicesModal() {
    // Big modal with list + "Pair new device" button.
    closeModal();
    const host = document.createElement("div");
    host.id = "dev-modal";
    host.className = "modal-shade";
    host.innerHTML = `
      <div class="modal" style="max-width:540px">
        <div class="row spread">
          <h2 style="margin:0">Linked devices</h2>
          <button class="ghost" id="dm-close" aria-label="Close" title="Close">${icoAsset("close-circle")}</button>
        </div>
        <p class="tiny">Transfer your E2EE private key to another device over ECDH+AES-GCM. The server never sees plaintext keys.</p>
        <button id="dm-pair" style="margin:8px 0">${icoAsset("add-circle")}<span>Pair new device</span></button>
        <div id="dm-list"></div>
      </div>`;
    document.body.appendChild(host);
    host.querySelector("#dm-close").onclick = closeModal;
    host.onclick = (e) => { if (e.target === host) closeModal(); };
    host.querySelector("#dm-pair").onclick = openNewDeviceModal;
    loadDevicesInto(host.querySelector("#dm-list"));
  }

  function closeModal() {
    const h = document.getElementById("dev-modal");
    if (h) h.remove();
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  // ---------- NEW DEVICE: initiator ----------
  async function openNewDeviceModal() {
    closeModal();
    let label = prompt("Name this device (e.g. My Laptop):", (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "Web");
    if (label === null) return;
    label = (label || "Web device").slice(0, 60);
    const ephemeral = await CryptoApp.ecGenerate();
    let transfer;
    try {
      transfer = await apiDev("/devices/transfer/initiate", { method: "POST", body: { label, platform: isDesktop() ? "desktop" : "web", ephemeral_pubkey: ephemeral.publicKeyPem } });
    } catch (e) { alert(e.message); return; }
    newFlow = { transfer, ephemeral, label, sasStep: false };
    renderNewDeviceModal();
    // Poll for approval in case WS is flaky
    pollTimer = setInterval(async () => {
      if (!newFlow) { clearInterval(pollTimer); pollTimer = null; return; }
      try {
        const t = await apiDev("/devices/transfer/" + encodeURIComponent(newFlow.transfer.transfer_id));
        if (t.status === "approved" && t.encrypted_blob && t.approver_ephemeral_pubkey) {
          onApprovedOnNew(t);
        } else if (t.status === "denied" || t.status === "expired") {
          newFlow.fail = "Transfer " + t.status;
          clearInterval(pollTimer); pollTimer = null;
          renderNewDeviceModal();
        }
      } catch (_) {}
    }, 1500);
  }

  function renderNewDeviceModal() {
    const existing = document.getElementById("dev-modal");
    if (existing) existing.remove();
    const host = document.createElement("div");
    host.id = "dev-modal"; host.className = "modal-shade";
    const f = newFlow;
    if (!f) return;
    let body = "";
    if (f.fail) {
      body = `<p class="err">${esc(f.fail)}</p><button id="nd-close">${icoAsset("close-circle")}<span>Close</span></button>`;
    } else if (!f.sasStep) {
      body = `
        <p>On your logged-in device, open <b>Settings → Linked devices</b>. A pairing request for <b>${esc(f.label)}</b> should appear.</p>
        <p class="tiny">Confirm this pairing code on the other device:</p>
        <div class="secret-key" style="text-align:center;font-size:36px;letter-spacing:10px;margin:10px 0">${esc(f.transfer.pairing_code || "")}</div>
        <p class="tiny">Waiting for approval…</p>
        <div style="height:8px"></div>
        <button class="ghost" id="nd-cancel">${icoAsset("close-circle")}<span>Cancel</span></button>
      `;
    } else if (f.sasStep === "confirm") {
      body = `
        <p>Your other device should show a 6-digit verification code. <b>Confirm the codes match.</b></p>
        <div class="secret-key" style="text-align:center;font-size:40px;letter-spacing:10px;margin:10px 0">${esc(f.sas)}</div>
        <button id="nd-ok">${icoAsset("key")}<span>They match — import keys</span></button>
        <button class="ghost" id="nd-cancel" style="margin-top:6px">${icoAsset("close-circle")}<span>Cancel</span></button>
      `;
    } else if (f.sasStep === "importing") {
      body = `<p>Importing E2EE keys…</p>`;
    } else if (f.sasStep === "done") {
      body = `<p>✅ Device paired. Messages will now decrypt on this device.</p><button id="nd-close">${icoAsset("check-circle")}<span>Done</span></button>`;
    }
    host.innerHTML = `
      <div class="modal" style="max-width:500px">
        <div class="row spread"><h2 style="margin:0">Pair this device</h2><button class="ghost" id="nd-x" aria-label="Close" title="Close">${icoAsset("close-circle")}</button></div>
        ${body}
      </div>`;
    document.body.appendChild(host);
    const closeBtn = host.querySelector("#nd-close, #nd-x, #nd-cancel");
    if (closeBtn) closeBtn.onclick = () => { closeModal(); newFlow = null; };
    const okBtn = host.querySelector("#nd-ok");
    if (okBtn) okBtn.onclick = async () => {
      newFlow.sasStep = "importing"; renderNewDeviceModal();
      try {
        const res = await CryptoApp.transferUnseal(
          newFlow.ephemeral.keyPair,
          newFlow.approverPub,
          newFlow.transfer.pairing_code,
          newFlow.transfer.encrypted_blob,
          newFlow.transfer.blob_nonce,
        );
        if (res.sasCode !== newFlow.sas) throw new Error("Verification code mismatch: possible MITM");
        CryptoApp.importBackup(res.bundle.privateKeyPem);
        // Push our pubkey & mark transfer complete
        await apiDev("/users/me/pubkey", { method: "PUT", body: { pubkey: res.bundle.publicKeyPem } });
        await apiDev("/devices/transfer/" + encodeURIComponent(newFlow.transfer.transfer_id) + "/complete", { method: "POST", body: { device_pubkey: res.bundle.publicKeyPem } });
        const plat = isDesktop() ? "desktop" : "web";
        const label = newFlow.label || (plat === "desktop" ? "Desktop" : "Web");
        await apiDev("/devices/register", { method: "POST", body: { label, platform: plat, device_pubkey: res.bundle.publicKeyPem } });
        newFlow.sasStep = "done"; renderNewDeviceModal();
        if (window.S) S.me = Object.assign({}, S.me, { pubkey: res.bundle.publicKeyPem, has_pubkey: true });
      } catch (e) {
        alert("Failed to import keys: " + e.message);
        newFlow = null; closeModal();
      }
    };
  }

  function onApprovedOnNew(t) {
    if (!newFlow) return;
    // Compute SAS to show user
    (async () => {
      try {
        // We need to unseal to derive SAS; we do a partial computation using a helper
        // exposed on CryptoApp. But transferUnseal already derives SAS. So we call it
        // only after confirm: instead compute SAS via a lightweight path by calling
        // transferUnseal and catching any tag mismatch only after confirm? Instead
        // we derive SAS the same way Android does — use the same primitive via a helper:
        const theirPub = await crypto.subtle.importKey(
          "spki",
          pemToBufLocal(t.approver_ephemeral_pubkey),
          { name: "ECDH", namedCurve: "P-256" }, false, [],
        );
        const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: theirPub }, newFlow.ephemeral.keyPair.privateKey, 256);
        const key = await crypto.subtle.importKey("raw", bits, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const out = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("sas")));
        let n = 0; for (let i = 0; i < 4; i++) n = (n * 256 + out[i]) >>> 0;
        const sas = String(n % 1000000).padStart(6, "0");
        newFlow.transfer = t;
        newFlow.sas = sas;
        newFlow.approverPub = t.approver_ephemeral_pubkey;
        newFlow.sasStep = "confirm";
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        renderNewDeviceModal();
      } catch (e) {
        alert(e.message);
      }
    })();
  }

  function pemToBufLocal(pem) {
    const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  // ---------- EXISTING DEVICE: approver ----------
  function renderIncomingBanner() {
    let el = document.getElementById("incoming-pair");
    if (!incoming) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "incoming-pair";
      el.style.cssText = "position:fixed;right:16px;bottom:16px;max-width:360px;background:var(--card,#1f2433);color:var(--ink,#fff);border:1px solid var(--line,#333);border-radius:12px;padding:12px;box-shadow:0 10px 40px rgba(0,0,0,.3);z-index:9999";
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <b>🔐 New device wants to pair</b>
      <div class="tiny" style="margin:4px 0 8px"><b>${esc(incoming.new_device_label || "A new device")}</b> (${esc(incoming.new_device_platform || "unknown")}) is asking to receive your E2EE keys.</div>
      <div class="tiny">Pairing code</div>
      <div style="font-size:28px;font-weight:900;letter-spacing:8px;text-align:center;margin:6px 0">${esc(incoming.pairing_code || "")}</div>
      <div class="row" style="gap:8px;margin-top:6px">
        <button id="ib-ap">${icoAsset("check-circle")}<span>Approve</span></button>
        <button class="ghost" id="ib-dn">${icoAsset("close-circle")}<span>Deny</span></button>
      </div>
    `;
    el.querySelector("#ib-dn").onclick = async () => {
      try { await apiDev("/devices/transfer/" + encodeURIComponent(incoming.transfer_id) + "/deny", { method: "POST" }); } catch (_) {}
      incoming = null; renderIncomingBanner();
    };
    el.querySelector("#ib-ap").onclick = () => startApprove();
  }

  async function startApprove() {
    const t = incoming;
    if (!t) return;
    // Fetch latest
    let fresh;
    try { fresh = await apiDev("/devices/transfer/" + encodeURIComponent(t.transfer_id)); } catch (e) { alert(e.message); return; }
    const privatePem = CryptoApp.privatePem();
    const publicPem = CryptoApp.publicPem();
    if (!privatePem) { alert("No E2EE private key on this device yet — open a chat first to generate keys."); return; }
    const sealed = await CryptoApp.transferSeal(privatePem, publicPem, fresh.new_ephemeral_pubkey, fresh.pairing_code);
    approveSasState = { transfer: fresh, sealed };
    showApproveSasModal();
  }

  function showApproveSasModal() {
    const st = approveSasState; if (!st) return;
    closeModal();
    const host = document.createElement("div");
    host.id = "dev-modal"; host.className = "modal-shade";
    host.innerHTML = `
      <div class="modal" style="max-width:500px">
        <h2 style="margin:0">Confirm verification code</h2>
        <p>Compare this code with the one on the new device. If they match the connection is safe.</p>
        <div class="secret-key" style="text-align:center;font-size:40px;letter-spacing:10px;margin:12px 0">${esc(st.sealed.sasCode)}</div>
        <div class="row" style="gap:8px">
          <button id="as-ok">${icoAsset("key")}<span>They match — send keys</span></button>
          <button class="ghost" id="as-cancel">${icoAsset("close-circle")}<span>Cancel</span></button>
        </div>
      </div>`;
    document.body.appendChild(host);
    host.querySelector("#as-cancel").onclick = () => { closeModal(); approveSasState = null; };
    host.querySelector("#as-ok").onclick = async () => {
      try {
        await apiDev("/devices/transfer/" + encodeURIComponent(st.transfer.transfer_id) + "/approve", {
          method: "POST",
          body: {
            approving_device_id: deviceId,
            approver_ephemeral_pubkey: st.sealed.approverEphemeralPubkey,
            encrypted_blob: st.sealed.ciphertextB64,
            blob_nonce: st.sealed.nonceB64,
          },
        });
        toast("Keys sent to new device", "🔐");
        approveSasState = null; incoming = null;
        renderIncomingBanner();
        closeModal();
      } catch (e) { alert(e.message); }
    };
    host.onclick = (e) => { if (e.target === host) { closeModal(); approveSasState = null; } };
  }

  // ---------- Helpers ----------
  function isDesktop() { return !!(window.UXAORO_DESKTOP); }
  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function when(s) {
    if (!s) return "";
    try {
      const d = new Date(s); const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return Math.floor(diff / 60) + "m ago";
      if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
      return d.toLocaleDateString();
    } catch (_) { return ""; }
  }

  // ---------- Init ----------
  function init() {
    if (!window.S) { setTimeout(init, 200); return; }
    hookWs();
    injectSettingsPanel();
    // Register device once logged in & E2EE keys are ready
    (async () => {
      if (!S.token) return;
      try {
        if (!CryptoApp.hasKeys() && S.me && S.me.pubkey) return;
        await CryptoApp.ensureKeys();
        const pub = CryptoApp.publicPem();
        await apiDev("/devices/register", { method: "POST", body: { label: isDesktop() ? "Desktop" : "Web", platform: isDesktop() ? "desktop" : "web", device_pubkey: pub } }).catch(() => {});
        await processKeyRotation().catch(() => {});
      } catch (_) {}
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
