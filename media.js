/* Uxaoro media kit: Telegram-style picker, photo editor, players, stickers. */
(() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function apiBase() {
    if (typeof window !== "undefined" && window.UXAORO_API) return String(window.UXAORO_API).replace(/\/$/, "");
    const h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0") return "";
    if (h === "api.fourtexec.site") return "";
    return "https://api.fourtexec.site";
  }
  function apiUrl(path) {
    if (!path) return apiBase() || "";
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith("/") ? path : "/" + path;
    const base = apiBase();
    return base ? base + p : p;
  }
  /* Icons come from the shared icons/ folder via icons.js (window.Ico), which is
     loaded before this file. Guarded so a missing runtime never breaks the UI. */
  const icoAsset = (name, cls) => (window.Ico && window.Ico.asset ? window.Ico.asset(name, cls) : "");

  const mediaUrl = (u) => {
    if (!u) return "";
    if (/^https?:\/\//.test(u) || u.startsWith("blob:") || u.startsWith("data:")) return u;
    return apiUrl(u.startsWith("/") ? u : "/" + u);
  };

  /* ---------- robust file picker (fixes web photo selection) ---------- */
  // Why this fixes picking: previous code relied on a single static
  // <input type=file> that gets destroyed on every SPA re-render, so the
  // chosen File object was lost / the dialog sometimes never opened on
  // mobile browsers. We create a fresh input per pick, outside #root,
  // and resolve with real File objects.
  function chooseFile(accept, multiple) {
    return new Promise((resolve) => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = accept || "*/*";
      inp.multiple = !!multiple;
      inp.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;";
      document.body.appendChild(inp);
      let done = false;
      const finish = (files) => {
        if (done) return;
        done = true;
        setTimeout(() => inp.remove(), 50);
        window.removeEventListener("focus", onFocus);
        resolve(files);
      };
      const onFocus = () => setTimeout(() => finish([]), 400);
      window.addEventListener("focus", onFocus);
      inp.onchange = () => finish([...(inp.files || [])]);
      inp.oncancel = () => finish([]);
      document.body.appendChild(inp);
      inp.click();
      // Fallback: if dialog dismissed without events, resolve empty.
      setTimeout(() => { if (!done && (!inp.files || !inp.files.length)) finish([]); }, 60000);
    });
  }
  const pickPhoto = () => chooseFile("image/*", false).then((f) => f[0] || null);
  const pickVideo = () => chooseFile("video/*", false).then((f) => f[0] || null);
  const pickAudio = () => chooseFile("audio/*", false).then((f) => f[0] || null);
  const pickMedia = () => chooseFile("image/*,video/*,audio/*", false).then((f) => f[0] || null);

  async function uploadFile(file, subdir) {
    const token = localStorage.getItem("uxa_access") || "";
    const fd = new FormData();
    fd.append("file", file, file.name || "upload.bin");
    fd.append("subdir", subdir || "media");
    const res = await fetch(apiUrl("/media/upload"), {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: fd,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { detail: text }; }
    if (!res.ok) throw new Error((data && (data.detail || data.error)) || ("HTTP " + res.status));
    return data;
  }

  // E2EE chat media: upload ciphertext only. `bytes` is a Uint8Array of
  // AES-GCM ciphertext; kind/mime are plaintext render hints for recipients.
  async function uploadEncrypted(bytes, kind, mime, subdir) {
    const token = localStorage.getItem("uxa_access") || "";
    const fd = new FormData();
    fd.append("file", new Blob([bytes], { type: "application/octet-stream" }), "enc.bin");
    fd.append("subdir", subdir || "chat");
    fd.append("enc", "1");
    fd.append("kind", kind || "file");
    if (mime) fd.append("mime", mime);
    const res = await fetch(apiUrl("/media/upload"), {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: fd,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { detail: text }; }
    if (!res.ok) throw new Error((data && (data.detail || data.error)) || ("HTTP " + res.status));
    return data;
  }

  function kindOf(url, mediaType, mime) {
    const t = String(mediaType || "").toLowerCase();
    if (t === "video" || t === "audio" || t === "image" || t === "sticker") return t;
    const m = String(mime || "").toLowerCase();
    if (m.startsWith("video/")) return "video";
    if (m.startsWith("audio/")) return "audio";
    if (m.startsWith("image/")) return "image";
    const u = String(url || "").toLowerCase().split("?")[0];
    if (/\.(mp4|webm|mov)$/.test(u)) return "video";
    if (/\.(mp3|ogg|oga|wav|m4a|weba|aac|flac)$/.test(u)) return "audio";
    if (/\.(jpg|jpeg|png|webp|gif|bmp|avif)$/.test(u)) return "image";
    return "";
  }

  /* ---------- message payload: E2EE text may carry media JSON ---------- */
  function parseMsgPayload(decrypted, fallback) {
    const fb = fallback || {};
    if (!decrypted) {
      return { text: "", media_url: fb.media_url || fb.image_url || "", media_type: fb.media_type || "", media_mime: fb.media_mime || "", sticker_id: fb.sticker_id || "", sticker: fb.sticker || null, forward: null };
    }
    const s = String(decrypted);
    if (s.startsWith("{") && s.endsWith("}")) {
      try {
        const o = JSON.parse(s);
        if (o && typeof o === "object" && ("text" in o || "media_url" in o || "sticker_id" in o)) {
          return {
            text: String(o.text || ""),
            media_url: o.media_url || o.image_url || fb.media_url || fb.image_url || "",
            media_type: o.media_type || fb.media_type || "",
            media_mime: o.media_mime || fb.media_mime || "",
            sticker_id: o.sticker_id || fb.sticker_id || "",
            sticker: o.sticker || fb.sticker || null,
            forward: o.forward || null,
          };
        }
      } catch (_) {}
    }
    return {
      text: s,
      media_url: fb.media_url || fb.image_url || "",
      media_type: fb.media_type || "",
      media_mime: fb.media_mime || "",
      sticker_id: fb.sticker_id || "",
      sticker: fb.sticker || null,
      forward: null,
    };
  }
  function packMsgPayload(text, att) {
    if (!att || (!att.media_url && !att.sticker_id)) return String(text || "");
    return JSON.stringify({
      text: String(text || ""),
      media_url: att.media_url || "",
      media_type: att.media_type || "",
      media_mime: att.media_mime || "",
      sticker_id: att.sticker_id || "",
    });
  }

  /* ---------- inline players (Telegram-style) ---------- */
  function postMediaHtml(p) {
    if (!p) return "";
    const vUrl = p.video_url || (p.media_type === "video" ? (p.media_url || p.image_url) : "");
    const aUrl = p.audio_url || (p.media_type === "audio" ? (p.media_url || p.image_url) : "");
    const iUrl = p.image_url || (p.media_type === "image" ? (p.media_url || "") : "");
    let html = "";
    if (iUrl && kindOf(iUrl, p.media_type, p.media_mime) !== "video" && kindOf(iUrl, p.media_type, p.media_mime) !== "audio") {
      html += `<img class="post-img" loading="lazy" src="${esc(mediaUrl(iUrl))}" alt="" data-zoom="${esc(mediaUrl(iUrl))}">`;
    }
    if (vUrl) {
      html += `<video class="post-video" controls playsinline preload="metadata" src="${esc(mediaUrl(vUrl))}" data-vzoom="${esc(mediaUrl(vUrl))}"></video>`;
    }
    if (aUrl) {
      const title = esc((p.text || "Voice message").slice(0, 60) || "Audio");
      html += `<div class="audio-card"><button class="ghost audio-play" data-audio="${esc(mediaUrl(aUrl))}" data-title="${title}" aria-label="Play audio">${icoAsset("play")}</button>`
        + `<div class="audio-meta"><div class="audio-title">${title}</div>`
        + `<audio controls preload="metadata" src="${esc(mediaUrl(aUrl))}" data-dock data-title="${title}"></audio></div></div>`;
    }
    return html;
  }

  function msgMediaHtml(parts) {
    if (!parts) return "";
    // Custom sticker pack image -> big sticker, no bubble chrome.
    const stickerImg = (parts.sticker && parts.sticker.image_url) || (parts.media_type === "sticker" ? parts.media_url : "");
    if (stickerImg) {
      return `<img class="sticker-big" loading="lazy" src="${esc(mediaUrl(stickerImg))}" alt="sticker">`;
    }
    const url = parts.media_url || "";
    if (!url) return "";
    const kind = kindOf(url, parts.media_type, parts.media_mime);
    if (kind === "video") {
      return `<video class="bubble-video" controls playsinline preload="metadata" src="${esc(mediaUrl(url))}"></video>`;
    }
    if (kind === "audio") {
      return `<div class="audio-card slim"><audio controls preload="metadata" src="${esc(mediaUrl(url))}" data-dock></audio></div>`;
    }
    return `<img class="bubble-img" loading="lazy" src="${esc(mediaUrl(url))}" alt="" data-zoom="${esc(mediaUrl(url))}">`;
  }

  function isSingleEmoji(text) {
    const s = String(text || "").trim();
    if (!s) return false;
    // One grapheme that is an emoji/sticker-like char.
    try {
      const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s);
      const parts = [...seg];
      if (parts.length !== 1) return false;
    } catch (_) {
      if ([...s].length !== 1 && s.length > 8) return false;
    }
    return /\p{Extended_Pictographic}/u.test(s);
  }

  /* ---------- global audio dock (music keeps playing while navigating) ---------- */
  const AudioDock = {
    el: null,
    audio: null,
    ensure() {
      if (this.el) return this.el;
      const bar = document.createElement("div");
      bar.id = "audio-dock";
      bar.className = "audio-dock hidden";
      bar.innerHTML = `<button class="ghost" id="audio-dock-toggle" aria-label="Pause or resume audio">${icoAsset("pause")}</button>
        <div class="audio-dock-meta"><div id="audio-dock-title">Audio</div>
        <input id="audio-dock-seek" type="range" min="0" max="1000" value="0"></div>
        <span id="audio-dock-time" class="tiny">0:00</span>
        <button class="ghost" id="audio-dock-close" aria-label="Close player" title="Close">${icoAsset("close-circle")}</button>
        <audio id="audio-dock-el" preload="metadata"></audio>`;
      document.body.appendChild(bar);
      this.el = bar;
      this.audio = bar.querySelector("#audio-dock-el");
      const seek = bar.querySelector("#audio-dock-seek");
      const time = bar.querySelector("#audio-dock-time");
      const toggle = bar.querySelector("#audio-dock-toggle");
      const fmt = (s) => {
        if (!isFinite(s)) return "0:00";
        s = Math.max(0, Math.floor(s));
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
      };
      this.audio.ontimeupdate = () => {
        if (this.audio.duration) seek.value = String(Math.floor((this.audio.currentTime / this.audio.duration) * 1000));
        time.textContent = fmt(this.audio.currentTime) + " / " + fmt(this.audio.duration);
      };
      this.audio.onplay = () => { toggle.innerHTML = icoAsset("pause"); };
      this.audio.onpause = () => { toggle.innerHTML = icoAsset("play"); };
      this.audio.onended = () => { toggle.innerHTML = icoAsset("play"); };
      seek.oninput = () => {
        if (this.audio.duration) this.audio.currentTime = (Number(seek.value) / 1000) * this.audio.duration;
      };
      toggle.onclick = () => {
        if (this.audio.paused) this.audio.play().catch(() => {});
        else this.audio.pause();
      };
      bar.querySelector("#audio-dock-close").onclick = () => this.hide();
      // Pause inline audios while dock plays (single voice at a time, like Telegram).
      this.audio.onplay = () => {
        toggle.innerHTML = icoAsset("pause");
        document.querySelectorAll("audio[data-dock]").forEach((a) => { if (a !== this.audio && !a.paused) { try { a.pause(); } catch (_) {} } });
      };
      return bar;
    },
    play(url, title) {
      this.ensure();
      if (!url) return;
      const abs = mediaUrl(url);
      if (this.audio.src !== abs) this.audio.src = abs;
      this.el.querySelector("#audio-dock-title").textContent = title || "Audio";
      this.el.classList.remove("hidden");
      this.audio.play().catch(() => {});
    },
    hide() {
      if (!this.el) return;
      try { this.audio.pause(); } catch (_) {}
      this.el.classList.add("hidden");
    },
  };

  function bindMedia(root) {
    const scope = root || document;
    // Video -> fullscreen lightbox player.
    scope.querySelectorAll("[data-vzoom]").forEach((v) => {
      if (v._vzoom) return;
      v._vzoom = true;
      v.addEventListener("click", (e) => {
        if (e.target && e.target.controls) return;
        openVideoLightbox(v.getAttribute("data-vzoom") || v.currentSrc || v.src);
      });
    });
    // Image lightbox (also for bubbles rendered by media kit).
    scope.querySelectorAll("[data-zoom]").forEach((n) => {
      if (n._zoom) return;
      n._zoom = true;
      n.addEventListener("click", (e) => {
        e.stopPropagation();
        openImageLightbox(n.getAttribute("data-zoom"));
      });
    });
    // Audio cards: route inline playback into the global dock.
    scope.querySelectorAll("audio[data-dock]").forEach((a) => {
      if (a._dock) return;
      a._dock = true;
      a.addEventListener("play", () => {
        try {
          const title = a.getAttribute("data-title") || "Audio";
          AudioDock.ensure();
          const dock = AudioDock.audio;
          const src = a.currentSrc || a.src;
          if (dock.src !== src) {
            dock.src = src;
            AudioDock.el.querySelector("#audio-dock-title").textContent = title;
          }
          AudioDock.el.classList.remove("hidden");
          if (dock.paused) dock.play().catch(() => {});
          // Keep the inline element paused; dock is the single player.
          a.pause();
        } catch (_) {}
      });
    });
    scope.querySelectorAll("[data-audio]").forEach((b) => {
      if (b._aplay) return;
      b._aplay = true;
      b.addEventListener("click", () => AudioDock.play(b.getAttribute("data-audio"), b.getAttribute("data-title") || "Audio"));
    });
  }

  function openImageLightbox(src) {
    let box = document.getElementById("lightbox");
    if (!box) {
      box = document.createElement("div");
      box.id = "lightbox";
      box.className = "lightbox hidden";
      document.body.appendChild(box);
    }
    box.innerHTML = `<img src="${esc(src)}" alt="">`;
    box.classList.remove("hidden");
    box.onclick = () => box.classList.add("hidden");
  }
  function openVideoLightbox(src) {
    let box = document.getElementById("lightbox");
    if (!box) {
      box = document.createElement("div");
      box.id = "lightbox";
      box.className = "lightbox hidden";
      document.body.appendChild(box);
    }
    box.innerHTML = `<video src="${esc(src)}" controls autoplay playsinline style="max-width:94vw;max-height:92vh;border-radius:16px;background:#000"></video>`;
    box.classList.remove("hidden");
    box.onclick = (e) => { if (e.target === box) { box.classList.add("hidden"); box.innerHTML = ""; } };
  }

  /* ---------- Telegram-style photo editor (auto-opens on pick) ---------- */
  const FILTERS = [
    { id: "none", label: "Normal" },
    { id: "vivid", label: "Vivid" },
    { id: "warm", label: "Warm" },
    { id: "cold", label: "Cold" },
    { id: "mono", label: "Mono" },
    { id: "sepia", label: "Sepia" },
    { id: "fade", label: "Fade" },
  ];
  function filterCSS(f, adj) {
    const b = (adj.brightness ?? 100) / 100;
    const c = (adj.contrast ?? 100) / 100;
    const s = (adj.saturate ?? 100) / 100;
    const base = `brightness(${b}) contrast(${c}) saturate(${s})`;
    switch (f) {
      case "vivid": return `${base} saturate(1.5) contrast(1.12)`;
      case "warm": return `${base} sepia(0.35) saturate(1.3) hue-rotate(-12deg)`;
      case "cold": return `${base} saturate(1.15) hue-rotate(18deg) brightness(1.04)`;
      case "mono": return `${base} grayscale(1) contrast(1.08)`;
      case "sepia": return `${base} sepia(0.85)`;
      case "fade": return `${base} brightness(1.06) contrast(0.88) saturate(0.85)`;
      default: return base;
    }
  }

  function openPhotoEditor(file, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => build(img, url);
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ blob: file, file, edited: false }); };
      img.src = url;

      function build(image, objUrl) {
        const ov = document.createElement("div");
        ov.className = "editor-ov";
        ov.innerHTML = `
          <div class="editor-card">
            <div class="row spread"><b>${esc(opts.title || "Edit photo")}</b><button class="ghost" data-x>${icoAsset("close-circle")}<span>Cancel</span></button></div>
            <div class="editor-stage"><canvas id="ed-cv"></canvas></div>
            <div class="editor-filters">${FILTERS.map((f) => `<button class="chip" data-f="${f.id}">${f.label}</button>`).join("")}</div>
            <div class="editor-sliders">
              <label>Light <input type="range" data-a="brightness" min="50" max="150" value="100"></label>
              <label>Contrast <input type="range" data-a="contrast" min="50" max="150" value="100"></label>
              <label>Color <input type="range" data-a="saturate" min="0" max="200" value="100"></label>
            </div>
            <div class="row editor-tools">
              <button class="ghost" data-rot>${icoAsset("camera-rotate")}<span>90&deg;</span></button>
              <button class="ghost" data-flip>${icoAsset("transfer-horizontal")}<span>Flip</span></button>
              <button class="chip" data-crop="free">Free</button>
              <button class="chip" data-crop="1:1">1:1</button>
              <button class="chip" data-crop="4:3">4:3</button>
              <button class="chip" data-crop="16:9">16:9</button>
            </div>
            <div class="row spread"><button class="ghost" data-reset>${icoAsset("undo-left-round")}<span>Reset</span></button><button data-done>${icoAsset("check-circle")}<span>Done</span></button></div>
          </div>`;
        document.body.appendChild(ov);
        const cv = ov.querySelector("#ed-cv");
        const ctx = cv.getContext("2d");
        const state = { rot: 0, flip: false, filter: "none", crop: "free", adj: { brightness: 100, contrast: 100, saturate: 100 } };

        function draw() {
          const maxW = Math.min(920, ov.querySelector(".editor-stage").clientWidth || 520);
          let iw = image.naturalWidth, ih = image.naturalHeight;
          const rot90 = state.rot % 2 === 1;
          let dw = rot90 ? ih : iw, dh = rot90 ? iw : ih;
          const scale = Math.min(1, maxW / dw);
          cv.width = Math.round(dw * scale);
          cv.height = Math.round(dh * scale);
          ctx.save();
          ctx.clearRect(0, 0, cv.width, cv.height);
          ctx.translate(cv.width / 2, cv.height / 2);
          ctx.rotate((state.rot * Math.PI) / 2);
          ctx.scale(state.flip ? -1 : 1, 1);
          ctx.filter = filterCSS(state.filter, state.adj);
          ctx.drawImage(image, (-iw * scale) / 2, (-ih * scale) / 2, iw * scale, ih * scale);
          ctx.restore();
        }
        const paintChips = () => {
          ov.querySelectorAll("[data-f]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-f") === state.filter));
          ov.querySelectorAll("[data-crop]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-crop") === state.crop));
        };
        ov.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { state.filter = b.getAttribute("data-f"); paintChips(); draw(); }));
        ov.querySelectorAll("[data-crop]").forEach((b) => (b.onclick = () => { state.crop = b.getAttribute("data-crop"); paintChips(); }));
        ov.querySelectorAll("[data-a]").forEach((r) => (r.oninput = () => { state.adj[r.getAttribute("data-a")] = Number(r.value); draw(); }));
        ov.querySelector("[data-rot]").onclick = () => { state.rot = (state.rot + 1) % 4; draw(); };
        ov.querySelector("[data-flip]").onclick = () => { state.flip = !state.flip; draw(); };
        ov.querySelector("[data-reset]").onclick = () => {
          state.rot = 0; state.flip = false; state.filter = "none"; state.crop = "free";
          state.adj = { brightness: 100, contrast: 100, saturate: 100 };
          ov.querySelectorAll("[data-a]").forEach((r) => (r.value = r.getAttribute("data-a") === "saturate" ? "100" : "100"));
          paintChips(); draw();
        };
        const close = (val) => { ov.remove(); URL.revokeObjectURL(objUrl); resolve(val); };
        ov.querySelector("[data-x]").onclick = () => close(null);
        ov.addEventListener("click", (e) => { if (e.target === ov) close(null); });
        ov.querySelector("[data-done]").onclick = () => {
          const pristine = state.rot === 0 && !state.flip && state.filter === "none" && state.crop === "free"
            && state.adj.brightness === 100 && state.adj.contrast === 100 && state.adj.saturate === 100;
          if (pristine) return close({ blob: file, file, edited: false });
          // Export full-resolution with crop + adjustments.
          const out = document.createElement("canvas");
          const octx = out.getContext("2d");
          let sw = image.naturalWidth, sh = image.naturalHeight;
          const rot90 = state.rot % 2 === 1;
          let fw = rot90 ? sh : sw, fh = rot90 ? sw : sh;
          let cw = fw, ch = fh;
          if (state.crop !== "free") {
            const [a, b] = state.crop.split(":").map(Number);
            const target = a / b;
            if (fw / fh > target) cw = Math.round(fh * target);
            else ch = Math.round(fw / target);
          }
          out.width = cw;
          out.height = ch;
          octx.save();
          octx.translate(cw / 2, ch / 2);
          octx.rotate((state.rot * Math.PI) / 2);
          octx.scale(state.flip ? -1 : 1, 1);
          octx.filter = filterCSS(state.filter, state.adj);
          octx.drawImage(image, -sw / 2, -sh / 2, sw, sh);
          octx.restore();
          out.toBlob((blob) => {
            if (!blob) return close({ blob: file, file, edited: false });
            const name = (file.name || "photo.jpg").replace(/\.\w+$/, "") + "-edited.jpg";
            close({ blob, file: new File([blob], name, { type: "image/jpeg" }), edited: true });
          }, "image/jpeg", 0.92);
        };
        paintChips();
        draw();
      }
    });
  }

  async function pickAndEditPhoto(title) {
    const f = await pickPhoto();
    if (!f) return null;
    if (!f.type.startsWith("image/")) return { blob: f, file: f, edited: false, skipped: true };
    return openPhotoEditor(f, { title: title || "Edit photo" });
  }

  /* ---------- smiles & stickers ---------- */
  const ALL_SMILES_CATEGORIES = [
    {
      title: "Smileys & Emotion",
      emojis: [
        "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲",
        "😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","😮‍💨",
        "🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","😵‍💫","🤯","🤠","🥳","🥸","😎",
        "🤓","🧐","😕","🫤","😟","🙁","☹️","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖",
        "😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖",
        "😺","😸","😹","😻","😼","😽","🙀","😿","😾"
      ],
    },
    {
      title: "Gestures & People",
      emojis: [
        "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍",
        "👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦵","🦶","👂","👃","🧠",
        "🫀","🫁","🦷","🦴","👀","👁️","👅","👄","🫦","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍",
        "🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷","💃","🕺","👯","🧘"
      ],
    },
    {
      title: "Hearts & Symbols",
      emojis: [
        "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟","💯",
        "💢","💥","💫","💦","💨","🕳️","💣","💬","💭","💤","✨","⭐","🌟","⚡","🔥","🌈","☀️","🌤️","⛅","🌙","❄️","☄️"
      ],
    },
    {
      title: "Animals & Nature",
      emojis: [
        "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧",
        "🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🦖","🦕","🐙",
        "🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐘","🦒","🦘","🐎","🐑","🦌","🐕","🐈","🦜","🦢",
        "🦩","🕊️","🐇","🦝","🦦","🦥","🐿️","🦔","🌸","🌹","🌺","🌻","🌼","🌷","🌱","🌲","🌳","🌴","🌵","🍀","🍁","🍃"
      ],
    },
    {
      title: "Food & Drink",
      emojis: [
        "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🌶️",
        "🌽","🥕","🧄","🧅","🥔","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟",
        "🍕","🥪","🌮","🌯","🥗","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🍤","🍙","🍚","🍦","🧁","🍰","🎂","🍮","🍭","🍬",
        "🍫","🍿","🍩","🍪","☕","🍵","🧃","🥤","🧋","🍺","🍻","🥂","🍷","🍸","🍹","🍾","🧊"
      ],
    },
    {
      title: "Activities & Objects",
      emojis: [
        "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🎱","🏓","🏸","🏒","🥊","🛹","⛸️","🎯","🎮","🕹️","🎲","🧩","🧸","🪩",
        "🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🎉","🎊","🎈","🎁","🏆","🥇","🥈","🥉","💎","👑",
        "🚀","🛸","💡","🔒","🔑","🔔","📌","📎"
      ],
    },
  ];
  const BUILTIN_EMOJI = ALL_SMILES_CATEGORIES.flatMap((c) => c.emojis);

  function renderTextStickerBlob(text, bgColor) {
    return new Promise((resolve) => {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 512;
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, 512, 512);
      const r = 96;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(40 + r, 40);
      ctx.lineTo(472 - r, 40);
      ctx.quadraticCurveTo(472, 40, 472, 40 + r);
      ctx.lineTo(472, 472 - r);
      ctx.quadraticCurveTo(472, 472, 472 - r, 472);
      ctx.lineTo(40 + r, 472);
      ctx.quadraticCurveTo(40, 472, 40, 472 - r);
      ctx.lineTo(40, 40 + r);
      ctx.quadraticCurveTo(40, 40, 40 + r, 40);
      ctx.closePath();
      ctx.fillStyle = bgColor || "#ff5a5f";
      ctx.fill();
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.restore();

      const clean = String(text || "✨").trim().slice(0, 18);
      const fontSize = clean.length <= 2 ? 210 : clean.length <= 6 ? 120 : 76;
      ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 14;
      ctx.fillText(clean, 256, 264, 400);
      cv.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  const StickerStore = {
    _packs: null,
    _favs: null,
    _ts: 0,
    async load(force) {
      if (this._packs && !force && Date.now() - this._ts < 60000) return this._packs;
      try {
        const token = localStorage.getItem("uxa_access") || "";
        const res = await fetch(apiUrl("/stickers/packs"), { headers: token ? { Authorization: "Bearer " + token } : {} });
        const data = await res.json();
        this._packs = Array.isArray(data) ? data : [];
      } catch (_) {
        this._packs = [];
      }
      this._ts = Date.now();
      return this._packs;
    },
    localFavIds() {
      try {
        const arr = JSON.parse(localStorage.getItem("uxa_sticker_favs") || "[]");
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        return [];
      }
    },
    setLocalFavIds(ids) {
      try {
        localStorage.setItem("uxa_sticker_favs", JSON.stringify([...new Set(ids)]));
      } catch (_) {}
    },
    async loadFavorites(force) {
      const token = localStorage.getItem("uxa_access") || "";
      let serverFavs = [];
      if (token) {
        try {
          const res = await fetch(apiUrl("/stickers/favorites"), { headers: { Authorization: "Bearer " + token } });
          if (res.ok) {
            const d = await res.json();
            serverFavs = (d && d.items) || [];
          }
        } catch (_) {}
      }
      const packs = await this.load(force);
      const byId = new Map();
      for (const p of packs || []) {
        for (const s of p.stickers || []) {
          if (s && s.id) byId.set(s.id, s);
        }
      }
      for (const s of serverFavs) {
        if (s && s.id) byId.set(s.id, s);
      }
      const mergedIds = [...new Set([...serverFavs.map((s) => s.id), ...this.localFavIds()])];
      this.setLocalFavIds(mergedIds);
      return mergedIds.map((id) => byId.get(id) || { id, image_url: "", emoji: "⭐" }).filter((s) => s && s.id);
    },
    async toggleFavorite(stickerId, add) {
      const cur = new Set(this.localFavIds());
      const shouldAdd = add !== undefined ? add : !cur.has(stickerId);
      if (shouldAdd) cur.add(stickerId);
      else cur.delete(stickerId);
      this.setLocalFavIds([...cur]);
      const token = localStorage.getItem("uxa_access") || "";
      if (token) {
        try {
          if (shouldAdd) {
            await fetch(apiUrl("/stickers/favorites"), {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
              body: JSON.stringify({ sticker_id: stickerId }),
            });
          } else {
            await fetch(apiUrl("/stickers/favorites/" + encodeURIComponent(stickerId)), {
              method: "DELETE",
              headers: { Authorization: "Bearer " + token },
            });
          }
        } catch (_) {}
      }
      return shouldAdd;
    },
    async createStickerFromFile(file, opts) {
      opts = opts || {};
      const token = localStorage.getItem("uxa_access") || "";
      const fd = new FormData();
      fd.append("file", file, file.name || "sticker.png");
      if (opts.emoji) fd.append("emoji", opts.emoji);
      if (opts.title) fd.append("title", opts.title);
      const res = await fetch(apiUrl("/stickers/create"), {
        method: "POST",
        headers: token ? { Authorization: "Bearer " + token } : {},
        body: fd,
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_) { data = { detail: text }; }
      if (!res.ok) throw new Error((data && (data.detail || data.error)) || ("HTTP " + res.status));
      if (data && data.id) {
        await this.toggleFavorite(data.id, true);
      }
      await this.load(true);
      return data;
    },
    builtinPack() {
      return { id: "builtin-emoji", name: "emoji", title: "All Smiles", stickers: BUILTIN_EMOJI.map((e, i) => ({ id: "emoji-" + i, pack_id: "builtin-emoji", image_url: "", emoji: e })) };
    },
    async all(force) {
      const packs = await this.load(force);
      const customs = (packs || []).filter((p) => p.id !== "builtin-emoji" && (p.stickers || []).length);
      return [this.builtinPack(), ...customs];
    },
  };

  function openStickerSheet(onPick, initialTab) {
    let ov = document.getElementById("sticker-sheet");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "sticker-sheet";
      ov.className = "sticker-sheet hidden";
      document.body.appendChild(ov);
    }
    let activeTab = initialTab === "stickers" ? "stickers" : "smiles";
    ov.innerHTML = `
      <div class="sticker-card">
        <div class="row spread">
          <div class="tabs" id="smile-sheet-tabs">
            <button type="button" class="chip" data-stab="smiles">😊 Smiles (${BUILTIN_EMOJI.length})</button>
            <button type="button" class="chip" data-stab="stickers">✨ Stickers</button>
          </div>
          <button type="button" class="ghost" data-x>${icoAsset("close-circle")}<span>Close</span></button>
        </div>
        <div id="sticker-panel-body" class="sticker-grid" style="margin-top:8px"><p class="tiny">Loading…</p></div>
      </div>`;
    ov.classList.remove("hidden");
    ov.onclick = (e) => { if (e.target === ov) ov.classList.add("hidden"); };
    ov.querySelector("[data-x]").onclick = () => ov.classList.add("hidden");

    const paintTabButtons = () => {
      ov.querySelectorAll("[data-stab]").forEach((btn) => {
        btn.classList.toggle("on", btn.getAttribute("data-stab") === activeTab);
      });
    };

    const renderSmilesTab = () => {
      const body = ov.querySelector("#sticker-panel-body");
      if (!body) return;
      body.innerHTML = `
        <div class="tiny" style="margin-bottom:6px">All smiles (${BUILTIN_EMOJI.length}) — tap any smile to insert or send.</div>
        ${ALL_SMILES_CATEGORIES.map((cat) => `
          <div class="sticker-pack">
            <div class="tiny" style="font-weight:600;margin:6px 0 4px">${esc(cat.title)}</div>
            <div class="sticker-row">${cat.emojis.map((e) => `<button type="button" class="sticker-emoji" data-emoji="${esc(e)}">${esc(e)}</button>`).join("")}</div>
          </div>
        `).join("")}`;
      body.querySelectorAll("[data-emoji]").forEach((b) => {
        b.onclick = () => {
          ov.classList.add("hidden");
          onPick({ emoji: b.getAttribute("data-emoji") });
        };
      });
    };

    const renderStickersTab = async (force) => {
      const body = ov.querySelector("#sticker-panel-body");
      if (!body) return;
      body.innerHTML = `<p class="tiny">Loading stickers…</p>`;
      const [packs, favs] = await Promise.all([
        StickerStore.load(force),
        StickerStore.loadFavorites(force),
      ]);
      const favIdSet = new Set(favs.map((f) => f.id));
      const customPacks = (packs || []).filter((p) => p.id !== "builtin-emoji");
      const validFavs = favs.filter((s) => s && s.image_url);

      body.innerHTML = `
        <div class="sticker-pack" style="border-bottom:1px solid var(--line, rgba(128,128,128,0.2));padding-bottom:10px;margin-bottom:10px">
          <div class="row spread" style="margin-bottom:6px">
            <b class="tiny">${icoAsset("star-1")} Favorite Stickers (${validFavs.length})</b>
            <span class="tiny">Tap to send</span>
          </div>
          ${validFavs.length ? `<div class="sticker-row">${validFavs.map((s) => `
            <div style="position:relative;display:inline-block">
              <img class="sticker-cell" loading="lazy" src="${esc(mediaUrl(s.image_url))}" data-sid="${esc(s.id)}" data-surl="${esc(s.image_url)}" alt="${esc(s.emoji || "sticker")}" title="Tap to send">
              <button type="button" class="ghost" data-unfav="${esc(s.id)}" title="Remove from favorites" aria-label="Remove from favorites" style="position:absolute;top:-4px;right:-4px;padding:1px 5px;font-size:10px;min-height:auto">${icoAsset("close-circle")}</button>
            </div>
          `).join("")}</div>` : `<p class="tiny">No favorite stickers yet. Create one below or tap the star on any sticker!</p>`}
        </div>

        <div class="sticker-pack" style="border-bottom:1px solid var(--line, rgba(128,128,128,0.2));padding-bottom:10px;margin-bottom:10px">
          <b class="tiny">${icoAsset("add-square")} Create Sticker</b>
          <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
            <input id="st-create-text" placeholder="Text / emoji (e.g. 🔥 GG)" style="flex:1;min-width:130px">
            <input id="st-create-color" type="color" value="#ff5a5f" title="Sticker color" style="width:40px;height:36px;padding:2px">
            <button type="button" id="st-create-text-btn">${icoAsset("sticker-smile-circle")}<span>Create sticker</span></button>
            <button type="button" class="ghost" id="st-create-img-btn">${icoAsset("gallery")}<span>From photo</span></button>
          </div>
          <div class="tiny" id="st-create-status" style="margin-top:4px"></div>
        </div>

        ${customPacks.length ? customPacks.map((p) => `
          <div class="sticker-pack" style="margin-bottom:10px">
            <div class="tiny" style="font-weight:600;margin-bottom:4px">${esc(p.title || p.name)} (${(p.stickers || []).length})</div>
            ${(p.stickers || []).length ? `<div class="sticker-row">${(p.stickers || []).map((s) => `
              <div style="position:relative;display:inline-block">
                <img class="sticker-cell" loading="lazy" src="${esc(mediaUrl(s.image_url))}" data-sid="${esc(s.id)}" data-surl="${esc(s.image_url)}" alt="${esc(s.emoji || "")}">
                <button type="button" class="ghost" data-fav="${esc(s.id)}" title="${favIdSet.has(s.id) ? "In favorites" : "Add to favorites"}" style="position:absolute;top:-4px;right:-4px;padding:1px 5px;font-size:10px;min-height:auto">${favIdSet.has(s.id) ? icoAsset("star-1", "on") : icoAsset("star-1")}</button>
              </div>
            `).join("")}</div>` : `<p class="tiny">Empty pack</p>`}
          </div>
        `).join("") : `<p class="tiny">No custom sticker packs yet — create your first sticker above!</p>`}
      `;

      body.querySelectorAll("[data-sid]").forEach((n) => {
        n.onclick = () => {
          ov.classList.add("hidden");
          onPick({ sticker_id: n.getAttribute("data-sid"), image_url: n.getAttribute("data-surl") || "" });
        };
      });
      body.querySelectorAll("[data-unfav]").forEach((btn) => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          await StickerStore.toggleFavorite(btn.getAttribute("data-unfav"), false);
          renderStickersTab(false);
        };
      });
      body.querySelectorAll("[data-fav]").forEach((btn) => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          await StickerStore.toggleFavorite(btn.getAttribute("data-fav"));
          renderStickersTab(false);
        };
      });
      const txtBtn = body.querySelector("#st-create-text-btn");
      if (txtBtn) {
        txtBtn.onclick = async () => {
          const st = body.querySelector("#st-create-status");
          const val = (body.querySelector("#st-create-text").value || "").trim() || "✨ UX";
          const col = (body.querySelector("#st-create-color").value || "#ff5a5f").trim();
          try {
            if (st) st.textContent = "Creating sticker…";
            const blob = await renderTextStickerBlob(val, col);
            const file = new File([blob], "sticker.png", { type: "image/png" });
            await StickerStore.createStickerFromFile(file, { emoji: val.slice(0, 4) });
            await renderStickersTab(true);
          } catch (err) {
            if (st) st.textContent = err.message || "Could not create sticker";
          }
        };
      }
      const imgBtn = body.querySelector("#st-create-img-btn");
      if (imgBtn) {
        imgBtn.onclick = async () => {
          const st = body.querySelector("#st-create-status");
          try {
            const picked = await pickAndEditPhoto("Create sticker");
            if (!picked || !picked.file) return;
            if (st) st.textContent = "Uploading sticker…";
            await StickerStore.createStickerFromFile(picked.file, { emoji: "✨" });
            await renderStickersTab(true);
          } catch (err) {
            if (st) st.textContent = err.message || "Could not upload sticker";
          }
        };
      }
    };

    const switchTab = (t) => {
      activeTab = t;
      paintTabButtons();
      if (activeTab === "stickers") renderStickersTab(false);
      else renderSmilesTab();
    };

    ov.querySelectorAll("[data-stab]").forEach((btn) => {
      btn.onclick = () => switchTab(btn.getAttribute("data-stab"));
    });
    switchTab(activeTab);
    return ov;
  }

  window.UxaMedia = {
    apiUrl, mediaUrl, chooseFile, pickPhoto, pickVideo, pickAudio, pickMedia,
    uploadFile, uploadEncrypted, kindOf, parseMsgPayload, packMsgPayload, isSingleEmoji,
    postMediaHtml, msgMediaHtml, bindMedia, AudioDock, openPhotoEditor,
    pickAndEditPhoto, StickerStore, openStickerSheet, openImageLightbox, openVideoLightbox,
    ALL_SMILES_CATEGORIES, BUILTIN_EMOJI,
  };
})();
