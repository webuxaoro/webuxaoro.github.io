(() => {
  const REACTS = [
    "👍", "👎", "❤️", "🔥", "🥰", "👏", "😁", "🤔", "🤯", "😱", "🤬", "😢",
    "🎉", "🤩", "🤮", "💩", "🙏", "👌", "🕊️", "🤡", "🥱", "🥴", "😍", "🐳",
    "❤️‍🔥", "🌚", "🌭", "💯", "🤣", "⚡", "🍌", "🏆", "💔", "🤨", "😐", "🍓",
    "🍾", "💋", "🖕", "😈", "😴", "😭", "🤓", "👻", "👨‍💻", "👀", "🎃", "🙈",
    "😇", "😨", "🤝", "✍️", "🤗", "🫡", "🎅", "🎄", "☃️", "💅", "🤪", "🗿",
    "🆒", "💘", "🙉", "🦄", "😘", "💊", "🙊", "😎", "👾", "🤷‍♂️", "🤷", "🤷‍♀️", "😡",
  ];
  const ACCENTS = {
    indigo: "#6366F1", blue: "#3B82F6", violet: "#8B5CF6", teal: "#14B8A6",
    green: "#22C55E", cyan: "#06B6D4", orange: "#F97316", rose: "#F43F5E",
    amber: "#F59E0B", pink: "#EC4899",
  };
  const TABS = ["feed", "explore", "communities", "messages", "friends", "notifications", "profile", "more"];
  const OPEN = ["login", "register", "authsettings"];
  const S = {
    me: null,
    tab: "feed",
    view: "boot",
    params: {},
    token: localStorage.getItem("uxa_access") || "",
    refresh: localStorage.getItem("uxa_refresh") || "",
    ws: null,
    ping: null,
    call: null,
    pc: null,
    localStream: null,
    pendingOffer: null,
    iceBuf: [],
    liveChat: null,
    // Live presence pushed over the socket: user_id -> {online, last_seen}.
    presence: {},
    mediaCache: new Map(),
    typingTimer: null,
    pending2fa: "",
    pendingEmail: (typeof sessionStorage !== "undefined" && sessionStorage.getItem("uxa_pe")) || "",
    pendingEmailAddr: (typeof sessionStorage !== "undefined" && sessionStorage.getItem("uxa_pea")) || "",
    authBusy: false,
    captchaChecked: false,
    captchaLoading: false,
    captchaConfigError: "",
    captchaEnabled: true,
    // Always use the site key advertised by the API. A bundled fallback can
    // render a green widget for a different Turnstile key than the server uses.
    captchaSiteKey: "",
    captchaPass: "",
    turnstileToken: "",
    turnstileWidgetId: null,
    verifyPromise: null,
    preregistration: false,
    oauthProviders: { google: { enabled: false }, github: { enabled: false } },
    oauthError: "",
    badge: { chats_unread: 0, notifications: 0 },
    // Posts the reader revealed for this session (NSFW blur).
    revealed: new Set(),
    // Desktop developer-mode unlock (tap the version text 10 times).
    devTaps: 0,
    devUnlocked: localStorage.getItem("uxa_dev_unlocked") === "1",
    // Chat send state: in-flight guard + last failed send (for idempotent retry).
    msgSending: false,
    msgFail: null,
    _rs: 0,
  };

  let refreshPromise = null;

  const IS_DESKTOP = !!(typeof window !== "undefined" && window.UxaoroDesktop);
  const APP_VERSION_LABEL = (typeof window !== "undefined" && window.UxaoroDesktop && window.UxaoroDesktop.versions && window.UxaoroDesktop.versions.app)
    ? String(window.UxaoroDesktop.versions.app)
    : "0.1.0";

  const $ = (sel) => document.querySelector(sel);
  const ico = (n, c) => (window.Ico && Ico.html) ? Ico.html(n, c) : "";
  const iconAsset = (n, c) => (window.Ico && Ico.asset) ? Ico.asset(n, c) : "";
  /*BRAND-PATH-START*/ const BRAND_PATH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><path fill="currentColor" fill-rule="evenodd" d="M294.2,228.3 368.7,227.5 387.0,233.6 400.1,244.9Z M293.9,231.0 294.2,334.2 378.4,335.0 408.4,364.0Z M594.5,250.2 589.1,257.6 586.9,264.2 586.9,272.9 585.0,275.9 585.7,366.0 588.1,366.0 619.6,335.0 701.9,334.2Z M227.8,349.4 374.5,348.6 435.3,408.9Z M434.8,410.4 497.8,473.4 560.3,411.4Z M293.9,439.9 293.9,481.9 292.0,484.9 293.9,492.7 293.9,540.5 292.2,542.7 293.9,545.4 293.9,558.1 292.0,561.0 293.9,564.9 293.9,601.1 292.0,604.0 293.7,609.1 292.0,611.8 292.0,620.6 293.9,623.5 293.9,665.5 295.9,668.5 295.9,677.2 305.9,709.2 317.6,732.7 331.3,752.2 351.3,774.2 372.8,791.7 388.4,801.5 411.9,813.2 430.2,819.3 453.6,825.2 464.4,825.2 467.3,827.1 522.9,827.1 525.9,825.2 536.6,825.2 560.1,819.3 582.3,811.3 601.8,801.5 635.0,778.1 653.1,760.0Z M627.7,510.0 614.5,521.2 612.3,525.9 612.5,556.9 701.4,647.2Z M495.4,613.0 498.3,612.5 618.9,735.1 762.5,734.6Z M399.7,699.5 425.5,723.4 439.2,731.2 463.4,739.3 470.2,739.3 473.1,741.2 509.3,741.2 524.9,737.3 549.1,727.3 574.5,708.3 607.2,741.0Z"/></svg>'; /*BRAND-PATH-END*/
  // BRAND_PATH holds the UX monogram <svg> markup (fill=currentColor),
  // generated into the marker above by brand/gen.py.
  const brandSvg = (cls) => BRAND_PATH.replace("<svg ", `<svg class="${cls}" `);
  const isDarkNow = () => {
    const theme = localStorage.getItem("uxa_theme") || "system";
    return theme === "dark" || (theme !== "light" && typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  };
  const logoImg = (cls) => `<img class="${cls}" src="${isDarkNow() ? 'dlogo.png' : 'logo.png'}" alt="Uxaoro" style="height:32px;width:auto;" onerror="this.style.display='none'">`;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cssEsc = (s) => (window.CSS && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  const DEFAULT_API = "https://api.fourtexec.site";
  function apiBase() {
    if (typeof window !== "undefined" && window.UXAORO_API) {
      return String(window.UXAORO_API).replace(/\/$/, "");
    }
    const h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0") return "";
    if (h === "api.fourtexec.site") return "";
    return DEFAULT_API;
  }
  function apiUrl(path) {
    if (!path) return apiBase() || "";
    if (/^https?:\/\//i.test(path)) return path;
    const p = path.startsWith("/") ? path : "/" + path;
    const base = apiBase();
    return base ? base + p : p;
  }
  const media = (u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u) || u.startsWith("blob:") || u.startsWith("data:")) return u;
    return apiUrl(u.startsWith("/") ? u : "/" + u);
  };
  const cacheSet = (k, v) => { try { localStorage.setItem("uxa_c_" + k, JSON.stringify(v)); } catch (_) {} };
  const cacheGet = (k, d) => { try { return JSON.parse(localStorage.getItem("uxa_c_" + k)) || d; } catch (_) { return d; } };
  const nameOf = (u) => (u && (u.display_name || u.username)) || "Someone";
  const when = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };
  const isStaff = () => S.me && (S.me.role === "admin" || S.me.role === "moderator" || S.me.role === "owner");
  const isAdmin = () => S.me && (S.me.role === "admin" || S.me.role === "owner");
  // ---- NSFW (AI moderation) ----
  // Content is NSFW when the moderator flagged the post or when its author's
  // account carries the mark. Viewers who keep "show NSFW content" off never
  // receive it from the API; a deep link still arrives flagged, so it is
  // blurred here until the reader asks for it.
  const optInNsfw = () => !!(S.me && (S.me.show_nsfw || S.me.nsfw));
  const nsfwFlagged = (p) => !!(p && (p.nsfw || p.nsfw_author));
  // Authors always see their own posts; everyone else needs the opt-in
  // (or a per-post "show anyway" reveal) before the content unblurs.
  const nsfwHidden = (p) => {
    if (!nsfwFlagged(p)) return false;
    if (optInNsfw() || S.revealed.has(p.id)) return false;
    return !(S.me && p.author && p.author.id === S.me.id);
  };
  const nsfwBadge = (p) => nsfwFlagged(p)
    ? `<span class="nsfw-tag" title="${esc((p && p.nsfw_reason) || "Marked NSFW by the moderator")}">NSFW</span>`
    : "";
  const ls = (k, d) => {
    const v = localStorage.getItem(k);
    return v == null ? d : v;
  };

  window.addEventListener("load", () => {
    try {
      const q = new URLSearchParams(location.search);
      const link = q.get("link") || location.hash.replace("#", "") || "";
      if (link.startsWith("uxaoro://")) handleDeepLink(link);
    } catch (_) {}
  });

  function applyAppearance() {
    const theme = ls("uxa_theme", "system");
    const accent = ls("uxa_accent", "indigo");
    const font = ls("uxa_font", "normal");
    const amoled = ls("uxa_amoled", "0") === "1";
    const compact = ls("uxa_compact", "0") === "1";
    const reduce = ls("uxa_motion", "0") === "1";
    const dark = theme === "dark" || (theme !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.amoled = amoled && dark ? "1" : "0";
    document.documentElement.dataset.compact = compact ? "1" : "0";
    document.documentElement.classList.toggle("reduce-motion", reduce);
    document.documentElement.style.setProperty("--coral", ACCENTS[accent] || ACCENTS.indigo);
    document.documentElement.style.setProperty("--font-scale", font === "small" ? "0.9" : font === "large" ? "1.15" : "1");
    const darkLogo = dark;
    let favicon = document.getElementById("site-favicon") || document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.id = "site-favicon";
      document.head.appendChild(favicon);
    } else {
      favicon.id = "site-favicon";
    }
    favicon.href = "applogo.jpg";
    document.querySelectorAll("img.mark-logo").forEach((img) => {
      img.src = darkLogo ? "dlogo.png" : "logo.png";
    });
  }

  const AUTH_OPEN = [
    "/auth/register", "/auth/register/verify", "/auth/register/resend",
    "/auth/register/email", "/auth/register/change-email",
    "/auth/login", "/auth/login/2fa", "/auth/refresh",
    "/auth/captcha", "/auth/captcha/verify",
    "/auth/status", "/auth/oauth/providers",
    "/auth/google", "/auth/github",
  ];
  const isAuthOpen = (path) => AUTH_OPEN.some((p) => path === p || path.startsWith(p + "?"));

  function setPendingEmail(token, addr) {
    S.pendingEmail = token || "";
    S.pendingEmailAddr = addr || "";
    try {
      if (S.pendingEmail) {
        sessionStorage.setItem("uxa_pe", S.pendingEmail);
        sessionStorage.setItem("uxa_pea", S.pendingEmailAddr);
      } else {
        sessionStorage.removeItem("uxa_pe");
        sessionStorage.removeItem("uxa_pea");
      }
    } catch (_) {}
  }

  // ===== optim-engine:begin =====
  //
  // Local-first mutations.
  //
  // Every user-facing write goes through `localFirst()` below: the local state
  // is changed *before* the request leaves, the UI is repainted at once, and if
  // the server refuses the change it is rolled back and logged. The overlay
  // store is deliberately free of DOM/browser APIs so the engine can be
  // unit-tested in node (backend/tests/test_optim_store.py extracts this block
  // verbatim and drives it).
  function makeOptimStore() {
    const buckets = {};
    let seq = 0;

    function bucket(kind) {
      if (!buckets[kind]) {
        buckets[kind] = { created: [], removed: {}, patched: {}, confirmed: {}, seen: {} };
      }
      return buckets[kind];
    }

    function localId(prefix) {
      seq += 1;
      return (prefix || "local") + ":optim:" + seq;
    }

    function isLocal(id) {
      return typeof id === "string" && id.indexOf(":optim:") > 0;
    }

    /** Queue a row the server has not seen yet; it sorts to the top. */
    function create(kind, item) {
      const b = bucket(kind);
      const lid = item.__localId || localId(kind);
      const row = Object.assign({}, item, { __localId: lid, __pending: true });
      b.created.push(row);
      return function undo() {
        b.created = b.created.filter((it) => it.__localId !== lid);
      };
    }

    /** Hide a server row (a delete the server has not confirmed yet). */
    function remove(kind, id) {
      const b = bucket(kind);
      const row = b.removed[id];
      b.removed[id] = true;
      return function undo() {
        if (row === undefined) delete b.removed[id];
        else b.removed[id] = row;
      };
    }

    /** Overlay field edits (liked, likes_count, joined, ...) on a server row. */
    function patch(kind, id, fields) {
      const b = bucket(kind);
      const previous = b.patched[id];
      b.patched[id] = Object.assign({}, previous || {}, fields);
      return function undo() {
        if (previous === undefined) delete b.patched[id];
        else b.patched[id] = previous;
      };
    }

    /**
     * The server answered with `serverId` for the row created as `localId`.
     * From now on the overlay copy is dropped as soon as a fetched list really
     * contains `serverId`, so the item never flickers and never duplicates.
     */
    function confirm(kind, lid, serverId) {
      const b = bucket(kind);
      const row = b.created.find((it) => it.__localId === lid);
      if (row) {
        row.__pending = false;
        if (serverId) {
          row.id = serverId;
          b.confirmed[lid] = serverId;
        }
      }
    }

    /** Forget every overlay entry for one id (used when the request failed). */
    function reset(kind, id, lid) {
      const b = bucket(kind);
      if (b) {
        b.created = b.created.filter((it) => (lid ? it.__localId !== lid : it.id !== id));
        delete b.removed[id];
        delete b.patched[id];
        if (lid) delete b.confirmed[lid];
      }
    }

    /**
     * Merge the overlay into a list fetched from the server, and let the overlay
     * heal itself:
     *
     * * a created row is dropped once the server list really carries its id;
     * * a deleted row stays hidden until the server list stops sending it;
     * * a patched row stops being patched once the server row matches the patch.
     *
     * That way a refetch that arrives before the write is visible (or fails)
     * never resurrects a deleted row or loses a toggle.
     */
    function merge(kind, list, idOf) {
      const idf = idOf || ((row) => row && row.id);
      const rows = Array.isArray(list) ? list : [];
      const b = buckets[kind];
      if (!b) return rows;
      const ids = {};
      for (const row of rows) ids[idf(row)] = true;
      // A local row whose server id is in this list has been reconciled: show it
      // under the server row (not twice) and retire it from the bucket so a later
      // fetch that happens not to carry it cannot bring the ghost back.
      const extra = [];
      for (const it of b.created) {
        const confirmedId = b.confirmed[it.__localId];
        if (confirmedId && ids[confirmedId]) continue;
        extra.push(it);
      }
      if (extra.length !== b.created.length) {
        b.created = b.created.filter((it) => {
          const confirmedId = b.confirmed[it.__localId];
          const done = confirmedId && ids[confirmedId];
          if (done) delete b.confirmed[it.__localId];
          return !done;
        });
      }
      let out = rows.filter((row) => !b.removed[idf(row)]);
      if (extra.length) out = extra.concat(out);
      // A row the server no longer sends is really gone, so it is no longer
      // worth hiding: drop the flag. While the server still sends it, the flag
      // stays, so a refetch that races the delete cannot resurrect the row.
      for (const id of Object.keys(b.removed)) {
        if (!ids[id]) delete b.removed[id];
      }
      for (const row of rows) {
        const id = idf(row);
        b.seen[id] = row;
        // the server row already says what we asked for: stop overriding it
        const fields = b.patched[id];
        if (fields) {
          let same = true;
          for (const k of Object.keys(fields)) {
            if (row[k] !== fields[k]) { same = false; break; }
          }
          if (same) delete b.patched[id];
        }
      }
      if (Object.keys(b.patched).length) {
        out = out.map((row) => {
          const fields = b.patched[idf(row)];
          return fields ? Object.assign({}, row, fields) : row;
        });
      }
      return out;
    }

    /** Last server copy we saw for a row (with any pending patch on top). */
    function get(kind, id) {
      const b = buckets[kind];
      if (!b) return null;
      let row = b.seen[id];
      if (!row) {
        // A row that only exists locally (still uploading / unconfirmed) is
        // visible to `get()` too, so its buttons work before the server answers.
        row = b.created.find((it) => it.id === id || it.__localId === id) || null;
      }
      if (!row) return null;
      return b.patched[id] ? Object.assign({}, row, b.patched[id]) : row;
    }

    /** True while anything is still unconfirmed (used by the tests). */
    function pending(kind) {
      const b = buckets[kind];
      if (!b) return 0;
      return b.created.filter((it) => it.__pending).length
        + Object.keys(b.removed).length
        + Object.keys(b.patched).length;
    }

    function empty() {
      return Object.keys(buckets).length === 0;
    }

    return {
      create, remove, patch, confirm, reset, merge, localId, isLocal, pending, empty, get,
      buckets,
    };
  }

  /**
   * Local-first mutation driver.
   *
   * `apply` changes local state (overlay / S.me / DOM) and returns the undo
   * function that puts it back. The UI is repainted immediately after `apply`,
   * so the change is visible before the network answers.
   * Returns the server data, or null when the request failed (the rollback and
   * the error log have already happened in that case).
   */
  async function localFirst(label, apply, send, opts = {}) {
    let undo = null;
    try {
      undo = apply ? apply() : null;
    } catch (err) {
      logActionFailure(label + " (local apply)", err);
    }
    const repaint = opts.repaint === false ? null : (opts.repaint || render);
    if (repaint) {
      try { repaint(); } catch (_) {}
    }
    try {
      const data = await send();
      if (opts.settle) {
        try { opts.settle(data); } catch (_) {}
      }
      return data === undefined ? true : data;
    } catch (err) {
      try { if (undo) undo(); } catch (_) {}
      reportActionFailure(label, err);
      if (repaint) {
        try { repaint(); } catch (_) {}
      }
      return null;
    }
  }


  /**
   * A single-field change to the signed-in account (toggles, privacy).
   * The UI flips at once, the server answers behind it, and a failure restores
   * the previous value.
   */
  async function patchMe(label, fields, opts = {}) {
    const before = S.me ? Object.assign({}, S.me) : null;
    return localFirst(label, () => {
      S.me = Object.assign({}, S.me, fields);
      cacheSet("me", S.me);
      return () => { S.me = before; cacheSet("me", before); };
    }, async () => {
      const updated = await api("/users/me", { method: "PATCH", body: fields });
      S.me = updated;
      cacheSet("me", updated);
      return updated;
    }, Object.assign({ repaint: false }, opts));
  }

  /** Console entry + user-visible notice for a rolled-back action. */
  function logActionFailure(label, err) {
    const status = err && (err.status || err.statusCode);
    const detail = (err && err.message) || String(err || "unknown error");
    try {
      console.error(`[uxaoro] ${label} failed${status ? " (HTTP " + status + ")" : ""}: ${detail}`, err);
    } catch (_) {}
  }

  function reportActionFailure(label, err) {
    logActionFailure(label, err);
    const detail = (err && err.message) || "unknown error";
    try { toast(`${label} failed — the change was reverted. (${detail})`, "danger-triangle"); } catch (_) {}
  }

  const Optim = makeOptimStore();
  S.optim = Optim;
  // ===== optim-engine:end =====

  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    const requestToken = S.token;
    if (requestToken && !isAuthOpen(path)) headers.Authorization = "Bearer " + requestToken;
    if (opts.body && !(opts.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
      opts = Object.assign({}, opts, { body: typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body) });
    }
    const res = await fetch(apiUrl(path), Object.assign({}, opts, { headers }));
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { detail: text }; }
    if (res.status === 401 && S.refresh && !isAuthOpen(path)) {
      // Another concurrent request may already have rotated the refresh token.
      // Retry with that newer access token instead of consuming it a second time.
      if (requestToken && S.token !== requestToken) return api(path, opts);
      const ok = await tryRefresh();
      if (ok) return api(path, opts);
      clearSession();
    }
    if (!res.ok) throw new Error((data && (data.detail || data.error)) || ("HTTP " + res.status));
    return data;
  }

  async function tryRefresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const refreshToken = S.refresh;
        if (!refreshToken) return false;
        const response = await fetch(apiUrl("/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!response.ok) return false;
        const pair = await response.json();
        if (!pair.access_token) return false;
        saveSession(pair);
        return true;
      } catch (_) {
        return false;
      }
    })();
    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  function saveSession(pair) {
    if (!pair) return;
    if (pair.access_token) {
      S.token = pair.access_token;
      localStorage.setItem("uxa_access", S.token);
    }
    if (pair.refresh_token) {
      S.refresh = pair.refresh_token;
      localStorage.setItem("uxa_refresh", S.refresh);
    }
    if (pair.user) {
      S.me = pair.user;
      cacheSet("me", S.me);
    }
    if (pair.preregistered) {
      S.preregistration = true;
    }
  }

  // ---------- E2EE key backup (sealed with the account password) ----------
  //
  // The private key never reaches the server in readable form: the client
  // encrypts it with a key derived from the password the user just typed
  // (PBKDF2-HMAC-SHA256, 600k rounds, AES-256-GCM, bound to the account id)
  // and uploads the envelope. Signing in anywhere with the same password is
  // therefore enough to restore the key - no device pairing needed.
  //
  // `pendingKeyPassword` holds the password in memory between "login succeeded"
  // and afterLogin(), and only for that long. It is never persisted.
  let pendingKeyPassword = "";

  async function keyBackupMeta() {
    try {
      return await api("/e2ee/backup?meta=1");
    } catch (_) {
      return null;
    }
  }

  /** Seal the local key with `password` and store it on the server. */
  async function backupKeys(password) {
    const me = S.me;
    if (!me || !me.id) throw new Error("Sign in again to back up your keys");
    const privatePem = CryptoApp.privatePem();
    if (!privatePem) throw new Error("There is no local key to back up yet");
    const envelope = await CryptoApp.sealBackup({
      password,
      userId: me.id,
      privatePem,
      publicPem: CryptoApp.publicPem(),
    });
    await api("/e2ee/backup", { method: "PUT", body: envelope });
    return true;
  }

  /** Download the envelope and install the key it contains on this browser. */
  async function restoreKeys(password) {
    const me = S.me;
    if (!me || !me.id) throw new Error("Sign in again to restore your keys");
    const stored = await api("/e2ee/backup");
    if (!stored || !stored.exists || !stored.ciphertext) throw new Error("This account has no key backup on the server");
    const opened = await CryptoApp.openBackup({ password, userId: me.id, envelope: stored });
    CryptoApp.importKeyPair(opened.private_pem, opened.public_pem);
    return true;
  }

  /**
   * Called from afterLogin() before ensureKeys() runs.
   *
   * Order matters: on a fresh browser we must restore the backup *before* a new
   * keypair is generated, otherwise the account would publish a brand new key
   * and old messages would become unreadable for everyone.
   */
  async function syncKeyBackup() {
    const password = pendingKeyPassword;
    pendingKeyPassword = "";
    if (!password || !S.me || !S.me.id) return;
    try {
      const meta = await keyBackupMeta();
      if (!meta) return;
      if (!CryptoApp.hasKeys()) {
        if (!meta.exists) return;
        await restoreKeys(password);
        toast("Encryption keys restored from your backup", "key");
        return;
      }
      // Already have keys: refresh the envelope only when it is ours. Sealing
      // over somebody else's key would destroy the only copy of it.
      const localFp = await CryptoApp.pubkeyFingerprint(CryptoApp.publicPem());
      if (meta.exists && meta.pubkey_fingerprint && meta.pubkey_fingerprint !== localFp) return;
      await backupKeys(password);
    } catch (_) {
      // A failure here must never block sign-in; the settings screen can retry
      // with a fresh password prompt.
    }
  }

  /** Status line for the settings card. */
  function keyBackupStateHtml(meta) {
    if (!meta) return `<p class="tiny muted">Could not reach the key backup service.</p>`;
    if (!meta.exists) return `<p class="tiny muted">No backup on the server yet. Back it up so a new device can restore your keys.</p>`;
    const when_ = meta.updated_at || meta.created_at || "";
    const stale = meta.pubkey_fingerprint && meta.account_pubkey_fingerprint
      && meta.pubkey_fingerprint !== meta.account_pubkey_fingerprint;
    return `<p class="tiny">Sealed with your password · updated ${esc(relTime(when_))}${
      stale ? ` <b style="color:var(--coral)">· made from a different key than this account publishes now</b>` : ""
    }</p>`;
  }

  /** Password prompt for the settings card (backdrop modal, no window.prompt). */
  function openKeyBackupPrompt(mode) {
    const existing = document.getElementById("uxa-key-backup-modal");
    if (existing) existing.remove();
    const copy = mode === "restore"
      ? { title: "Restore your keys", hint: "Enter the account password this backup was sealed with." }
      : { title: "Encrypt the backup", hint: "Your account password seals the key file. It is used locally and never sent." };
    const box = document.createElement("div");
    box.id = "uxa-key-backup-modal";
    box.className = "uxa-modal-backdrop";
    box.innerHTML = `
      <div class="uxa-menu-card uxa-tip-card">
        <div class="row spread" style="margin-bottom:10px">
          <b>${iconAsset("key")} ${copy.title}</b>
          <button type="button" class="ghost" id="kb-close" aria-label="Close" title="Close" style="padding:4px 8px">${iconAsset("close-circle")}</button>
        </div>
        <p class="tiny">${copy.hint}</p>
        <input id="kb-pass" type="password" autocomplete="current-password" placeholder="Account password">
        <div class="err" id="kb-err"></div>
        <div style="height:10px"></div>
        <button type="button" id="kb-go" style="width:100%">${iconAsset("key")}<span>${mode === "restore" ? "Restore keys" : "Save backup"}</span></button>
      </div>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.querySelector("#kb-close").onclick = close;
    box.onclick = (e) => { if (e.target === box) close(); };
    const field = box.querySelector("#kb-pass");
    field.focus();
    box.querySelector("#kb-go").onclick = async (ev) => {
      const err = box.querySelector("#kb-err");
      const password = field.value;
      err.textContent = "";
      if (password.length < 6) {
        err.textContent = "Enter your account password";
        return;
      }
      ev.target.disabled = true;
      try {
        if (mode === "restore") {
          await restoreKeys(password);
          toast("Keys restored - restarting your session", "key");
          close();
          // The restored key has to become the published one.
          const pem = CryptoApp.publicPem();
          if (pem && S.me && S.me.pubkey !== pem) {
            await api("/users/me/pubkey", { method: "PUT", body: { pubkey: pem } }).catch(() => {});
          }
          render();
        } else {
          await backupKeys(password);
          toast("Key backup saved", "key");
          close();
          if (S.view === "settings") render();
        }
      } catch (e) {
        err.textContent = e.message || "Something went wrong";
        ev.target.disabled = false;
      }
    };
  }

  function clearSession() {
    S.token = ""; S.refresh = ""; S.me = null;
    localStorage.removeItem("uxa_access");
    localStorage.removeItem("uxa_refresh");
    stopWs();
  }

  function go(view, params, tab) {
    S.view = view;
    S.params = params || {};
    if (tab) S.tab = tab;
    else if (TABS.includes(view)) S.tab = view;
    const q = new URLSearchParams(S.params).toString();
    const hash = "#/" + view + (q ? "?" + q : "");
    if (location.hash !== hash) history.pushState(null, "", hash);
    render();
  }

  function parseHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const [viewPart, qs] = raw.split("?");
    const view = viewPart || (S.token && (!S.preregistration || isAdmin()) ? "feed" : "login");
    const params = {};
    new URLSearchParams(qs || "").forEach((v, k) => { params[k] = v; });
    if (params.oauth_payload) {
      const b64 = String(params.oauth_payload).replace(/-/g, "+").replace(/_/g, "/");
      delete params.oauth_payload;
      try {
        const pad = "=".repeat((4 - (b64.length % 4)) % 4);
        const jsonStr = decodeURIComponent(escape(atob(b64 + pad)));
        const parsed = JSON.parse(jsonStr);
        history.replaceState(null, "", "#/" + (view || "login"));
        setTimeout(() => handleOAuthLoginPayload(parsed), 0);
      } catch (_) {}
    }
    S.view = view;
    S.params = params;
    if (TABS.includes(view)) S.tab = view;
  }

  function stopWs() {
    if (S.ping) { clearInterval(S.ping); S.ping = null; }
    if (S.ws) { try { S.ws.close(); } catch (_) {} S.ws = null; }
  }

  function connectWs() {
    if (!S.token) return;
    if (S.ws && (S.ws.readyState === 0 || S.ws.readyState === 1)) return;
    const base = apiBase();
    let proto;
    let host;
    if (base) {
      const u = new URL(base);
      proto = u.protocol === "https:" ? "wss" : "ws";
      host = u.host;
    } else {
      proto = location.protocol === "https:" ? "wss" : "ws";
      host = location.host;
    }
    const ws = new WebSocket(`${proto}://${host}/ws`);
    S.ws = ws;
    ws.onopen = () => {
      // Token goes in the first frame, never the URL (proxy/audit log leak).
      try { ws.send(JSON.stringify({ event: "hello", data: { token: S.token } })); } catch (_) {}
      if (S.ping) clearInterval(S.ping);
      S.ping = setInterval(() => {
        if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify({ event: "ping", data: {} }));
      }, 25000);
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (_) { return; }
      const data = msg.data || {};
      if (msg.event === "auth_error" || msg.event === "auth_required") {
        // Token may have expired mid-session — try to refresh silently;
        // the reconnect (3s after close) will use the new token.
        try { tryRefresh(); } catch (_) {}
        return;
      }
      if (msg.event === "message") {
        if (S.view === "chat" && data && data.chat_id === S.params.id) {
          paintBubble(data);
          return;
        }
        refreshBadge();
        return;
      }
      if (msg.event === "message_deleted" && S.view === "chat") {
        const el = document.querySelector(`[data-mid="${cssEsc(data.id || "")}"]`);
        if (el) el.querySelector(".body").textContent = "Message deleted";
        return;
      }
      if (msg.event === "message_react" && S.view === "chat") {
        const el = document.querySelector(`[data-mid="${cssEsc(data.id || "")}"] .reacts`);
        if (el) el.outerHTML = reactRow(data.id, data.reactions || [], null, true);
        bindReacts($("#thread"));
        return;
      }
      if (msg.event === "typing" && S.view === "chat" && data.chat_id === S.params.id && S.me && data.user_id !== S.me.id) {
        const t = $("#typing");
        if (t) {
          t.classList.remove("hidden");
          clearTimeout(S.typingTimer);
          S.typingTimer = setTimeout(() => t.classList.add("hidden"), 2500);
        }
        return;
      }
      if (msg.event === "presence" && data && data.user_id) {
        S.presence[data.user_id] = { online: !!data.online, last_seen: data.last_seen || null };
        applyPresence(data.user_id);
        return;
      }
      if (msg.event === "call") onCallSignal(data);
      if (msg.event === "ux") onUxEvent(data);
    };
    ws.onclose = () => {
      if (S.ping) { clearInterval(S.ping); S.ping = null; }
      S.ws = null;
      setTimeout(connectWs, 3000);
    };
  }

  function wsSend(event, data) {
    if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify({ event, data }));
  }

  // ---- presence: who is online, and when everyone else was last here ----
  // The server pushes a `presence` event to everyone allowed to know (friends
  // and chat partners, filtered by the user's privacy settings), so these
  // helpers only have to merge it over the profile the API returned.
  function livePresence(u) {
    if (!u || !u.id) return { online: false, lastSeen: null };
    const live = S.presence[u.id];
    if (live) return { online: !!live.online, lastSeen: live.last_seen || null };
    return { online: !!u.online, lastSeen: u.last_seen || null };
  }

  function relTime(iso) {
    if (!iso) return "";
    const then = Date.parse(iso);
    if (!then) return "";
    const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    if (hours < 48) return "yesterday";
    return when(iso);
  }

  function methodLabel(method) {
    return ({
      password: "Password sign-in",
      totp: "Two-factor code",
      email: "Email link",
      register: "New account",
      oauth: "Google / GitHub",
    })[String(method || "").toLowerCase()] || (method || "Sign-in");
  }

  function presenceLine(u) {
    const p = livePresence(u);
    if (p.online) return "online";
    if (p.lastSeen) return "last seen " + relTime(p.lastSeen);
    return "";
  }

  /** Patch every node that shows this user's presence, in place. */
  function applyPresence(userId) {
    if (!userId) return;
    document.querySelectorAll(`[data-presence="${cssEsc(userId)}"]`).forEach((el) => {
      const u = (S.liveChat && (S.liveChat.members || []).find((m) => m.id === userId)) ||
        { id: userId };
      const line = presenceLine(u);
      if (el.getAttribute("data-presence-keep") === "1") {
        // rows that fall back to a label when there is nothing to show
        el.textContent = line || el.getAttribute("data-presence-fallback") || "";
      } else if (line) {
        el.textContent = line;
        el.classList.remove("hidden");
      } else {
        el.textContent = "";
        el.classList.add("hidden");
      }
    });
  }

  async function refreshBadge() {
    try {
      S.badge = await api("/inbox/badge");
      const sync = (selector, count) => {
        document.querySelectorAll(selector).forEach((button) => {
          let badge = button.querySelector(".badge");
          const n = Number(count || 0);
          if (n > 0) {
            if (!badge) {
              badge = document.createElement("span");
              badge.className = "badge";
              button.appendChild(badge);
            }
            badge.textContent = n > 99 ? "99+" : String(n);
          } else if (badge) {
            badge.remove();
          }
        });
      };
      sync("[data-go='messages']", S.badge.chats_unread);
      sync("[data-go='notifications']", S.badge.notifications);
    } catch (_) {}
  }

  function shell(inner, cls) {
    const noteN = S.badge.notifications || 0;
    const chatN = S.badge.chats_unread || 0;
    const tabs = [
      ["feed", "Feed", 0, "house"],
      ["explore", "Explore", 0, "search"],
      ["communities", "Circles", 0, "list"],
      ["messages", "Wire", chatN, "envelope"],
      ["friends", "People", 0, "people"],
      ["notifications", "Alerts", noteN, "bell"],
      ["profile", "You", 0, "user"],
      ["more", "More", 0, "gear"],
    ];
    const mobileTabs = [
      ["feed", "Feed", 0, "house"],
      ["explore", "Explore", 0, "search"],
      ["communities", "Circles", 0, "list"],
      ["messages", "Wire", chatN, "envelope"],
      ["notifications", "Alerts", noteN, "bell"],
      ["profile", "You", 0, "user"],
      ["more", "More", 0, "gear"],
    ];
    const isOn = (id) => S.tab === id || S.view === id;
    const badge = (n) => n ? `<span class="badge">${n > 99 ? "99+" : n}</span>` : "";
    const nav = tabs.map(([id, label, n, ic]) =>
      `<button class="navbtn ${isOn(id) ? "on" : ""}" data-go="${id}" aria-label="${label}">${ico(ic)}<span class="nav-lab">${label}</span>${badge(n)}</button>`
    ).join("");
    const mobile = mobileTabs.map(([id, label, n, ic]) =>
      `<button class="${isOn(id) ? "on" : ""}" data-go="${id}" aria-label="${label}" title="${label}">${ico(ic)}<span>${label}</span>${badge(n)}</button>`
    ).join("");
    return `<div class="shell ${cls || ""}">
      <aside class="rail">
        <div class="mark">${logoImg("mark-logo")}<span class="word">Uxaoro</span><span class="beta-tag">Beta</span></div>
        ${nav}
      </aside>
      <main class="main">${inner}</main>
    </div>
    <nav class="tabs-mobile" aria-label="Main navigation">${mobile}</nav>`;
  }

  function avatar(u, cls) {
    const src = media(u && u.avatar_url);
    if (src) return `<img class="avatar ${cls || ""}" src="${esc(src)}" alt="">`;
    const ch = esc(((u && (u.display_name || u.username)) || "?").slice(0, 1).toUpperCase());
    return `<div class="avatar ${cls || ""}" style="display:grid;place-items:center;font-weight:800">${ch}</div>`;
  }

  function lookPanel() {
    const theme = ls("uxa_theme", "system");
    const accent = ls("uxa_accent", "indigo");
    const font = ls("uxa_font", "normal");
    const amoled = ls("uxa_amoled", "0") === "1";
    const compact = ls("uxa_compact", "0") === "1";
    const reduce = ls("uxa_motion", "0") === "1";
    const smile = ls("uxa_smile", "apple");
    const themes = [["system", "System"], ["light", "Light"], ["dark", "Dark"]];
    const fonts = [["small", "Small"], ["normal", "Default"], ["large", "Large"]];
    const smileStyles = [["apple", "Apple"], ["google", "Google"], ["oneui", "OneUI"]];
    return `
      <p class="sec-label">Theme</p>
      <div class="tabs">${themes.map(([k, l]) => `<button class="chip ${theme === k ? "on" : ""}" data-theme="${k}">${l}</button>`).join("")}</div>
      <p class="sec-label">Accent color</p>
      <div class="row">${Object.entries(ACCENTS).map(([k, c]) =>
        `<div class="swatch ${accent === k ? "on" : ""}" data-accent="${k}" style="background:${c}" title="${k}"></div>`
      ).join("")}</div>
      <p class="sec-label">Text size</p>
      <div class="tabs">${fonts.map(([k, l]) => `<button class="chip ${font === k ? "on" : ""}" data-font="${k}">${l}</button>`).join("")}</div>
      <p class="sec-label">Smiles style</p>
      <div class="tabs">${smileStyles.map(([k, l]) => `<button class="chip ${smile === k ? "on" : ""}" data-smile="${k}">${l}</button>`).join("")}</div>
      <p class="sec-label">Display</p>
      <div class="tabs">
        <button class="chip ${amoled ? "on" : ""}" data-toggle="uxa_amoled">AMOLED ${amoled ? "on" : "off"}</button>
        <button class="chip ${compact ? "on" : ""}" data-toggle="uxa_compact">${compact ? "Compact" : "Comfortable"}</button>
        <button class="chip ${reduce ? "on" : ""}" data-toggle="uxa_motion">Reduce motion: ${reduce ? "on" : "off"}</button>
      </div>
    `;
  }

  function bindLook(el) {
    if (!el) return;
    el.querySelectorAll("[data-theme]").forEach((n) => n.onclick = () => {
      localStorage.setItem("uxa_theme", n.getAttribute("data-theme"));
      applyAppearance();
      render();
    });
    el.querySelectorAll("[data-accent]").forEach((n) => n.onclick = () => {
      localStorage.setItem("uxa_accent", n.getAttribute("data-accent"));
      applyAppearance();
      render();
    });
    el.querySelectorAll("[data-font]").forEach((n) => n.onclick = () => {
      localStorage.setItem("uxa_font", n.getAttribute("data-font"));
      applyAppearance();
      render();
    });
    el.querySelectorAll("[data-smile]").forEach((n) => n.onclick = () => {
      localStorage.setItem("uxa_smile", n.getAttribute("data-smile"));
      applyAppearance();
      render();
    });
    el.querySelectorAll("[data-toggle]").forEach((n) => n.onclick = () => {
      const k = n.getAttribute("data-toggle");
      localStorage.setItem(k, ls(k, "0") === "1" ? "0" : "1");
      applyAppearance();
      render();
    });
  }

  function snapshotFields() {
    const out = {};
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      if (!el.id || el.type === "file") return;
      out[el.id] = {
        value: el.type === "checkbox" ? !!el.checked : el.value,
        start: el.selectionStart,
        end: el.selectionEnd,
        focus: document.activeElement === el,
        checkbox: el.type === "checkbox",
      };
    });
    return out;
  }

  function restoreFields(snap) {
    let focus = null;
    Object.keys(snap || {}).forEach((id) => {
      const s = snap[id];
      const el = document.getElementById(id);
      if (!el) return;
      if (s.checkbox) el.checked = s.value;
      else if (el.value !== s.value) el.value = s.value;
      if (s.focus) focus = { el, s };
    });
    if (focus) {
      focus.el.focus({ preventScroll: true });
      try {
        if (focus.s.start != null) focus.el.setSelectionRange(focus.s.start, focus.s.end);
      } catch (_) {}
    }
  }

  let ACTIVE = 0;
  // Paint #root only if this render is still the latest navigation.
  // A slow async render from a previous section must never overwrite
  // the section the user already switched to (no duplication/mixing).
  function paintRoot(my, html) {
    if (my !== S._rs) return false;
    $("#root").innerHTML = html;
    return true;
  }

  async function render() {
    const my = ++S._rs;
    ACTIVE = my;
    const root = $("#root");
    if (!S.token && !OPEN.includes(S.view)) S.view = "login";
    const drawKey = S.view + ":" + JSON.stringify(S.params);
    const same = S._drawn === drawKey;
    const snap = same ? snapshotFields() : {};
    S._drawn = drawKey;
    // Show the new section instantly so the previous one never lingers
    // on screen while its replacement is still loading.
    if (!same && !OPEN.includes(S.view)) paintRoot(my, shell(`<p class="muted">Loading…</p>`));
    // Community-admin context for postCard (set by viewCommunity only).
    S._commCtx = null;
    try {
      if (S.view === "login") paintRoot(my, authForm(false));
      else if (S.view === "register") paintRoot(my, authForm(true));
      else if (S.view === "authsettings") paintRoot(my, authSettings());
      else if (S.view === "feed") await viewFeed();
      else if (S.view === "explore") await viewExplore();
      else if (S.view === "news") await viewNews();
      else if (S.view === "more") await viewMore();
      else if (S.view === "communities") await viewCommunities();
      else if (S.view === "createcommunity") await viewCreateCommunity();
      else if (S.view === "messages") await viewChats();
      else if (S.view === "friends") await viewFriends();
      else if (S.view === "profile") await viewProfile(S.me && S.me.id);
      else if (S.view === "user") await viewProfile(S.params.id, S.params.u);
      else if (S.view === "community") await viewCommunity(S.params.id, S.params.u);
      else if (S.view === "commanage") await viewCommManage(S.params.id);
      else if (S.view === "join") await viewJoin(S.params.token);
      else if (S.view === "members") await viewMembers(S.params.id);
      else if (S.view === "chat") await viewChat(S.params.id);
      else if (S.view === "chatinfo") await viewChatInfo(S.params.id);
      else if (S.view === "newchat") await viewNewChat();
      else if (S.view === "newgroup") await viewNewGroup();
      else if (S.view === "search") await viewSearch();
      else if (S.view === "notifications") await viewNotes();
      else if (S.view === "settings") await viewSettings();
      else if (S.view === "editprofile") await viewEditProfile();
      else if (S.view === "blocked") await viewBlocked();
      else if (S.view === "admin") await viewAdmin();
      else if (S.view === "wallet") await viewWallet();
      else if (S.view === "post") await viewPost(S.params.id);
      else if (S.view === "compose") await viewCompose();
      else if (S.view === "story") await viewStory(S.params.id);
      else if (S.view === "createstory") await viewCreateStory();
      else if (S.view === "premium") await viewPremium();
      else if (S.view === "developer") await viewDeveloper();
      else if (S.view === "devproject") await viewDevProject(S.params.id);
      else if (S.view === "oauth") await viewOAuth();
      else root.innerHTML = shell("<p>Unknown view</p>");
    } catch (e) {
      if (e && /preregistration/i.test(e.message || "") && !isAdmin()) {
        S.preregistration = true;
        if (!OPEN.includes(S.view)) S.view = "login";
        paintRoot(my, authForm(S.view === "register"));
      } else if (OPEN.includes(S.view)) {
        paintRoot(my, authForm(S.view === "register") + `<p class="err" style="text-align:center">${esc(e.message)}</p>`);
      } else {
        paintRoot(my, shell(`<p class="err">${esc(e.message)}</p>`));
      }
    }
    if (my !== S._rs) return;
    bindNav();
    if (same) restoreFields(snap);
  }

  // Legal documents shown before sign-up (served by uxaoro.fourtexec.site).
  const TOU_URL = "https://uxaoro.fourtexec.site/tou.txt";
  const PP_URL = "https://uxaoro.fourtexec.site/pp.txt";

  /* Open a URL outside the app. Each shell has its own way: Electron's
   * preload bridge, Tauri's opener plugin, the Qt WebChannel bridge. Returns
   * false in a plain browser, so the <a target="_blank"> default applies. */
  function openExternal(url) {
    try {
      const s = String(url || "");
      if (s.toLowerCase().startsWith("uxaoro://")) { handleDeepLink(s); return true; }
    } catch (_) {}
    const u = String(url || "");
    if (!/^https?:\/\//.test(u)) return false;
    try {
      const d = window.UxaoroDesktop;
      if (d && typeof d.openExternal === "function") { d.openExternal(u); return true; }
    } catch (_) {}
    try {
      const inv = window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke;
      if (typeof inv === "function") {
        Promise.resolve(inv("plugin:opener|open_url", { url: u })).catch(() => {
          try { window.open(u, "_blank", "noopener"); } catch (_) {}
        });
        return true;
      }
    } catch (_) {}
    try {
      const q = window.UxaoroQt;
      if (q && typeof q.openUrl === "function") { q.openUrl(u); return true; }
    } catch (_) {}
    return false;
  }

  function legalConsent(buttonLabel) {
    return `<p class="tiny legal-consent">By clicking “${esc(buttonLabel)}”, you accept the
      <a href="${TOU_URL}" target="_blank" rel="noopener noreferrer" data-ext>Terms of Use</a> and
      <a href="${PP_URL}" target="_blank" rel="noopener noreferrer" data-ext>Privacy Policy</a>.</p>`;
  }

  /* Build a QR-code image URL for a text payload (used for the authenticator
     otpauth:// provisioning URI). Rendered by an external image service. */
  function qrImageUrl(text, size) {
    const px = Math.max(96, Math.min(512, Number(size) || 200));
    return "https://api.qrserver.com/v1/create-qr-code/?size=" + px + "x" + px +
      "&margin=8&data=" + encodeURIComponent(String(text || ""));
  }

  /* ---- Desktop developer mode (tap the version text 10 times) ---- */

  function devVersionHtml() {
    const tappable = IS_DESKTOP && !S.devUnlocked;
    return `
      <div class="card" id="dev-version-card" style="cursor:${tappable ? "pointer" : "default"};user-select:none">
        <div class="row spread">
          <div>
            <b>About Uxaoro</b>
            <div class="tiny">${IS_DESKTOP ? "Desktop" : "Web"} · v${esc(APP_VERSION_LABEL)}${S.devUnlocked ? " · <span style='color:#22C55E'>developer mode on</span>" : ""}</div>
          </div>
          <span class="tiny muted">${S.devUnlocked ? "" : ""}</span>
        </div>
      </div>`;
  }

  function devSettingsHtml() {
    if (!IS_DESKTOP || !S.devUnlocked) return "";
    const cur = apiBase();
    return `
      <p class="sec-label">Developer</p>
      <div class="card">
        <b>API server host</b>
        <p class="tiny">Point the app at a different backend. Applies after save &amp; restart.</p>
        <input id="dev-api-host" value="${esc(cur)}" placeholder="https://api.example.com" autocomplete="off" spellcheck="false">
        <div style="height:8px"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button id="dev-save-host">${iconAsset("refresh")}<span>Save &amp; restart</span></button>
          <button type="button" class="ghost" id="dev-reset-host">${iconAsset("undo-left-round")}<span>Use default</span></button>
        </div>
        <div class="err" id="dev-host-err"></div>
        <div style="height:12px;border-top:1px solid var(--line);margin-top:12px;padding-top:12px"></div>
        <b>Tools</b>
        <div style="height:8px"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button type="button" class="ghost" id="dev-reload">${iconAsset("refresh")}<span>Reload app</span></button>
          <button type="button" class="ghost" id="dev-clear-cache">${iconAsset("trash-bin-minimalistic")}<span>Clear local cache</span></button>
          <button type="button" class="ghost" id="dev-lock">${iconAsset("lock-keyhole")}<span>Hide developer mode</span></button>
        </div>
        <div class="tiny muted" style="margin-top:8px">Electron ${esc((window.UxaoroDesktop && window.UxaoroDesktop.versions && window.UxaoroDesktop.versions.electron) || "")} · Chromium ${esc((window.UxaoroDesktop && window.UxaoroDesktop.versions && window.UxaoroDesktop.versions.chrome) || "")}</div>
      </div>`;
  }

  function handleVersionTap() {
    if (!IS_DESKTOP || S.devUnlocked) return;
    S.devTaps += 1;
    const left = 10 - S.devTaps;
    if (S.devTaps >= 10) {
      S.devUnlocked = true;
      localStorage.setItem("uxa_dev_unlocked", "1");
      S.devTaps = 0;
      render();
      try { toast("Developer mode enabled", "settings-minimalistic"); } catch (_) {}
    } else if (left <= 3) {
      const card = document.getElementById("dev-version-card");
      if (card) {
        let hint = card.querySelector(".dev-tap-hint");
        if (!hint) {
          hint = document.createElement("div");
          hint.className = "tiny dev-tap-hint";
          hint.style.color = "var(--muted)";
          card.appendChild(hint);
        }
        hint.textContent = left > 0 ? (left + " tap" + (left === 1 ? "" : "s") + " to developer mode") : "";
      }
    }
  }

  function bindDevPanel() {
    const vcard = document.getElementById("dev-version-card");
    if (vcard) vcard.onclick = handleVersionTap;
    const saveHost = document.getElementById("dev-save-host");
    if (saveHost) saveHost.onclick = async (e) => {
      e.preventDefault();
      const val = (($("#dev-api-host") && $("#dev-api-host").value) || "").trim().replace(/\/$/, "");
      const errEl = $("#dev-host-err");
      if (!/^https?:\/\/.+\..+/.test(val)) {
        if (errEl) errEl.textContent = "Enter a full http(s):// host";
        return;
      }
      try {
        if (window.UxaoroDesktop && typeof window.UxaoroDesktop.setApiHost === "function") {
          await window.UxaoroDesktop.setApiHost(val);
        }
        try { window.UXAORO_API = val; } catch (_) {}
        if (errEl) errEl.textContent = "";
        setTimeout(() => { try { location.reload(); } catch (_) {} }, 250);
      } catch (err) {
        if (errEl) errEl.textContent = (err && err.message) || "Could not save host";
      }
    };
    const resetHost = document.getElementById("dev-reset-host");
    if (resetHost) resetHost.onclick = async (e) => {
      e.preventDefault();
      try {
        if (window.UxaoroDesktop && typeof window.UxaoroDesktop.setApiHost === "function") {
          await window.UxaoroDesktop.setApiHost("");
        }
        setTimeout(() => { try { location.reload(); } catch (_) {} }, 250);
      } catch (_) {}
    };
    const reloadBtn = document.getElementById("dev-reload");
    if (reloadBtn) reloadBtn.onclick = (e) => { e.preventDefault(); try { location.reload(); } catch (_) {} };
    const clearBtn = document.getElementById("dev-clear-cache");
    if (clearBtn) clearBtn.onclick = (e) => {
      e.preventDefault();
      if (!confirm("Clear local cache? You may need to sign in again.")) return;
      try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
      try { location.reload(); } catch (_) {}
    };
    const lockBtn = document.getElementById("dev-lock");
    if (lockBtn) lockBtn.onclick = (e) => {
      e.preventDefault();
      S.devUnlocked = false;
      S.devTaps = 0;
      localStorage.setItem("uxa_dev_unlocked", "0");
      render();
    };
  }

  async function loadCaptchaConfig() {
    if (S.captchaChecked || S.captchaLoading) return;
    S.captchaChecked = true;
    S.captchaLoading = true;
    S.captchaConfigError = "";
    try {
      // The API is authoritative for both whether CAPTCHA is enabled and which
      // site key to render. Never fall back to a bundled key: that can produce
      // a green widget whose token the server's secret cannot verify.
      const res = await fetch(apiUrl("/auth/captcha?format=json"), {
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch (_) {}
      if (!res.ok) {
        throw new Error((parsed && (parsed.detail || parsed.error)) || ("HTTP " + res.status));
      }
      if (!parsed || typeof parsed !== "object" || typeof parsed.enabled !== "boolean") {
        throw new Error("The API returned invalid CAPTCHA configuration.");
      }
      S.captchaEnabled = parsed.enabled;
      S.captchaSiteKey = S.captchaEnabled && typeof parsed.site_key === "string"
        ? parsed.site_key.trim()
        : "";
      if (S.captchaEnabled && !S.captchaSiteKey) {
        throw new Error("The API has CAPTCHA enabled but did not provide a site key.");
      }
    } catch (error) {
      // Fail closed. Do not render a stale site key while config/CORS/API
      // loading is broken; tell the user what to check and allow a retry.
      S.captchaEnabled = true;
      S.captchaSiteKey = "";
      if (error instanceof TypeError) {
        S.captchaConfigError =
          "Cannot reach the Uxaoro CAPTCHA configuration API at " +
          (apiBase() || location.origin) +
          ". Check the connection, API HTTPS, and CORS settings, then retry.";
      } else {
        S.captchaConfigError = "Could not load CAPTCHA configuration: " +
          ((error && error.message) || "unknown error");
      }
    } finally {
      S.captchaLoading = false;
      if (OPEN.includes(S.view)) render();
    }
  }

  async function fetchServerCaptchaPass(tok) {
    const raw = String(tok || S.rawTurnstileToken || "").trim();
    if (!raw) throw new Error("Complete the security check above, then try again.");
    let res;
    try {
      res = await api("/auth/captcha/verify", {
        method: "POST",
        body: { token: raw },
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          "Cannot reach the Uxaoro CAPTCHA verification API at " +
          (apiBase() || location.origin) +
          ". Cloudflare's widget success does not confirm server verification. " +
          "Check your connection; if this persists, the administrator should check API HTTPS, CORS, and proxy/firewall settings."
        );
      }
      throw error;
    }
    const pass = String((res && res.captcha_pass) || "").trim();
    if (!pass) throw new Error("The server did not issue a CAPTCHA pass. Please complete the check again.");
    return pass;
  }

  function resetCaptchaWidget(message) {
    S.captchaPass = "";
    S.captchaSolved = false;
    S.verifiedTurnstileToken = "";
    S.rawTurnstileToken = "";
    S.turnstileToken = "";
    if (window.turnstile && S.turnstileWidgetId != null) {
      try { window.turnstile.reset(S.turnstileWidgetId); } catch (_) {}
    }
    const status = document.getElementById("captcha-status");
    if (status) {
      status.style.color = "var(--coral)";
      status.textContent = message || "Complete the security check above.";
    }
  }

  async function verifyTurnstileToken(token) {
    const tok = String(token || "").trim();
    if (!tok) return "";
    S.rawTurnstileToken = tok;
    if (S.verifiedTurnstileToken === tok && S.captchaPass) return S.captchaPass;
    if (S.verifyingTurnstileToken === tok && S.verifyPromise) return S.verifyPromise;
    S.turnstileToken = tok;
    S.verifyingTurnstileToken = tok;
    const st = $("#captcha-status");
    if (st) { st.style.color = "var(--muted)"; st.textContent = "Verifying security check…"; }
    const err = $("#f-err");
    if (err && /captcha/i.test(err.textContent || "")) err.textContent = "";
    const p = (async () => {
      try {
        const pass = await fetchServerCaptchaPass(tok);
        S.captchaPass = pass;
        S.captchaSolved = true;
        S.verifiedTurnstileToken = tok;
        S.turnstileToken = "";
        const stNow = $("#captcha-status");
        if (stNow) { stNow.style.color = "#22C55E"; stNow.textContent = "✓ Security check verified"; }
        return S.captchaPass;
      } catch (error) {
        resetCaptchaWidget((error && error.message) || "CAPTCHA verification failed. Please try again.");
        throw error;
      } finally {
        if (S.verifyingTurnstileToken === tok) S.verifyingTurnstileToken = "";
        if (S.verifyPromise === p) S.verifyPromise = null;
      }
    })();
    S.verifyPromise = p;
    return p;
  }

  let captchaPollTimer = null;

  function saveAuthFormSnapshot() {
    S.savedAuthFields = {};
    for (const id of ["f-login", "f-user", "f-email", "f-pass", "f-dob"]) {
      const el = document.getElementById(id);
      if (el && typeof el.value === "string") S.savedAuthFields[id] = el.value;
    }
  }

  function restoreAuthFormSnapshot() {
    if (!S.savedAuthFields) return;
    for (const [id, val] of Object.entries(S.savedAuthFields)) {
      const el = document.getElementById(id);
      if (el && !el.value && val) el.value = val;
    }
  }

  function receiveCaptchaPass(pass, state) {
    const cleanPass = String(pass || "").trim();
    if (!cleanPass) return;
    if (state && S.captchaState && state !== S.captchaState) return;
    if (captchaPollTimer) {
      clearInterval(captchaPollTimer);
      captchaPollTimer = null;
    }
    S.captchaPass = cleanPass;
    S.captchaSolved = true;
    S.awaitingBrowserCaptcha = false;
    S.captchaState = "";
    const shouldAutoSubmit = !!S.captchaAutoSubmit;
    S.captchaAutoSubmit = false;
    if (OPEN.includes(S.view)) {
      render();
      restoreAuthFormSnapshot();
      const err = $("#f-err");
      if (err) err.textContent = "";
      if (shouldAutoSubmit) {
        setTimeout(() => { submitAuth(); }, 50);
      }
    }
  }

  window.UxaoroReceiveCaptcha = receiveCaptchaPass;

  window.addEventListener("uxaoro-captcha-callback", (e) => {
    const d = (e && e.detail) || {};
    if (d.captcha_pass) receiveCaptchaPass(d.captcha_pass, d.state || "");
  });

  window.addEventListener("message", (e) => {
    if (e.origin !== window.location.origin) return;
    const d = e && e.data;
    if (d && typeof d === "object" && d.type === "uxaoro-captcha-pass") {
      if (d.disabled) {
        S.captchaEnabled = false;
        S.awaitingBrowserCaptcha = false;
        if (OPEN.includes(S.view)) render();
      } else if (d.captcha_pass) {
        receiveCaptchaPass(d.captcha_pass, d.state || "");
      }
    }
  });

  // Note: CAPTCHA is always solved with the inline Turnstile widget
  // (captchaBlockHtml / mountTurnstileWidget). There is intentionally no
  // "open CAPTCHA in browser" fallback, so no extra tabs or windows open.

  let turnstilePollTimer = null;

  function mountTurnstileWidget() {
    restoreAuthFormSnapshot();
    if (!S.captchaEnabled || S.captchaPass) return;
    const box = document.getElementById("cf-turnstile-box");
    if (!box) return;
    if (!S.captchaSiteKey) {
      const status = document.getElementById("captcha-status");
      if (status) {
        status.style.color = S.captchaConfigError ? "var(--coral)" : "var(--muted)";
        status.textContent = S.captchaConfigError || "Loading CAPTCHA configuration…";
      }
      return;
    }
    // The DOM is rebuilt on every render(), so drop any stale widget handle
    // and render a fresh inline widget into the new container.
    if (S.turnstileWidgetId != null && window.turnstile) {
      try { window.turnstile.remove(S.turnstileWidgetId); } catch (_) {}
      S.turnstileWidgetId = null;
    }
    const sitekey = S.captchaSiteKey;
    const dark = isDarkNow();
    let attempts = 40;
    const tryRender = () => {
      const target = document.getElementById("cf-turnstile-box");
      if (!target) return;
      if (S.captchaPass) return;
      if (window.turnstile && typeof window.turnstile.render === "function") {
        try {
          S.turnstileWidgetId = window.turnstile.render(target, {
            sitekey,
            theme: dark ? "dark" : "light",
            callback: (token) => {
              S.rawTurnstileToken = String(token || "");
              verifyTurnstileToken(token).catch(() => {});
            },
            "expired-callback": () => {
              S.captchaPass = "";
              S.captchaSolved = false;
              S.verifiedTurnstileToken = "";
              S.rawTurnstileToken = "";
              S.turnstileToken = "";
              const st = document.getElementById("captcha-status");
              if (st) { st.style.color = "var(--muted)"; st.textContent = "Security check expired — complete it again."; }
            },
            "error-callback": () => {
              const st = document.getElementById("captcha-status");
              if (st) { st.style.color = "var(--coral)"; st.textContent = "Security check failed to load. Check your connection and try again."; }
            },
          });
        } catch (_) {}
      } else if (attempts-- > 0) {
        setTimeout(tryRender, 250);
      } else {
        const st = document.getElementById("captcha-status");
        if (st) { st.style.color = "var(--coral)"; st.textContent = "Security check is unavailable right now. Check your connection and try again."; }
      }
    };
    tryRender();
  }

  function captchaBlockHtml() {
    if (!S.captchaEnabled) return "";
    if (S.captchaPass) {
      return `
        <div style="margin:10px 0;padding:10px 12px;border-radius:14px;background:var(--glass);display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span class="tiny" id="captcha-status" style="color:#22C55E;font-weight:700">✓ Security check verified</span>
          <button type="button" class="ghost" id="f-captcha-reset" style="padding:4px 10px;font-size:11px">${iconAsset("refresh")}<span>Reset</span></button>
        </div>
      `;
    }
    const captchaStatus = S.captchaConfigError || (!S.captchaSiteKey
      ? "Loading CAPTCHA configuration…"
      : (S.captchaSolved ? "✓ Security check verified" : "Complete the security check above."));
    return `
      <div style="margin:10px 0;padding:12px;border-radius:14px;background:var(--glass)">
        <div class="tiny" style="font-weight:700;color:var(--ink);margin-bottom:8px">Security check</div>
        <div id="cf-turnstile-box" class="cf-turnstile" style="min-height:65px;display:flex;justify-content:center"></div>
        <div class="tiny" id="captcha-status" style="margin-top:6px;min-height:1.1em;color:${S.captchaConfigError ? "var(--coral)" : "var(--muted)"}">
          ${esc(captchaStatus)}
        </div>
        ${S.captchaConfigError ? `<button type="button" class="ghost" id="f-captcha-config-retry" style="margin-top:8px;padding:5px 11px;font-size:12px">Retry CAPTCHA setup</button>` : ""}
      </div>
    `;
  }

  function authWrap(inner) {
    return `<div class="auth-only">
      <div class="auth-head">
        <div class="mark">${logoImg("mark-logo")}<span class="word">Uxaoro</span><span class="beta-tag">Beta</span></div>
        <button type="button" class="ghost" data-go="authsettings">${ico("gear")}<span>Settings</span></button>
      </div>
      ${S.preregistration && !isAdmin() ? `<div class="tiny" style="margin:0 auto 12px;max-width:520px;padding:10px 12px;border-radius:10px;background:var(--glass);color:var(--ink);text-align:center">
        ✦ <strong>Beta Preregistration Mode</strong> — ${S.token && S.me ? "Your account is reserved for launch." : "Sign in or create your account below to reserve your username."}
        <div data-beta-countdown></div>
      </div>` : ""}
      ${inner}
    </div>`;
  }

  const GOOGLE_SVG = `<svg width="18" height="18" viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" aria-hidden="true"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>`;
  const GITHUB_SVG = `<svg width="18" height="18" viewBox="0 -3.5 256 256" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" aria-hidden="true"><g fill="currentColor"><path d="M127.505 0C57.095 0 0 57.085 0 127.505c0 56.336 36.534 104.13 87.196 120.99 6.372 1.18 8.712-2.766 8.712-6.134 0-3.04-.119-13.085-.173-23.739-35.473 7.713-42.958-15.044-42.958-15.044-5.8-14.738-14.157-18.656-14.157-18.656-11.568-7.914.872-7.752.872-7.752 12.804.9 19.546 13.14 19.546 13.14 11.372 19.493 29.828 13.857 37.104 10.6 1.144-8.242 4.449-13.866 8.095-17.05-28.32-3.225-58.092-14.158-58.092-63.014 0-13.92 4.981-25.295 13.138-34.224-1.324-3.212-5.688-16.18 1.235-33.743 0 0 10.707-3.427 35.073 13.07 10.17-2.826 21.078-4.242 31.914-4.29 10.836.048 21.752 1.464 31.942 4.29 24.337-16.497 35.029-13.07 35.029-13.07 6.94 17.563 2.574 30.531 1.25 33.743 8.175 8.929 13.122 20.303 13.122 34.224 0 48.972-29.828 59.756-58.22 62.912 4.573 3.957 8.648 11.717 8.648 23.612 0 17.06-.148 30.791-.148 34.991 0 3.393 2.295 7.369 8.759 6.117 50.634-16.879 87.122-64.656 87.122-120.973C255.009 57.085 197.922 0 127.505 0"/><path d="M47.755 181.634c-.28.633-1.278.823-2.185.389-.925-.416-1.445-1.28-1.145-1.916.275-.652 1.273-.834 2.196-.396.927.415 1.455 1.287 1.134 1.923M54.027 187.23c-.608.564-1.797.302-2.604-.589-.834-.889-.99-2.077-.373-2.65.627-.563 1.78-.3 2.616.59.834.899.996 2.08.36 2.65M58.33 194.39c-.782.543-2.06.034-2.849-1.1-.781-1.133-.781-2.493.017-3.038.792-.545 2.05-.055 2.85 1.07.78 1.153.78 2.513-.019 3.069M65.606 202.683c-.699.77-2.187.564-3.277-.488-1.114-1.028-1.425-2.487-.724-3.258.707-.772 2.204-.555 3.302.488 1.107 1.026 1.445 2.496.7 3.258M75.01 205.483c-.307.998-1.741 1.452-3.185 1.028-1.442-.437-2.386-1.607-2.095-2.616.3-1.005 1.74-1.478 3.195-1.024 1.44.435 2.386 1.596 2.086 2.612M85.714 206.67c.036 1.052-1.189 1.924-2.705 1.943-1.525.033-2.758-.818-2.774-1.852 0-1.062 1.197-1.926 2.721-1.951 1.516-.03 2.758.815 2.758 1.86M96.228 206.267c.182 1.026-.872 2.08-2.377 2.36-1.48.27-2.85-.363-3.039-1.38-.184-1.052.89-2.105 2.367-2.378 1.508-.262 2.857.355 3.049 1.398"/></g></svg>`;

  let _oauthLoaded = false;
  async function loadOAuthStatus() {
    if (_oauthLoaded) return;
    _oauthLoaded = true;
    try {
      const st = await api("/auth/status");
      if (st) {
        S.preregistration = !!(st.preregistration || st.registration_mode === "preregistration");
        localStorage.setItem("uxa_reg_mode", st.registration_mode || "open");
        if (st.oauth) S.oauthProviders = st.oauth;
      }
    } catch (_) {}
  }

  async function handleOAuthLoginPayload(payload) {
    if (!payload || typeof payload !== "object") return;
    if (payload.error) {
      S.oauthError = String(payload.error);
      const errNow = $("#f-err") || $("#oauth-link-err");
      if (errNow) errNow.textContent = S.oauthError;
      else alert(S.oauthError);
      return;
    }
    if (payload.access_token || payload.user) {
      S.oauthError = "";
      const wasSettings = S.view === "settings";
      saveSession(payload);
      if (payload.oauth_linked || wasSettings) {
        try { S.me = await api("/auth/me"); cacheSet("me", S.me); } catch (_) {}
        render();
        return;
      }
      await afterLogin();
      if (S.preregistration && !isAdmin()) {
        S.view = "login";
        render();
      } else {
        go("feed", {}, "feed");
      }
    }
  }

  let oauthPopup = null;
  let oauthCallbackOrigin = "";
  window.addEventListener("message", (ev) => {
    if (!oauthPopup || ev.source !== oauthPopup || ev.origin !== oauthCallbackOrigin) return;
    const d = ev && ev.data;
    if (d && typeof d === "object" && d.type === "uxaoro-oauth-login" && d.payload) {
      oauthPopup = null;
      handleOAuthLoginPayload(d.payload);
    }
  });

  async function startSocialOAuth(provider, linkMode = false) {
    const errEl = $("#f-err") || $("#oauth-link-err");
    if (errEl) errEl.textContent = "";
    try {
      if (linkMode && !S.token) throw new Error("Sign in before linking an account");
      const returnUrl = IS_DESKTOP ? "uxaoro://oauth" : location.origin + location.pathname;
      const linkQs = linkMode ? "&mode=link" : "";
      const opts = linkMode ? { headers: { Authorization: "Bearer " + S.token } } : {};
      const info = await api(`/auth/${provider}?format=json&redirect_to=${encodeURIComponent(returnUrl)}${linkQs}`, opts);
      if (!info || !info.url) throw new Error(`Could not start ${provider} sign-in`);
      try { oauthCallbackOrigin = new URL(info.redirect_uri, location.href).origin; }
      catch (_) { oauthCallbackOrigin = ""; }
      const w = 520, h = 640;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2));
      const pop = window.open(info.url, `uxaoro_${provider}_oauth`, `width=${w},height=${h},left=${left},top=${top}`);
      if (!pop) {
        oauthPopup = null;
        window.location.href = info.url;
      } else {
        oauthPopup = pop;
      }
    } catch (e) {
      const msg = (e && e.message) || `${provider} login failed`;
      if (errEl) errEl.textContent = msg;
      else alert(msg);
    }
  }

  async function unlinkSocialOAuth(provider) {
    const errEl = $("#oauth-link-err") || $("#f-err");
    if (errEl) errEl.textContent = "";
    try {
      const res = await localFirst("Unlink account", () => null,
        () => api("/auth/oauth/unlink", { method: "POST", body: { provider } }), { repaint: false });
      if (res && res.user) {
        S.me = res.user;
        cacheSet("me", S.me);
      } else {
        S.me = await api("/auth/me");
        cacheSet("me", S.me);
      }
      render();
    } catch (e) {
      const msg = (e && e.message) || `Could not unlink ${provider}`;
      if (errEl) errEl.textContent = msg;
      else alert(msg);
    }
  }

  function socialOAuthButtonsHtml() {
    return `
      <div style="display:flex;align-items:center;gap:10px;margin:14px 0 10px">
        <div style="flex:1;height:1px;background:var(--line)"></div>
        <span class="tiny" style="opacity:0.75">or continue with</span>
        <div style="flex:1;height:1px;background:var(--line)"></div>
      </div>
      <div class="row" style="gap:8px">
        <button type="button" class="ghost" id="btn-oauth-google" style="flex:1;padding:9px 12px;font-size:13px">
          ${GOOGLE_SVG}<span>Google</span>
        </button>
        <button type="button" class="ghost" id="btn-oauth-github" style="flex:1;padding:9px 12px;font-size:13px">
          ${GITHUB_SVG}<span>GitHub</span>
        </button>
      </div>
    `;
  }

  function authForm(reg) {
    if (S.pendingEmail) {
      if (S.changingEmail) {
        return authWrap(`<form class="card auth-card" onsubmit="return false">
          <h1>Change email</h1>
          <p class="muted">Enter a new email address to send your 6-digit verification code to without re-registering.</p>
          <input id="f-new-email" placeholder="new email" type="email" value="${esc(S.pendingEmailAddr || "")}" autocomplete="email" required>
          <div class="err" id="f-err"></div>
          <div style="height:12px"></div>
          <button id="f-go">${iconAsset("send-square")}<span>Update email &amp; send code</span></button>
          <p class="tiny"><a id="f-cancel-email" href="#">Cancel</a></p>
        </form>`);
      }
      return authWrap(`<form class="card auth-card" onsubmit="return false">
        <h1>Check your email</h1>
        <p class="muted">We sent a 6-digit code to ${esc(S.pendingEmailAddr || "your email")}.</p>
        <input id="f-email-code" placeholder="6-digit code" inputmode="numeric" autocomplete="one-time-code">
        <div class="err" id="f-err"></div>
        <div style="height:12px"></div>
        <button id="f-go">${iconAsset("check-read")}<span>Verify email</span></button>
        <p class="tiny"><a id="f-resend" href="#">Resend code</a> · <a id="f-back-reg" href="#">Change email</a></p>
      </form>`);
    }
    if (S.pending2fa && !reg) {
      return authWrap(`<form class="card auth-card" onsubmit="return false">
        <h1>Authenticator code</h1>
        <p class="muted">Enter the 6-digit code from your authenticator app.</p>
        <input id="f-totp" placeholder="6-digit code" inputmode="numeric" autocomplete="one-time-code">
        <div class="err" id="f-err"></div>
        <div style="height:12px"></div>
        <button id="f-go">${iconAsset("check-circle")}<span>Verify</span></button>
        <p class="tiny"><a id="f-back-pass" href="#">Back to password</a></p>
      </form>`);
    }
    const preregBanner = (S.token && S.me)
      ? `<div style="margin-bottom:12px;padding:12px;border-radius:14px;background:var(--glass)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <div class="tiny" style="color:var(--ink)">
              <strong>✓ Signed in as @${esc(S.me.username || S.me.display_name || "user")}</strong>
              ${S.preregistration && !isAdmin() ? `<div>Beta preregistration is active — your account is reserved for launch.</div>` : ""}
            </div>
            <div class="row" style="gap:6px">
              ${(!S.preregistration || isAdmin()) ? `<button type="button" class="ghost" data-go="feed" style="padding:5px 10px;font-size:12px">${ico("house")}<span>Open app</span></button>` : ""}
              <button type="button" class="ghost" id="btn-auth-signout" style="padding:5px 10px;font-size:12px">${iconAsset("logout")}<span>Sign out</span></button>
            </div>
          </div>
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">
            <div class="tiny" style="margin-bottom:6px;color:var(--ink)"><b>Linked sign-in methods</b> — sign in with your password, Google, or GitHub:</div>
            <div class="row" style="gap:8px">
              <button type="button" class="ghost" id="btn-link-google-auth" style="flex:1;padding:7px 10px;font-size:12px">
                ${GOOGLE_SVG}${iconAsset(S.me.google_linked ? "link-broken" : "link")}<span>${S.me.google_linked ? "Google linked (Unlink)" : "Link Google"}</span>
              </button>
              <button type="button" class="ghost" id="btn-link-github-auth" style="flex:1;padding:7px 10px;font-size:12px">
                ${GITHUB_SVG}${iconAsset(S.me.github_linked ? "link-broken" : "link")}<span>${S.me.github_linked ? "GitHub linked (Unlink)" : "Link GitHub"}</span>
              </button>
            </div>
          </div>
        </div>`
      : "";
    return authWrap(`<form class="card auth-card" onsubmit="return false">
      ${preregBanner}
      <h1>${reg ? "Join Uxaoro" : "Welcome back"}</h1>
      <p class="muted">${reg ? "Username, email, date of birth, password." : "Sign in with username or email."}</p>
      ${reg ? `<input id="f-user" placeholder="username" autocomplete="username" required>
               <div style="height:8px"></div>
               <input id="f-email" placeholder="email" type="email" required>
               <div style="height:8px"></div>
               <label class="tiny" for="f-dob" style="display:block;margin-bottom:4px">Date of birth (required, must be 13+)</label>
               <input id="f-dob" type="date" placeholder="Date of birth (YYYY-MM-DD)" required>` :
              `<input id="f-login" placeholder="username or email" autocomplete="username">`}
      <div style="height:8px"></div>
      <input id="f-pass" placeholder="password" type="password" autocomplete="${reg ? "new-password" : "current-password"}">
      ${captchaBlockHtml()}
      <div class="err" id="f-err">${esc(S.oauthError || "")}</div>
      <div style="height:12px"></div>
      ${reg ? legalConsent("Create account") : ""}
      <button type="submit" id="f-go" style="width:100%">${iconAsset(reg ? "user-plus" : "login")}<span>${reg ? "Create account" : "Log in"}</span></button>
      ${socialOAuthButtonsHtml()}
      <p class="tiny" style="text-align:center;margin-top:12px">${reg ? `Have an account? <a data-go="login">Sign in</a>` : `New here? <a data-go="register">Create account</a>`}</p>
    </form>`);
  }

  function authSettings() {
    return authWrap(`<div class="card auth-card">
      <h1>Settings</h1>
      ${lookPanel()}
      ${devSettingsHtml()}
      ${devVersionHtml()}
      <div style="height:12px"></div>
      <button class="ghost" data-go="login">${ico("back")}<span>Back</span></button>
    </div>`);
  }

  window.saveStickerToFav = async function(id) {
    try {
      if (window.UxaMedia && UxaMedia.StickerStore && UxaMedia.StickerStore.toggleFavorite) {
        await UxaMedia.StickerStore.toggleFavorite(id, true);
      } else {
        const fav = JSON.parse(localStorage.getItem("uxa_sticker_favs") || "[]");
        if (!fav.includes(id)) { fav.push(id); localStorage.setItem("uxa_sticker_favs", JSON.stringify(fav)); }
      }
      alert("Sticker saved to favorites");
    } catch (_) {}
  };

  function handleDeepLink(url) {
    if (!url || !url.startsWith("uxaoro://")) return;
    try {
      const u = new URL(url);
      const host = (u.hostname || u.pathname || "").replace(/^\/+/, "");
      if (host === "captcha") {
        const cState = u.searchParams.get("state") || "";
        const cPass = u.searchParams.get("captcha_pass") || "";
        if (cPass) receiveCaptchaPass(cPass, cState);
        return;
      }
    } catch (_) {}
    const rest = url.replace("uxaoro://", "");
    const parts = rest.split("/");
    const first = (parts[0] || "").split("?")[0];
    if (first === "captcha") {
      const qIdx = rest.indexOf("?");
      if (qIdx !== -1) {
        const sp = new URLSearchParams(rest.slice(qIdx + 1));
        const cPass = sp.get("captcha_pass") || "";
        const cState = sp.get("state") || "";
        if (cPass) receiveCaptchaPass(cPass, cState);
      }
      return;
    }
    if (first === "post" && parts[1]) { go("post", { id: parts[1] }, undefined); }
    else if (first === "account" && parts[1]) { go("user", { id: parts[1] }, undefined); }
    else if (first === "settings") {
      go("settings", {}, undefined);
    }
    else if (first === "promo" && parts[1]) {
      api("/badges/apply", { method: "POST", body: { code: parts[1] } })
        .then((r) => { alert("Badge applied!" + (r.ok ? "" : "")); render(); })
        .catch((e) => { alert("Promo failed: " + (e.message || "")); });
    }
  }

  function bindNav() {
    mountBetaCountdown();
    const savedChatBtn = document.getElementById("saved-chat-btn");
    if (savedChatBtn) savedChatBtn.onclick = () => { openSavedChat(); };
    document.querySelectorAll("[data-go]").forEach((el) => {
      el.onclick = (e) => {
        e.preventDefault();
        const v = el.getAttribute("data-go");
        go(v, {}, TABS.includes(v) ? v : undefined);
      };
    });
    bindLook(document);
    document.querySelectorAll("a[data-ext]").forEach((a) => {
      a.onclick = (e) => {
        if (openExternal(a.getAttribute("href"))) e.preventDefault();
      };
    });
    const goBtn = $("#f-go");
    if (goBtn) goBtn.onclick = (e) => { e.preventDefault(); submitAuth(); };
    const form = document.querySelector(".auth-card");
    if (form && form.tagName === "FORM") {
      form.onsubmit = (e) => { e.preventDefault(); submitAuth(); };
    }
    if (OPEN.includes(S.view) && !S.pendingEmail && !S.pending2fa) {
      loadOAuthStatus();
      loadCaptchaConfig();
      mountTurnstileWidget();
    }
    const gBtn = $("#btn-oauth-google");
    if (gBtn) gBtn.onclick = (e) => { e.preventDefault(); startSocialOAuth("google", false); };
    const ghBtn = $("#btn-oauth-github");
    if (ghBtn) ghBtn.onclick = (e) => { e.preventDefault(); startSocialOAuth("github", false); };
    const gLinkAuth = $("#btn-link-google-auth");
    if (gLinkAuth) gLinkAuth.onclick = (e) => {
      e.preventDefault();
      if (S.me && S.me.google_linked) unlinkSocialOAuth("google");
      else startSocialOAuth("google", true);
    };
    const ghLinkAuth = $("#btn-link-github-auth");
    if (ghLinkAuth) ghLinkAuth.onclick = (e) => {
      e.preventDefault();
      if (S.me && S.me.github_linked) unlinkSocialOAuth("github");
      else startSocialOAuth("github", true);
    };
    const signOutBtn = $("#btn-auth-signout");
    if (signOutBtn) signOutBtn.onclick = (e) => { e.preventDefault(); clearSession(); render(); };
    const capConfigRetry = $("#f-captcha-config-retry");
    if (capConfigRetry) capConfigRetry.onclick = (e) => {
      e.preventDefault();
      saveAuthFormSnapshot();
      S.captchaChecked = false;
      S.captchaConfigError = "";
      S.captchaSiteKey = "";
      S.captchaEnabled = true;
      render();
      restoreAuthFormSnapshot();
    };
    const capReset = $("#f-captcha-reset");
    if (capReset) capReset.onclick = (e) => {
      e.preventDefault();
      saveAuthFormSnapshot();
      S.captchaPass = "";
      S.captchaSolved = false;
      S.rawTurnstileToken = "";
      S.turnstileToken = "";
      render();
      restoreAuthFormSnapshot();
      mountTurnstileWidget();
    };
    const backPass = $("#f-back-pass");
    if (backPass) backPass.onclick = (e) => { e.preventDefault(); S.pending2fa = ""; render(); };
    const backReg = $("#f-back-reg");
    if (backReg) backReg.onclick = (e) => { e.preventDefault(); S.changingEmail = true; render(); };
    const cancelEmail = $("#f-cancel-email");
    if (cancelEmail) cancelEmail.onclick = (e) => { e.preventDefault(); S.changingEmail = false; render(); };
    const resend = $("#f-resend");
    if (resend) resend.onclick = async (e) => {
      e.preventDefault();
      const box = $("#f-err");
      try {
        await api("/auth/register/resend", { method: "POST", body: { pending_token: S.pendingEmail } });
        if (box) box.textContent = "New code sent";
      } catch (err) {
        if (box) box.textContent = err.message;
      }
    };
    const hang = $("#call-hang");
    if (hang) hang.onclick = hangup;
    const acc = $("#call-accept");
    if (acc) acc.onclick = acceptCall;
    bindDevPanel();
  }

  const BETA_OPEN_AT = Date.UTC(2026, 9, 10, 12, 0, 0);
  let betaCountdownTimer = null;

  function mountBetaCountdown() {
    if (betaCountdownTimer) {
      clearInterval(betaCountdownTimer);
      betaCountdownTimer = null;
    }
    const countdown = document.querySelector("[data-beta-countdown]");
    if (!countdown) return;
    const update = () => {
      const remaining = BETA_OPEN_AT - Date.now();
      if (remaining <= 0) {
        countdown.textContent = "The open beta test is now live.";
        if (betaCountdownTimer) clearInterval(betaCountdownTimer);
        betaCountdownTimer = null;
        return;
      }
      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      countdown.textContent = `Open beta starts in ${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s · Oct 10, 12:00 UTC`;
    };
    update();
    if (Date.now() < BETA_OPEN_AT) betaCountdownTimer = setInterval(update, 1000);
  }

  async function submitAuth() {
    if (S.authBusy) return;
    S.authBusy = true;
    const err = $("#f-err");
    const goBtn = $("#f-go");
    if (err) err.textContent = "";
    if (goBtn) goBtn.disabled = true;
    try {
      if (S.pendingEmail) {
        if (S.changingEmail) {
          const newEmail = (($("#f-new-email") && $("#f-new-email").value) || "").trim().toLowerCase();
          if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            throw new Error("Enter a valid email address");
          }
          let r;
          try {
            r = await api("/auth/register/email", {
              method: "POST",
              body: { pending_token: S.pendingEmail, email: newEmail },
            });
          } catch (changeErr) {
            if (changeErr && /(only registration|not found|404|405)/i.test(changeErr.message || "")) {
              r = await api("/auth/register/resend", {
                method: "POST",
                body: { pending_token: S.pendingEmail, email: newEmail },
              });
            } else {
              throw changeErr;
            }
          }
          setPendingEmail((r && r.pending_token) || S.pendingEmail, (r && r.email) || newEmail);
          S.changingEmail = false;
          render();
          return;
        }
        const pair = await api("/auth/register/verify", {
          method: "POST",
          body: { pending_token: S.pendingEmail, code: ($("#f-email-code").value || "").trim() },
        });
        setPendingEmail("", "");
        S.changingEmail = false;
        saveSession(pair);
      } else if (S.pending2fa) {
        const pair = await api("/auth/login/2fa", {
          method: "POST",
          body: { pending_token: S.pending2fa, code: ($("#f-totp").value || "").trim() },
        });
        S.pending2fa = "";
        saveSession(pair);
      } else if (S.view === "register") {
        const username = $("#f-user").value.trim();
        const email = $("#f-email").value.trim();
        const password = $("#f-pass").value;
        const dob = $("#f-dob") ? $("#f-dob").value.trim() : "";
        if (!dob) {
          throw new Error("Date of birth is required");
        }
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
        if (!m) {
          throw new Error("Enter date of birth in YYYY-MM-DD format");
        }
        const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const mdDiff = (now.getMonth() - birth.getMonth()) * 100 + (now.getDate() - birth.getDate());
        if (mdDiff < 0) age -= 1;
        if (isNaN(age) || age < 13) {
          throw new Error("You must be at least 13 years old to register");
        }
        if (S.verifyPromise) {
          try { await S.verifyPromise; } catch (_) {}
        }
        if (!S.captchaPass && S.turnstileToken) {
          await verifyTurnstileToken(S.turnstileToken);
        }
        if (!S.captchaPass && window.turnstile && S.turnstileWidgetId != null) {
          try {
            const respTok = window.turnstile.getResponse(S.turnstileWidgetId);
            if (respTok) await verifyTurnstileToken(respTok);
          } catch (_) {}
        }
        if (S.captchaEnabled && !S.captchaPass && (S.captchaSolved || S.rawTurnstileToken)) {
          S.captchaPass = await fetchServerCaptchaPass(S.rawTurnstileToken);
        }
        if (S.captchaEnabled && !S.captchaPass) {
          mountTurnstileWidget();
          throw new Error(S.captchaConfigError || (!S.captchaSiteKey
            ? "The CAPTCHA configuration is still loading. Please wait or retry the security check."
            : "Please complete the security check above, then try again."));
        }
        pendingKeyPassword = password; // used later by syncKeyBackup()
        const regBody = { username, email, password, display_name: username, dob };
        if (S.captchaPass) regBody.captcha_pass = S.captchaPass;
        let pair;
        try {
          pair = await api("/auth/register", { method: "POST", body: regBody });
        } catch (regErr) {
          resetCaptchaWidget("This security check was used or rejected. Complete a fresh check before retrying.");
          throw regErr;
        } finally {
          S.captchaPass = "";
          S.captchaSolved = false;
          S.verifiedTurnstileToken = "";
          S.rawTurnstileToken = "";
          S.turnstileToken = "";
        }
        S.captchaSolved = false;
        S.rawTurnstileToken = "";
        if (pair.requires_email && pair.pending_token) {
          setPendingEmail(pair.pending_token, pair.email || email);
          render();
          return;
        }
        saveSession(pair);
      } else {
        if (S.verifyPromise) {
          try { await S.verifyPromise; } catch (_) {}
        }
        if (!S.captchaPass && S.turnstileToken) {
          await verifyTurnstileToken(S.turnstileToken);
        }
        if (!S.captchaPass && window.turnstile && S.turnstileWidgetId != null) {
          try {
            const respTok = window.turnstile.getResponse(S.turnstileWidgetId);
            if (respTok) await verifyTurnstileToken(respTok);
          } catch (_) {}
        }
        if (S.captchaEnabled && !S.captchaPass && (S.captchaSolved || S.rawTurnstileToken)) {
          S.captchaPass = await fetchServerCaptchaPass(S.rawTurnstileToken);
        }
        if (S.captchaEnabled && !S.captchaPass) {
          mountTurnstileWidget();
          throw new Error(S.captchaConfigError || (!S.captchaSiteKey
            ? "The CAPTCHA configuration is still loading. Please wait or retry the security check."
            : "Please complete the security check above, then try again."));
        }
        const loginBody = { login: $("#f-login").value.trim(), password: $("#f-pass").value };
        if (S.captchaPass) loginBody.captcha_pass = S.captchaPass;
        // Kept in memory only, so afterLogin() can seal/unlock the E2EE key backup.
        pendingKeyPassword = loginBody.password;
        let pair;
        try {
          pair = await api("/auth/login", { method: "POST", body: loginBody });
        } catch (loginErr) {
          resetCaptchaWidget("This security check was used or rejected. Complete a fresh check before retrying.");
          throw loginErr;
        } finally {
          S.captchaPass = "";
          S.captchaSolved = false;
          S.verifiedTurnstileToken = "";
          S.rawTurnstileToken = "";
          S.turnstileToken = "";
        }
        S.captchaSolved = false;
        S.rawTurnstileToken = "";
        if (pair.requires_2fa && pair.pending_token) {
          S.pending2fa = pair.pending_token;
          render();
          return;
        }
        if (pair.requires_email && pair.pending_token) {
          setPendingEmail(pair.pending_token, pair.email || loginBody.login);
          S.changingEmail = false;
          render();
          return;
        }
        saveSession(pair);
      }
      await afterLogin();
      if (S.preregistration && !isAdmin()) {
        render();
        return;
      }
      const h = location.hash || "";
      if ((h.includes("oauth") && h.includes("client_id")) || /#\/?(join|user|community)\b/.test(h)) {
        // Honor the shared link the user came for (profile / community / group invite).
        parseHash();
        render();
      } else go("feed", {}, "feed");
    } catch (e) {
      if (e && /captcha/i.test(e.message || "") && !document.getElementById("cf-turnstile-box")) {
        S.captchaEnabled = true;
        render();
      }
      const errNow = $("#f-err");
      if (errNow) errNow.textContent = e.message;
    } finally {
      S.authBusy = false;
      const btn = $("#f-go");
      if (btn) btn.disabled = false;
    }
  }

  async function afterLogin() {
    try {
      const status = await api("/auth/status");
      if (status) {
        S.preregistration = !!(status.preregistration || status.registration_mode === "preregistration");
        localStorage.setItem("uxa_reg_mode", status.registration_mode || "open");
        if (status.oauth) S.oauthProviders = status.oauth;
      }
    } catch (_) {}
    S.me = S.me || cacheGet("me", null);
    if (S.preregistration && S.me && !isAdmin()) {
      return;
    }
    try {
      S.me = await api("/auth/me");
      cacheSet("me", S.me);
    } catch (e) {
      S.me = cacheGet("me", S.me);
      if (e && /preregistration/i.test(e.message || "")) {
        S.preregistration = true;
        return;
      }
    }
    if (S.preregistration && !isAdmin()) {
      return;
    }
    // Restore the password-encrypted key backup (if any) before falling back to
    // generating a new keypair - otherwise a new device would publish a fresh
    // key and lose access to everything encrypted with the old one.
    await syncKeyBackup();
    if (!CryptoApp.hasKeys() && S.me && S.me.pubkey) {
      try { localStorage.setItem("uxa_c_chats", "[]"); } catch (_) {}
      toast("Link this device from a device that already has your encryption key", "shield-check");
      connectWs();
      refreshBadge();
      return;
    }
    if (window.UxaoroDeviceSecurity) {
      await window.UxaoroDeviceSecurity.processKeyRotation().catch(() => {});
    }
    const rotation = await api("/devices/key-rotation").catch(() => null);
    if (rotation && rotation.status === "ready" && CryptoApp.publicPem() !== rotation.new_pubkey) {
      connectWs();
      refreshBadge();
      return;
    }
    const pem = await CryptoApp.ensureKeys();
    if (pem && S.me && S.me.pubkey !== pem) {
      await api("/users/me/pubkey", { method: "PUT", body: { pubkey: pem } }).catch(() => {});
    }
    connectWs();
    refreshBadge();
    checkPopupNewsOnEnter();
  }

  // ---- News System (https://fourtexec.site/uxaoro/news/) ----
  const NEWS_BASE = "https://fourtexec.site/uxaoro/news/";
  const APP_VERSION_STR = "0.1.0";

  function currentNewsPlatform() {
    try {
      if (window.UxaoroDesktop || window.__TAURI_INTERNALS__ || window.UxaoroQt || document.documentElement.dataset.desktop === "1") {
        return "desktop";
      }
    } catch (_) {}
    return "web";
  }

  function currentNewsVersion() {
    try {
      if (window.UxaoroBridge && window.UxaoroBridge.version) {
        return String(window.UxaoroBridge.version).replace(/^v/i, "").trim();
      }
    } catch (_) {}
    return APP_VERSION_STR;
  }

  function newsMatchesTarget(item) {
    if (!item || typeof item !== "object") return false;
    const plat = currentNewsPlatform();
    const ver = currentNewsVersion();
    const rawPlats = item.platforms != null ? item.platforms : item.platform;
    if (rawPlats != null) {
      const list = (Array.isArray(rawPlats) ? rawPlats : String(rawPlats).split(","))
        .map((x) => String(x || "").trim().toLowerCase())
        .filter(Boolean);
      if (list.length > 0 && !list.includes("all") && !list.includes("*") && !list.includes(plat)) {
        return false;
      }
    }
    const rawVers = item.versions != null ? item.versions : item.version;
    if (rawVers != null) {
      const vlist = (Array.isArray(rawVers) ? rawVers : String(rawVers).split(","))
        .map((x) => String(x || "").trim().replace(/^v/i, "").toLowerCase())
        .filter(Boolean);
      if (vlist.length > 0 && !vlist.includes("all") && !vlist.includes("*") && !vlist.includes(ver.toLowerCase())) {
        return false;
      }
    }
    return true;
  }

  async function fetchNewsText(subPath) {
    const clean = String(subPath || "").replace(/^\/+/, "");
    if (/^https?:\/\//i.test(clean)) {
      const r = await fetch(clean, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    }
    const candidates = [
      NEWS_BASE + clean,
      apiUrl("/news/" + clean),
      "./news/" + clean,
    ];
    for (const u of candidates) {
      try {
        const r = await fetch(u, { cache: "no-store" });
        if (r.ok) return await r.text();
      } catch (_) {}
    }
    throw new Error("Could not load news resource: " + clean);
  }

  function renderMarkdownToHtml(md) {
    const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let inList = false;
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (inList) { out.push("</ul>"); inList = false; }
        continue;
      }
      if (line.startsWith("### ")) {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h3>${inline(line.slice(4))}</h3>`);
      } else if (line.startsWith("## ")) {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h2>${inline(line.slice(3))}</h2>`);
      } else if (line.startsWith("# ")) {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h1>${inline(line.slice(2))}</h1>`);
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        if (!inList) { out.push("<ul>"); inList = true; }
        out.push(`<li>${inline(line.slice(2))}</li>`);
      } else {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<p>${inline(line)}</p>`);
      }
    }
    if (inList) out.push("</ul>");
    return `<div class="news-md">${out.join("")}</div>`;
  }

  function parseMarkdownSections(mdText) {
    const raw = String(mdText || "").trim();
    if (!raw) return [];
    const blocks = raw.split(/\n---\n/);
    return blocks.map((blk, idx) => {
      const trimmed = blk.trim();
      const m = /^#\s+(.+)$/m.exec(trimmed);
      const title = m ? m[1].trim() : `News #${idx + 1}`;
      const body = m ? trimmed.replace(/^#\s+.+\n?/, "").trim() : trimmed;
      return {
        id: "md-section-" + idx,
        type: "tab",
        title,
        badge: "Markdown",
        markdown: body,
      };
    }).filter((x) => x.title || x.markdown);
  }

  async function loadNewsConfig() {
    let cfg = null;
    try {
      const raw = await fetchNewsText("config.json");
      cfg = JSON.parse(raw);
    } catch (_) {
      try {
        const raw2 = await fetchNewsText("news.json");
        cfg = JSON.parse(raw2);
      } catch (_) {
        cfg = { popups: [], tab: [] };
      }
    }
    const allItems = Array.isArray(cfg.items) ? cfg.items : (Array.isArray(cfg.news) ? cfg.news : []);
    const popups = [
      ...(Array.isArray(cfg.popups) ? cfg.popups : []),
      ...allItems.filter((x) => x && x.type === "popup"),
    ];
    const tabItems = [
      ...(Array.isArray(cfg.tab) ? cfg.tab : []),
      ...allItems.filter((x) => x && x.type !== "popup"),
    ];
    const mdFile = cfg.md_file || cfg.markdown_file || "news.md";
    let mdSections = [];
    if (mdFile) {
      try {
        const mdRaw = await fetchNewsText(mdFile);
        mdSections = parseMarkdownSections(mdRaw);
      } catch (_) {}
    }
    return { cfg, popups, tabItems, mdSections };
  }

  function injectNewsBridgeIntoHtml(rawHtml) {
    const bridgeScript = `<script>
      (function(){
        window.UxaoroNews = {
          close: function() {
            try { window.parent.postMessage({ type: "uxaoro-news-close" }, "*"); } catch (_) {}
          },
          fullscreen: function(val) {
            try { window.parent.postMessage({ type: "uxaoro-news-fullscreen", value: val }, "*"); } catch (_) {}
          },
          toggleFullscreen: function() {
            try { window.parent.postMessage({ type: "uxaoro-news-fullscreen", toggle: true }, "*"); } catch (_) {}
          }
        };
        document.addEventListener("click", function(e) {
          var el = e.target && e.target.closest ? e.target.closest("[data-news-close], a[href='uxaoro://news/close'], a[href='#close']") : null;
          if (el) { e.preventDefault(); window.UxaoroNews.close(); }
          var fs = e.target && e.target.closest ? e.target.closest("[data-news-fullscreen], a[href='uxaoro://news/fullscreen']") : null;
          if (fs) { e.preventDefault(); window.UxaoroNews.toggleFullscreen(); }
        });
      })();
    <\/script>`;
    const s = String(rawHtml || "");
    if (/<\/body>/i.test(s)) return s.replace(/<\/body>/i, bridgeScript + "</body>");
    return s + bridgeScript;
  }

  // Label of the news full-screen toggle: a real icon from the icons folder
  // plus text (never a unicode glyph pretending to be an icon, which renders
  // as tofu on fonts that do not carry it).
  const newsFsLabel = (isFs) => (isFs
    ? `${iconAsset("quit-full-screen")}<span>Exit full screen</span>`
    : `${iconAsset("full-screen")}<span>Full screen</span>`);

  async function showPopupNewsModal(item) {
    if (!item || document.getElementById("uxa-news-popup-overlay")) return;
    let htmlDoc = "";
    const htmlPath = item.html || item.file || item.url || "";
    if (item.html_content) {
      htmlDoc = String(item.html_content);
    } else if (htmlPath) {
      try {
        htmlDoc = await fetchNewsText(htmlPath);
      } catch (_) {
        htmlDoc = "";
      }
    }
    if (!htmlDoc && item.markdown) {
      htmlDoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:20px;color:#f4f4f6;background:#101118}</style></head><body>${renderMarkdownToHtml(item.markdown)}</body></html>`;
    }
    if (!htmlDoc) return;

    const canCloseHost = item.closable === true || item.allow_close === true || item.can_close === true;
    const allowFs = item.allow_fullscreen !== false;
    let isFs = item.fullscreen === true;

    const overlay = document.createElement("div");
    overlay.id = "uxa-news-popup-overlay";
    overlay.className = "news-popup-backdrop" + (isFs ? " fullscreen" : "");
    overlay.innerHTML = `
      <div class="news-popup-card${isFs ? " fullscreen" : ""}" id="uxa-news-popup-card">
        <div class="news-popup-bar">
          <span class="news-popup-title">${esc(item.title || "Uxaoro News")}</span>
          <div class="row" style="gap:8px">
            ${allowFs ? `<button type="button" class="ghost" id="uxa-news-fs-btn" style="padding:5px 10px;font-size:12px">${newsFsLabel(isFs)}</button>` : ""}
            ${canCloseHost ? `<button type="button" class="ghost" id="uxa-news-close-btn" aria-label="Close" title="Close" style="padding:5px 10px;font-size:12px">${iconAsset("close-circle")}<span>Close</span></button>` : ""}
          </div>
        </div>
        <iframe class="news-popup-frame" id="uxa-news-popup-frame" sandbox="allow-scripts allow-popups" referrerpolicy="no-referrer"></iframe>
      </div>
    `;
    document.body.appendChild(overlay);
    const frame = document.getElementById("uxa-news-popup-frame");
    if (frame) frame.srcdoc = injectNewsBridgeIntoHtml(htmlDoc);

    const setFs = (nextVal) => {
      isFs = typeof nextVal === "boolean" ? nextVal : !isFs;
      const card = document.getElementById("uxa-news-popup-card");
      const btn = document.getElementById("uxa-news-fs-btn");
      overlay.classList.toggle("fullscreen", isFs);
      if (card) card.classList.toggle("fullscreen", isFs);
      if (btn) btn.innerHTML = newsFsLabel(isFs);
    };

    const doClose = () => {
      if (item.id && item.once !== false) {
        try { localStorage.setItem("uxa_news_pop_" + item.id, "1"); } catch (_) {}
      }
      window.removeEventListener("message", onMsg);
      overlay.remove();
    };

    const onMsg = (ev) => {
      if (!frame || ev.source !== frame.contentWindow) return;
      const d = ev && ev.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "uxaoro-news-close") doClose();
      else if (d.type === "uxaoro-news-fullscreen" && allowFs) {
        if (d.toggle) setFs(!isFs);
        else setFs(!!d.value);
      }
    };
    window.addEventListener("message", onMsg);

    const fsBtn = document.getElementById("uxa-news-fs-btn");
    if (fsBtn) fsBtn.onclick = () => setFs(!isFs);
    const closeBtn = document.getElementById("uxa-news-close-btn");
    if (closeBtn && canCloseHost) closeBtn.onclick = doClose;
    if (canCloseHost) {
      overlay.onclick = (e) => { if (e.target === overlay) doClose(); };
    }
  }

  let _popupNewsChecked = false;
  async function checkPopupNewsOnEnter() {
    if (_popupNewsChecked) return;
    _popupNewsChecked = true;
    try {
      const { popups } = await loadNewsConfig();
      for (const p of popups) {
        if (!newsMatchesTarget(p)) continue;
        if (p.appear_on_enter === false || p.show_on_enter === false) continue;
        if (p.id && p.once !== false && localStorage.getItem("uxa_news_pop_" + p.id) === "1") continue;
        await showPopupNewsModal(p);
        break;
      }
    } catch (_) {}
  }

  async function viewMore() {
    const my = S._rs;
    const me = S.me || {};
    paintRoot(my, shell(`
      <div class="top">
        <span class="title">More</span>
      </div>
      <div class="more-shortcuts">
        <button type="button" data-go="compose">${ico("plus")}<span>New post</span></button>
        <button type="button" class="ghost" data-go="createstory">${iconAsset("gallery-add")}<span>Story</span></button>
      </div>
      <div class="card" style="cursor:pointer" data-go="explore">
        <div class="row spread">
          <div class="row">
            ${ico("search")}
            <div>
              <strong>Explore</strong>
              <div class="tiny">Trending posts, topics, and hashtags</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="communities">
        <div class="row spread">
          <div class="row">
            ${ico("list")}
            <div>
              <strong>Circles</strong>
              <div class="tiny">Find and manage communities</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="friends">
        <div class="row spread">
          <div class="row">
            ${ico("people")}
            <div>
              <strong>People</strong>
              <div class="tiny">Friends, requests, and suggestions</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="news">
        <div class="row spread">
          <div class="row">
            ${ico("news")}
            <div>
              <strong>News</strong>
              <div class="tiny">Announcements, updates, and articles</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="search">
        <div class="row spread">
          <div class="row">
            ${ico("search")}
            <div>
              <strong>Search</strong>
              <div class="tiny">Find people, circles, and posts</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="notifications">
        <div class="row spread">
          <div class="row">
            ${ico("bell")}
            <div>
              <strong>Alerts</strong>
              <div class="tiny">Notifications${(S.badge.notifications || 0) ? ` (${S.badge.notifications > 99 ? "99+" : S.badge.notifications})` : ""}</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="developer">
        <div class="row spread">
          <div class="row">
            ${ico("star")}
            <div>
              <strong>Developer${S.me && S.me.is_developer ? ` ${iconAsset("check-circle")}` : ""}</strong>
              <div class="tiny">API access, OAuth apps, and developer tools</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="settings">
        <div class="row spread">
          <div class="row">
            ${ico("gear")}
            <div>
              <strong>Settings</strong>
              <div class="tiny">Appearance, privacy, 2FA, E2EE keys, and account</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="wallet">
        <div class="row spread">
          <div class="row">
            ${iconAsset("gift")}
            <div>
              <strong>UX Wallet</strong>
              <div class="tiny">Balance: ${Number(me.balance_ux || 0).toFixed(2)} UX · Top up & send gifts</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      <div class="card" style="cursor:pointer" data-go="premium">
        <div class="row spread">
          <div class="row">
            ${ico("star")}
            <div>
              <strong>${me.premium ? "Manage Uxaoro Premium" : "Get Uxaoro Premium"}</strong>
              <div class="tiny">Profile glow, name colors, chat bubbles, sales & badges</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>
      ${isStaff() ? `
      <div class="card" style="cursor:pointer" data-go="admin">
        <div class="row spread">
          <div class="row">
            ${ico("star")}
            <div>
              <strong>Control panel</strong>
              <div class="tiny">Manage users, moderation, sales, and badges</div>
            </div>
          </div>
          <span class="muted">${iconAsset("alt-arrow-right")}</span>
        </div>
      </div>` : ""}
    `));
  }

  async function viewNews() {
    const my = S._rs;
    const { tabItems, mdSections } = await loadNewsConfig();
    if (my !== S._rs) return;
    const matchedTab = tabItems.filter((x) => x && x.type !== "popup" && newsMatchesTarget(x));
    const allCards = [...matchedTab, ...mdSections];

    const htmlContents = {};
    await Promise.all(allCards.map(async (item, idx) => {
      const htmlPath = item.html || item.file || item.url || "";
      if (item.html_content) {
        htmlContents[idx] = String(item.html_content);
      } else if (htmlPath) {
        try {
          htmlContents[idx] = await fetchNewsText(htmlPath);
        } catch (_) {}
      } else if (item.md) {
        try {
          item._loadedMd = await fetchNewsText(item.md);
        } catch (_) {}
      }
    }));
    if (my !== S._rs) return;

    const cardsHtml = allCards.length === 0
      ? `<div class="card"><p class="muted">No news for ${esc(currentNewsPlatform())} v${esc(currentNewsVersion())} right now.</p></div>`
      : allCards.map((item, idx) => {
          const badge = item.badge || item.tag || "";
          const date = item.date || "";
          const plats = item.platforms ? (Array.isArray(item.platforms) ? item.platforms.join(", ") : String(item.platforms)) : "all";
          const vers = item.versions ? (Array.isArray(item.versions) ? item.versions.join(", ") : String(item.versions)) : "all";
          const mdText = item._loadedMd || item.markdown || "";
          const hasHtml = !!htmlContents[idx];
          return `
            <div class="card" style="margin-bottom:12px">
              <div class="row spread">
                <div class="row" style="gap:8px;flex-wrap:wrap">
                  <strong style="font-size:15px">${esc(item.title || "Announcement")}</strong>
                  ${badge ? `<span class="nsfw-tag" style="background:var(--coral)">${esc(badge)}</span>` : ""}
                </div>
                <div class="row" style="gap:8px">
                  ${date ? `<span class="tiny">${esc(date)}</span>` : ""}
                  ${hasHtml ? `<button type="button" class="ghost" data-news-open-idx="${idx}" style="padding:4px 10px;font-size:11px">${iconAsset("full-screen")}<span>Full screen</span></button>` : ""}
                </div>
              </div>
              <p class="tiny" style="margin:4px 0 8px;opacity:0.7">Target: ${esc(plats)} · Version: ${esc(vers)}</p>
              ${item.summary ? `<p style="margin:6px 0 10px">${esc(item.summary)}</p>` : ""}
              ${mdText ? renderMarkdownToHtml(mdText) : ""}
              ${hasHtml ? `<iframe class="news-tab-frame" id="news-tab-frame-${idx}" sandbox="allow-scripts allow-popups" referrerpolicy="no-referrer"></iframe>` : ""}
            </div>
          `;
        }).join("");

    paintRoot(my, shell(`
      <div class="top">
        <span class="title">News</span>
        <button type="button" class="ghost" data-go="more" style="padding:4px 10px;font-size:12px">${iconAsset("arrow-left")}<span>More</span></button>
      </div>
      ${cardsHtml}
    `));

    allCards.forEach((_, idx) => {
      if (htmlContents[idx]) {
        const ifr = document.getElementById(`news-tab-frame-${idx}`);
        if (ifr) ifr.srcdoc = injectNewsBridgeIntoHtml(htmlContents[idx]);
      }
    });

    document.querySelectorAll("[data-news-open-idx]").forEach((btn) => {
      btn.onclick = () => {
        const i = Number(btn.getAttribute("data-news-open-idx"));
        const it = allCards[i];
        if (it) {
          showPopupNewsModal(Object.assign({}, it, {
            closable: true,
            fullscreen: true,
            allow_fullscreen: true,
            once: false,
          }));
        }
      };
    });
  }

  /** The reaction state a bubble was last drawn with (see bubbleHtml). */
  function readReactState(el) {
    if (!el) return { reactions: [], mine: "" };
    let reactions = [];
    try { reactions = JSON.parse(el.getAttribute("data-reacts") || "[]"); } catch (_) { reactions = []; }
    return { reactions: Array.isArray(reactions) ? reactions : [], mine: el.getAttribute("data-mine") || "" };
  }

  function writeReactState(el, reactions, mine) {
    if (!el) return;
    try { el.setAttribute("data-reacts", JSON.stringify(reactions || [])); } catch (_) {}
    el.setAttribute("data-mine", mine || "");
  }

  function reactRow(id, reactions, mine, isMsg) {
    const attr = isMsg ? "data-mreact" : "data-react";
    const pick = isMsg ? "data-mpick" : "data-ppick";
    const chips = (reactions || []).filter((r) => r.count > 0).map((r) => {
      const on = mine === r.emoji || r.me;
      return `<button class="rchip${on ? " on" : ""}" ${attr}="${esc(id)}" data-emoji="${esc(r.emoji)}"><span class="rchip-e">${esc(r.emoji)}</span>${r.count > 1 ? `<span class="rchip-n">${r.count}</span>` : ""}</button>`;
    }).join("");
    return `<div class="reacts">${chips}<button class="rchip radd" ${pick}="${esc(id)}" title="Reactions"><span class="rchip-e">+</span></button></div>`;
  }

  /**
   * Client-side reaction tally: add/move/remove one emoji on the row we already
   * have, in the shape the server uses ({emoji, count, me}).
   */
  function optimisticReactions(reactions, myReaction, emoji) {
    const out = [];
    for (const r of (reactions || [])) {
      let count = Number(r.count) || 0;
      if (r.emoji === myReaction) count -= 1;
      if (r.emoji === emoji) count += 1;
      if (count > 0) out.push({ emoji: r.emoji, count, me: r.emoji === emoji ? false : !!r.me && r.emoji !== myReaction });
    }
    if (!out.some((r) => r.emoji === emoji)) out.push({ emoji, count: 1, me: false });
    if (myReaction === emoji) {
      // tapping the same emoji again takes it back
      for (const r of out) if (r.emoji === emoji) r.count -= 1;
      return out.filter((r) => r.count > 0);
    }
    return out;
  }

  function openReactPicker(cb) {
    let box = document.getElementById("react-picker");
    if (!box) {
      box = document.createElement("div");
      box.id = "react-picker";
      box.className = "react-picker hidden";
      document.body.appendChild(box);
    }
    const quick = REACTS.slice(0, 8);
    const btn = (e, cls) => `<button type="button" class="rs-e ${cls || ""}" data-e="${esc(e)}">${e}</button>`;
    box.innerHTML = `
      <div class="react-sheet">
        <div class="rs-handle"></div>
        <div class="rs-preview" aria-hidden="true"></div>
        <div class="rs-quick">${quick.map((e) => btn(e, "rs-q")).join("")}</div>
        <div class="rs-grid">${REACTS.map((e) => btn(e)).join("")}</div>
      </div>`;
    box.classList.remove("hidden");
    const prev = box.querySelector(".rs-preview");
    box.onclick = (ev) => { if (ev.target === box) box.classList.add("hidden"); };
    box.querySelectorAll("[data-e]").forEach((b) => {
      b.onmouseenter = () => { if (prev) prev.textContent = b.getAttribute("data-e"); };
      b.onmouseleave = () => { if (prev) prev.textContent = ""; };
      b.onclick = (e) => {
        e.stopPropagation();
        box.classList.add("hidden");
        if (prev) prev.textContent = "";
        cb(b.getAttribute("data-e"));
      };
    });
  }

  function formatPostTextHtml(raw) {
    const safe = esc(raw || "");
    return safe.replace(/#([a-zA-Z0-9_\u0400-\u04FF]{2,32})/g, (m, tag) => {
      return `<a data-hashtag="${esc(tag.toLowerCase())}" style="color:var(--coral);font-weight:600;cursor:pointer">#${esc(tag)}</a>`;
    });
  }

  function renderPollHtml(p) {
    const poll = p && p.poll;
    if (!poll || !Array.isArray(poll.options) || !poll.options.length) return "";
    const total = poll.total_voters || poll.total_votes || 0;
    const optsHtml = poll.options.map((o) => {
      const pct = Math.max(0, Math.min(100, Number(o.pct || 0)));
      const voted = !!o.voted;
      return `
        <button type="button" class="ghost" data-poll-post="${esc(p.id)}" data-poll-opt="${esc(o.id)}"
          style="position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:6px;padding:9px 12px;border-radius:10px;overflow:hidden;border:1px solid ${voted ? "var(--coral)" : "var(--line)"};text-align:left">
          <span style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:var(--coral);opacity:${voted ? "0.24" : "0.13"};pointer-events:none;transition:width .25s ease"></span>
          <span style="position:relative;z-index:1;font-weight:${voted ? "700" : "500"}">${voted ? iconAsset("check-circle") : ""} ${esc(o.text)}</span>
          <span class="tiny" style="position:relative;z-index:1;margin-left:8px">${pct}% (${o.votes || 0})</span>
        </button>
      `;
    }).join("");
    return `
      <div class="card" data-poll-box="${esc(p.id)}" style="margin-top:8px;padding:10px 12px;background:var(--glass)">
        <div class="row spread">
          <b>${iconAsset("chart")} ${esc(poll.question)}</b>
          <span class="tiny">${poll.multiple ? "Multiple choice" : "Poll"} · ${total} vote${total === 1 ? "" : "s"}</span>
        </div>
        ${optsHtml}
      </div>
    `;
  }

  // Posts rendered on this screen, kept around so the "..." menu can act on
  // the full post object (text/media/author) instead of just the DOM id.
  const postMenuCache = new Map();
  function cachePostForMenu(p) {
    if (!p || !p.id) return;
    postMenuCache.set(p.id, p);
    if (postMenuCache.size > 300) {
      const oldest = postMenuCache.keys().next().value;
      postMenuCache.delete(oldest);
    }
  }

  function postCard(p) {
    const a = p.author || {};
    cachePostForMenu(p);
    let img = "";
    try {
      if (window.UxaMedia && UxaMedia.postMediaHtml) {
        img = UxaMedia.postMediaHtml(p);
      } else if (p.image_url) {
        img = `<img class="post-img" src="${esc(media(p.image_url))}" alt="" data-zoom="${esc(media(p.image_url))}">`;
      }
    } catch (_) {
      img = p.image_url ? `<img class="post-img" src="${esc(media(p.image_url))}" alt="" data-zoom="${esc(media(p.image_url))}">` : "";
    }
    const orig = p.original_post ? `<div class="card" style="margin-top:8px"><b>${esc(nameOf(p.original_post.author))}</b><div>${esc((p.original_post.text || "").slice(0, 280))}</div></div>` : "";
    const mine = S.me && a.id === S.me.id;
    // Community owner/admins manage posts inside their own community.
    const commAdmin = !!(p.community_id && S._commCtx && S._commCtx.id === p.community_id
      && (S._commCtx.role === "owner" || S._commCtx.role === "admin"));
    const hidden = nsfwHidden(p);
    const pinBadge = p.is_pinned ? `<div class="tiny" style="color:var(--coral);font-weight:700;margin-bottom:4px">${iconAsset("pin")} Pinned post</div>` : "";
    const statusEmoji = a.status_emoji ? `<span title="Status">${esc(a.status_emoji)}</span> ` : "";
    const body = `
      ${pinBadge}
      <div class="row spread">
        <div class="row">
          ${avatar(a)}
          <div>
            <div><a data-user="${esc(a.id)}">${statusEmoji}${esc(nameOf(a))}</a> ${nsfwBadge(p)} <span class="tiny">@${esc(a.username || "")}</span></div>
            <div class="tiny">${esc(when(p.created_at))}${p.edited_at ? " · edited" : ""}${p.community_name ? " · " + esc(p.community_name) : ""} · ${iconAsset("eye")} ${p.views_count || 1}</div>
          </div>
        </div>
        <div class="row">
          ${mine || commAdmin ? `<button class="ghost" data-pin="${esc(p.id)}" title="${p.is_pinned ? "Unpin post" : "Pin post"}" style="padding:4px 8px;font-size:11px">${iconAsset("pin")}<span>${p.is_pinned ? "Unpin" : "Pin"}</span></button>` : ""}
          <button class="ghost" data-postmenu="${esc(p.id)}" title="More actions" aria-label="More actions" style="padding:4px 6px">${iconAsset("menu-dots")}</button>
        </div>
      </div>
      <p>${formatPostTextHtml(p.text || "")}</p>
      ${renderPollHtml(p)}
      ${img}${orig}
      <div class="post-actions" role="group" aria-label="Post actions">
        <button type="button" class="ghost" data-like="${esc(p.id)}" aria-label="${p.liked ? "Unlike" : "Like"} post">${ico("heart", p.liked ? "on" : "")}<span>Like</span><span class="action-count">${p.likes_count || 0}</span></button>
        <button type="button" class="ghost" data-openpost="${esc(p.id)}" aria-label="View ${p.comments_count || 0} comments">${iconAsset("chat-round-dots")}<span>Comment</span><span class="action-count">${p.comments_count || 0}</span></button>
        <button type="button" class="ghost" data-repost="${esc(p.id)}" aria-label="Repost">${iconAsset("repeat")}<span>Repost</span><span class="action-count">${p.reposts_count || 0}</span></button>
        <button type="button" class="ghost" data-sharepost="${esc(p.id)}" aria-label="Share post">${ico("share")}<span>Share</span></button>
        <button type="button" class="ghost" data-savepost="${esc(p.id)}" aria-label="Save post to Saved Messages" title="Save to Saved Messages">${iconAsset("bookmark")}<span>Save</span></button>
      </div>
      <div class="post-meta-actions">
        ${p.tips_ux > 0 ? `<span class="tiny">${iconAsset("wallet")} ${p.tips_ux} UX tipped</span>` : ""}
        ${mine || isStaff() || commAdmin ? `<button type="button" class="ghost" data-delpost="${esc(p.id)}">${ico("trash")}<span>Delete</span></button>` : `<button type="button" class="ghost" data-report="${esc(p.id)}">${iconAsset("flag")}<span>Report</span></button>`}
      </div>
      ${reactRow(p.id, p.reactions, p.my_reaction, false)}`;
    const cover = hidden
      ? `<div class="nsfw-cover">
          <span class="nsfw-tag lg">NSFW</span>
          <span class="tiny">${esc(p.nsfw_reason || (p.nsfw_author ? "Posted by an account marked NSFW" : "Marked NSFW by the moderator"))}</span>
          <button class="ghost" data-reveal="${esc(p.id)}">${iconAsset("eye")}<span>Show anyway</span></button>
        </div>`
      : "";
    return `<article class="card ${hidden ? "nsfw-card" : ""}" data-post="${esc(p.id)}">
      <div class="nsfw-body${hidden ? " blurred" : ""}">${body}</div>
      ${cover}
    </article>`;
  }

  /* ---- Saved Messages: a private E2EE chat with yourself ---- */
  function ensureSavedChat() {
    return api("/chats/saved");
  }

  async function openSavedChat() {
    try {
      const chat = await ensureSavedChat();
      go("chat", { id: chat.id }, "messages");
    } catch (e) {
      alert(e.message);
    }
  }

  // Forward a post into Saved Messages. The post is re-packed as a chat
  // message payload and encrypted to your own key, so the server only ever
  // sees ciphertext — exactly like any other Wire message. Post media keeps
  // its original (already public) upload URL.
  async function forwardPostToSaved(post) {
    if (!post || !post.id) return;
    const chat = await ensureSavedChat();
    const mediaUrl = post.image_url || post.video_url || post.audio_url || "";
    const payloadObj = {
      text: post.text || "",
      media_url: mediaUrl,
      media_type: mediaUrl ? (post.media_type || (post.video_url ? "video" : post.audio_url ? "audio" : "image")) : "",
      forward: {
        post_id: post.id,
        author: nameOf(post.author),
        username: (post.author && post.author.username) || "",
        created_at: post.created_at || "",
      },
    };
    const pubs = {};
    try {
      const pk = await api("/users/" + encodeURIComponent(S.me.id) + "/pubkey");
      if (pk && pk.pubkey) pubs[S.me.id] = pk.pubkey;
    } catch (_) {}
    if (!pubs[S.me.id]) pubs[S.me.id] = CryptoApp.publicPem();
    const enc = await CryptoApp.encryptBundle(JSON.stringify(payloadObj), pubs, null);
    await api("/chats/" + encodeURIComponent(chat.id) + "/messages", {
      method: "POST",
      body: { msg_type: "text", ciphertext: enc.ciphertext, nonce: enc.nonce, keys_json: enc.keys_json },
    });
    toast("Forwarded to Saved Messages", "bookmark");
  }

  function closePostMenu() {
    const m = document.getElementById("uxa-post-menu");
    if (m) m.remove();
  }

  function openPostMenu(postId) {
    const post = postMenuCache.get(postId) || Optim.get("posts", postId);
    if (!post) return;
    closePostMenu();
    const mine = S.me && post.author && post.author.id === S.me.id;
    const overlay = document.createElement("div");
    overlay.id = "uxa-post-menu";
    overlay.className = "uxa-modal-backdrop";
    overlay.innerHTML = `
      <div class="uxa-menu-card" role="dialog" aria-modal="true" aria-label="Post actions">
        <div class="tiny uxa-menu-title">Post by ${esc(nameOf(post.author))}</div>
        <button type="button" class="uxa-menu-item" data-pm-share="1">${ico("share")} <span>Share post</span></button>
        <button type="button" class="uxa-menu-item" data-pm-copy="1">${iconAsset("copy")} <span>Copy post link</span></button>
        <button type="button" class="uxa-menu-item" data-pm-forward="1">${iconAsset("bookmark")} <span>Save to Saved Messages</span></button>
        <button type="button" class="uxa-menu-item" data-pm-quote="1">${iconAsset("repeat")} <span>Quote repost</span></button>
        ${mine ? `<button type="button" class="uxa-menu-item" data-pm-edit="1">${iconAsset("pen")} <span>Edit post</span></button>` : `<button type="button" class="uxa-menu-item" data-pm-tip="1">${iconAsset("wallet")} <span>Tip author with UX</span></button>`}
      </div>`;
    document.body.appendChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) closePostMenu(); };
    const url = shareUrl("/post?id=" + encodeURIComponent(post.id));
    const share = overlay.querySelector("[data-pm-share]");
    if (share) share.onclick = async () => {
      closePostMenu();
      await shareLink(url, "Uxaoro post", `See ${nameOf(post.author)}'s post on Uxaoro`);
    };
    const copy = overlay.querySelector("[data-pm-copy]");
    if (copy) copy.onclick = async () => {
      closePostMenu();
      toast((await copyText(url)) ? "Post link copied" : url, "");
    };
    const fwd = overlay.querySelector("[data-pm-forward]");
    if (fwd) fwd.onclick = async () => {
      closePostMenu();
      try { await forwardPostToSaved(post); }
      catch (e) { alert(e.message); }
    };
    const quote = overlay.querySelector("[data-pm-quote]");
    if (quote) quote.onclick = () => { closePostMenu(); go("compose", { original: post.id }); };
    const edit = overlay.querySelector("[data-pm-edit]");
    if (edit) edit.onclick = () => { closePostMenu(); openEditPostModal(post.id); };
    const tip = overlay.querySelector("[data-pm-tip]");
    if (tip) tip.onclick = () => { closePostMenu(); openTipModal(post.id); };
  }

  function openEditPostModal(postId) {
    const post = postMenuCache.get(postId) || Optim.get("posts", postId);
    if (!post || Optim.isLocal(postId)) return;
    const old = document.getElementById("uxa-edit-post-modal");
    if (old) old.remove();
    const box = document.createElement("div");
    box.id = "uxa-edit-post-modal";
    box.className = "uxa-modal-backdrop";
    box.innerHTML = `
      <div class="uxa-menu-card uxa-tip-card" role="dialog" aria-modal="true" aria-labelledby="edit-post-title">
        <div class="row spread" style="margin-bottom:10px">
          <b id="edit-post-title">${iconAsset("pen")} Edit post</b>
          <button type="button" class="ghost" id="edit-post-close" aria-label="Close edit post" title="Close" style="padding:4px 8px">${iconAsset("close-circle")}</button>
        </div>
        <textarea id="edit-post-text" maxlength="2000" aria-label="Post text">${esc(post.text || "")}</textarea>
        <div class="tiny" id="edit-post-count">${String(post.text || "").length}/2000</div>
        <div class="err" id="edit-post-error"></div>
        <div class="row" style="justify-content:flex-end;margin-top:10px">
          <button type="button" class="ghost" id="edit-post-cancel">${iconAsset("close-circle")}<span>Cancel</span></button>
          <button type="button" id="edit-post-save">${iconAsset("check-circle")}<span>Save changes</span></button>
        </div>
      </div>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.onclick = (e) => { if (e.target === box) close(); };
    box.querySelector("#edit-post-close").onclick = close;
    box.querySelector("#edit-post-cancel").onclick = close;
    const input = box.querySelector("#edit-post-text");
    const count = box.querySelector("#edit-post-count");
    const save = box.querySelector("#edit-post-save");
    const err = box.querySelector("#edit-post-error");
    input.oninput = () => { count.textContent = input.value.length + "/2000"; };
    input.focus();
    save.onclick = async () => {
      const text = input.value.trim();
      save.disabled = true;
      err.textContent = "";
      const result = await localFirst("Edit post",
        () => Optim.patch("posts", postId, { text, edited_at: new Date().toISOString() }),
        () => api("/posts/" + encodeURIComponent(postId), { method: "PATCH", body: { text } }),
        { repaint: false });
      if (!result) {
        save.disabled = false;
        err.textContent = "The post could not be updated. Please try again.";
        return;
      }
      const updated = Object.assign({}, post, result, { text });
      postMenuCache.set(postId, updated);
      Optim.patch("posts", postId, { text: updated.text, edited_at: updated.edited_at || new Date().toISOString() });
      close();
      toast("Post updated", "check-circle");
      render();
    };
  }

  function openTipModal(postId) {
    let box = document.getElementById("uxa-tip-modal");
    if (box) box.remove();
    box = document.createElement("div");
    box.id = "uxa-tip-modal";
    box.className = "uxa-modal-backdrop";
    box.innerHTML = `
      <div class="uxa-menu-card uxa-tip-card">
        <div class="row spread" style="margin-bottom:10px">
          <b>${iconAsset("wallet")} Tip this post with UX</b>
          <button type="button" class="ghost" id="tip-close" aria-label="Close" title="Close" style="padding:4px 8px">${iconAsset("close-circle")}</button>
        </div>
        <p class="tiny">Reward the creator directly from your UX Wallet (${Number((S.me && S.me.balance_ux) || 0).toFixed(2)} UX available).</p>
        <div class="row" style="gap:6px;margin:8px 0">
          ${[1, 5, 10, 25, 50].map((v) => `<button type="button" class="chip" data-tip-preset="${v}">+${v} UX</button>`).join("")}
        </div>
        <input id="tip-amt" type="number" min="0.1" step="any" value="5" placeholder="Amount in UX">
        <div style="height:8px"></div>
        <input id="tip-note" placeholder="Optional message (e.g. Great post!)">
        <div class="err" id="tip-err"></div>
        <div style="height:10px"></div>
        <button type="button" id="tip-send" style="width:100%">${iconAsset("wallet")}<span>Send UX Tip</span></button>
      </div>
    `;
    document.body.appendChild(box);
    box.querySelector("#tip-close").onclick = () => box.remove();
    box.onclick = (e) => { if (e.target === box) box.remove(); };
    box.querySelectorAll("[data-tip-preset]").forEach((b) => {
      b.onclick = () => { box.querySelector("#tip-amt").value = b.getAttribute("data-tip-preset"); };
    });
    box.querySelector("#tip-send").onclick = async () => {
      const amt = parseFloat(box.querySelector("#tip-amt").value || "0");
      const note = (box.querySelector("#tip-note").value || "").trim();
      const err = box.querySelector("#tip-err");
      try {
        const res = await localFirst("Send tip", () => {
          const prev = (S.me && S.me.balance_ux) || 0;
          S.me = Object.assign({}, S.me, { balance_ux: Math.max(0, Number(prev) - amt) });
          cacheSet("me", S.me);
          return () => { S.me = Object.assign({}, S.me, { balance_ux: prev }); cacheSet("me", S.me); };
        }, () => api("/posts/" + encodeURIComponent(postId) + "/tip", {
          method: "POST",
          body: { amount_ux: amt, note },
        }), { repaint: false });
        if (!res) return;
        if (typeof res.balance_ux === "number") {
          S.me.balance_ux = res.balance_ux;
          cacheSet("me", S.me);
        }
        box.remove();
        uxToast(`Tipped ${amt} UX!`);
        render();
      } catch (e) {
        if (err) err.textContent = e.message || "Could not send tip";
      }
    };
  }

  function bindSocial(el) {
    if (!el) return;
    el.querySelectorAll("[data-user]").forEach((n) => {
      const open = () => go("user", { id: n.getAttribute("data-user") });
      n.onclick = open;
      if (n.getAttribute("role") === "link") n.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    });
    el.querySelectorAll("[data-hashtag]").forEach((n) => n.onclick = (e) => {
      e.stopPropagation();
      go("explore", { tag: n.getAttribute("data-hashtag") });
    });
    el.querySelectorAll("[data-poll-opt]").forEach((n) => n.onclick = async (e) => {
      e.stopPropagation();
      const pid = n.getAttribute("data-poll-post");
      const oid = n.getAttribute("data-poll-opt");
      try {
        const post = Optim.get("posts", pid) || {};
        const poll = post.poll;
        // Optimistic vote: the bar fills for the chosen option immediately.
        const applyVote = () => {
          if (!poll || !Array.isArray(poll.options)) return Optim.patch("posts", pid, {});
          const votes = Number(poll.total_voters || poll.total_votes || 0) + 1;
          const options = poll.options.map((o) => {
            const mine = o.id === oid;
            const count = (Number(o.votes) || 0) + (mine ? 1 : 0);
            return Object.assign({}, o, {
              voted: mine ? true : (poll.multiple ? !!o.voted : false),
              votes: count,
              pct: votes > 0 ? Math.round((count / votes) * 100) : 0,
            });
          });
          return Optim.patch("posts", pid, { poll: Object.assign({}, poll, { options, total_voters: votes, total_votes: votes }) });
        };
        await localFirst("Vote", applyVote,
          () => api("/posts/" + encodeURIComponent(pid) + "/poll/vote", { method: "POST", body: { option_id: oid } }));
      } catch (err) { alert(err.message); }
    });
    el.querySelectorAll("[data-pin]").forEach((n) => n.onclick = async (e) => {
      e.stopPropagation();
      try {
        const pid = n.getAttribute("data-pin");
        const before = Optim.get("posts", pid) || {};
        const wantPinned = !before.is_pinned;
        const r = await localFirst("Pin post",
          () => Optim.patch("posts", pid, { is_pinned: wantPinned }),
          () => api("/posts/" + encodeURIComponent(pid) + "/pin", { method: "POST" }));
        if (r) toast(r.pinned ? "Post pinned!" : "Post unpinned", "pin");
      } catch (err) { alert(err.message); }
    });
    el.querySelectorAll("[data-like]").forEach((n) => n.onclick = async () => {
      const pid = n.getAttribute("data-like");
      const before = Optim.get("posts", pid) || {};
      const liked = !!before.liked;
      const count = Math.max(0, (Number(before.likes_count) || 0) + (liked ? -1 : 1));
      // The heart flips right now; a failure puts the old numbers back.
      await localFirst("Like", () => Optim.patch("posts", pid, { liked: !liked, likes_count: count }),
        () => api("/posts/" + pid + "/like", { method: "POST" }));
    });
    el.querySelectorAll("[data-openpost]").forEach((n) => n.onclick = () => go("post", { id: n.getAttribute("data-openpost") }));
    el.querySelectorAll("[data-sharepost]").forEach((n) => n.onclick = async (e) => {
      e.stopPropagation();
      const id = n.getAttribute("data-sharepost");
      const post = postMenuCache.get(id) || Optim.get("posts", id) || {};
      const url = shareUrl("/post?id=" + encodeURIComponent(id));
      await shareLink(url, "Uxaoro post", `See ${nameOf(post.author)}'s post on Uxaoro`);
    });
    el.querySelectorAll("[data-savepost]").forEach((n) => n.onclick = async (e) => {
      e.stopPropagation();
      const id = n.getAttribute("data-savepost");
      const post = postMenuCache.get(id) || Optim.get("posts", id);
      if (!post || Optim.isLocal(id)) return;
      n.disabled = true;
      try { await forwardPostToSaved(post); }
      catch (err) { alert(err.message || "Could not save this post"); }
      finally { n.disabled = false; }
    });
    el.querySelectorAll("[data-postmenu]").forEach((n) => n.onclick = (e) => {
      e.stopPropagation();
      openPostMenu(n.getAttribute("data-postmenu"));
    });
    el.querySelectorAll("[data-repost]").forEach((n) => n.onclick = async () => {
      const pid = n.getAttribute("data-repost");
      const before = Optim.get("posts", pid) || {};
      const count = (Number(before.reposts_count) || 0) + 1;
      await localFirst("Repost", () => Optim.patch("posts", pid, { reposts_count: count }),
        () => api("/posts/" + pid + "/repost", { method: "POST", body: { text: "" } }));
    });
    el.querySelectorAll("[data-delpost]").forEach((n) => n.onclick = async () => {
      if (!confirm("Delete this post?")) return;
      const pid = n.getAttribute("data-delpost");
      // The card disappears at once; if the server refuses it comes back.
      await localFirst("Delete post", () => Optim.remove("posts", pid),
        () => api("/posts/" + pid, { method: "DELETE" }));
    });
    el.querySelectorAll("[data-report]").forEach((n) => n.onclick = async () => {
      n.disabled = true;
      try {
        await api("/reports", { method: "POST", body: { target_type: "post", target_id: n.getAttribute("data-report"), reason: "Inappropriate" } });
        toast("Post reported. Thanks for helping keep Uxaoro safe.", "flag");
      } catch (err) { alert(err.message || "Could not report this post"); }
      finally { n.disabled = false; }
    });
    // NSFW blur: "Show anyway" reveals this post for the session.
    el.querySelectorAll("[data-reveal]").forEach((n) => n.onclick = (e) => {
      e.stopPropagation();
      S.revealed.add(n.getAttribute("data-reveal"));
      render();
    });
    el.querySelectorAll("[data-comm]").forEach((n) => n.onclick = () => go("community", { id: n.getAttribute("data-comm") }));
    el.querySelectorAll("[data-chat]").forEach((n) => {
      const open = () => go("chat", { id: n.getAttribute("data-chat") }, "messages");
      n.onclick = open;
      n.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    });
    el.querySelectorAll("[data-story]").forEach((n) => {
      const open = () => go("story", { id: n.getAttribute("data-story") });
      n.onclick = open;
      n.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    });
    el.querySelectorAll("[data-zoom]").forEach((n) => n.onclick = (e) => {
      e.stopPropagation();
      if (window.UxaMedia && UxaMedia.openImageLightbox) {
        UxaMedia.openImageLightbox(n.getAttribute("data-zoom"));
        return;
      }
      const box = document.getElementById("lightbox") || (() => {
        const d = document.createElement("div");
        d.id = "lightbox"; d.className = "lightbox hidden";
        document.body.appendChild(d);
        return d;
      })();
      box.innerHTML = `<img src="${esc(n.getAttribute("data-zoom"))}" alt="">`;
      box.classList.remove("hidden");
      box.onclick = () => box.classList.add("hidden");
    });
    try { if (window.UxaMedia && UxaMedia.bindMedia) UxaMedia.bindMedia(el); } catch (_) {}
    bindReacts(el);
  }

  function bindReacts(el) {
    if (!el) return;
    el.querySelectorAll("[data-react]").forEach((n) => n.onclick = async (e) => {
      e.stopPropagation();
      const id = n.getAttribute("data-react");
      const emoji = n.getAttribute("data-emoji");
      const before = Optim.get("posts", id) || {};
      // Toggle the chip straight away from the local copy of the row...
      const r = await localFirst("React",
        () => Optim.patch("posts", id, { reactions: optimisticReactions(before.reactions, before.my_reaction, emoji), my_reaction: before.my_reaction === emoji ? "" : emoji }),
        () => api("/posts/" + id + "/react", { method: "POST", body: { emoji } }));
      // ...and let the server's own aggregation win once it answers.
      if (r) Optim.patch("posts", id, { reactions: r.reactions, my_reaction: r.my_reaction });
      const post = Optim.get("posts", id) || before;
      const card = document.querySelector(`[data-post="${cssEsc(id)}"] .reacts`);
      if (card) card.outerHTML = reactRow(id, post.reactions, post.my_reaction, false);
      bindReacts(document.querySelector(`[data-post="${cssEsc(id)}"]`));
    });
    el.querySelectorAll("[data-mreact]").forEach((n) => n.onclick = async (e) => {
      e.stopPropagation();
      const id = n.getAttribute("data-mreact");
      const emoji = n.getAttribute("data-emoji");
      const chatId = S.params.id;
      const el = document.querySelector(`[data-mid="${cssEsc(id)}"]`);
      // The chip answers the tap before the round-trip: the bubble carries its
      // own reaction state (data-reacts), so the new tally is computed locally.
      const before = readReactState(el);
      const draw = (reactions, mine) => {
        const row = document.querySelector(`[data-mid="${cssEsc(id)}"] .reacts`);
        if (row) row.outerHTML = reactRow(id, reactions, mine, true);
        bindReacts(document.querySelector(`[data-mid="${cssEsc(id)}"]`));
      };
      const r = await localFirst("React", () => {
        draw(optimisticReactions(before.reactions, before.mine, emoji), before.mine === emoji ? "" : emoji);
        return () => draw(before.reactions, before.mine);
      }, () => api("/chats/" + chatId + "/messages/" + id + "/react", { method: "POST", body: { emoji } }), { repaint: false });
      if (r) { draw(r.reactions, r.my_reaction); writeReactState(document.querySelector(`[data-mid="${cssEsc(id)}"]`), r.reactions, r.my_reaction); }
    });
    el.querySelectorAll("[data-ppick]").forEach((n) => n.onclick = (e) => {
      e.stopPropagation();
      const id = n.getAttribute("data-ppick");
      openReactPicker(async (emoji) => {
        const r = await api("/posts/" + id + "/react", { method: "POST", body: { emoji } });
        const card = document.querySelector(`[data-post="${cssEsc(id)}"] .reacts`);
        if (card) card.outerHTML = reactRow(id, r.reactions, r.my_reaction, false);
        bindReacts(document.querySelector(`[data-post="${cssEsc(id)}"]`));
      });
    });
    el.querySelectorAll("[data-mpick]").forEach((n) => n.onclick = (e) => {
      e.stopPropagation();
      const id = n.getAttribute("data-mpick");
      openReactPicker(async (emoji) => {
        const el = document.querySelector(`[data-mid="${cssEsc(id)}"]`);
        const before = readReactState(el);
        const draw = (reactions, mine) => {
          const row = document.querySelector(`[data-mid="${cssEsc(id)}"] .reacts`);
          if (row) row.outerHTML = reactRow(id, reactions, mine, true);
          bindReacts(document.querySelector(`[data-mid="${cssEsc(id)}"]`));
        };
        const r = await localFirst("React", () => {
          draw(optimisticReactions(before.reactions, before.mine, emoji), before.mine === emoji ? "" : emoji);
          return () => draw(before.reactions, before.mine);
        }, () => api("/chats/" + S.params.id + "/messages/" + id + "/react", { method: "POST", body: { emoji } }), { repaint: false });
        if (r) { draw(r.reactions, r.my_reaction); writeReactState(document.querySelector(`[data-mid="${cssEsc(id)}"]`), r.reactions, r.my_reaction); }
      });
    });
  }

  async function viewFeed() {
    const my = ACTIVE;
    const filter = ["media", "polls"].includes(S.params.filter) ? S.params.filter : "all";
    let stories = { items: [] };
    let feed = cacheGet("feed", { items: [] });
    let motd = "";
    try {
      const [stRes, fdRes, verRes] = await Promise.all([
        api("/stories").catch(() => ({ items: [] })),
        api("/feed").catch(() => cacheGet("feed", { items: [] })),
        api("/version").catch(() => ({})),
      ]);
      stories = stRes || { items: [] };
      feed = fdRes || { items: [] };
      cacheSet("feed", feed);
      motd = (verRes && verRes.motd) || "";
    } catch (_) {}
    const rings = Optim.merge("story_rings", stories.items || [], (g) => (g.user && g.user.id) || g.id).map((g) => {
      const u = g.user || {};
      return `<div class="story ${g.unseen ? "" : "seen"}" data-story="${esc(u.id)}" role="button" tabindex="0" aria-label="View ${esc(nameOf(u))}'s story">
        ${u.avatar_url ? `<img src="${esc(media(u.avatar_url))}" alt="">` : `<div class="ph"></div>`}
        <div class="tiny">${esc((u.display_name || u.username || "").slice(0, 10))}${g.__pending ? '<span class="pending-note"> · sending…</span>' : ""}</div>
      </div>`;
    }).join("");
    const allPosts = Optim.merge("posts", feed.items || []);
    const visiblePosts = allPosts.filter((p) => {
      const hasMedia = !!(p.image_url || p.video_url || p.audio_url || p.media_url || p.media_type);
      if (filter === "media") return hasMedia;
      if (filter === "polls") return !!p.poll;
      return true;
    });
    const posts = visiblePosts.map(postCard).join("");
    const unread = Number(S.badge.notifications || 0);
    const filterTabs = [["all", "All"], ["media", "Media"], ["polls", "Polls"]].map(([key, label]) =>
      `<button type="button" class="chip ${filter === key ? "on" : ""}" data-feed-filter="${key}" aria-pressed="${filter === key}">${label}</button>`
    ).join("");
    if (!paintRoot(my, shell(`
      <div class="feed-heading row spread">
        <div><h1 class="h1">Home</h1><p class="tiny">The latest from your people and circles</p></div>
        <div class="row feed-tools">
          <button class="ghost" id="saved-chat-btn" title="Saved Messages">${iconAsset("bookmark")}<span>Saved</span></button>
          <button class="ghost" data-go="search" title="Search Uxaoro">${ico("search")}<span>Search</span></button>
          <button class="ghost" data-go="notifications" title="Notifications">${ico("bell")}<span>Alerts</span>${unread ? `<span class="badge">${unread > 99 ? "99+" : unread}</span>` : ""}</button>
          <button type="button" class="ghost" id="refresh-feed" title="Refresh feed" aria-label="Refresh feed">${iconAsset("refresh")}</button>
        </div>
      </div>
      ${motd ? `<p class="motd">${esc(motd)}</p>` : ""}
      <div class="stories"><button type="button" class="story" id="new-story-empty" aria-label="Add to your story"><span class="ph">+</span><span class="tiny">Your story</span></button>${rings}</div>
      <div class="card quick-composer">
        ${avatar(S.me)}
        <button type="button" id="quick-compose" class="quick-compose-prompt">What's on your mind, ${esc(nameOf(S.me))}?</button>
        <button type="button" class="ghost quick-story" data-go="createstory">${iconAsset("gallery-add")}<span>Story</span></button>
        <button type="button" id="new-post" class="quick-post-btn">${ico("plus")}<span>Post</span></button>
      </div>
      <div class="feed-filter-row" role="tablist" aria-label="Filter feed">${filterTabs}<button type="button" class="chip discover-chip" data-go="explore">${iconAsset("compass")} Explore</button></div>
      ${posts || (filter === "all"
        ? `<div class="card empty-state"><b>Your feed is just getting started</b><p class="muted">Add friends, join a circle, or share something to bring it to life.</p><div class="row"><button type="button" data-go="friends">${ico("people")}<span>Find people</span></button><button type="button" class="ghost" data-go="communities">${iconAsset("users-group-rounded")}<span>Browse circles</span></button><button type="button" class="ghost" data-go="explore">${iconAsset("compass")}<span>Explore</span></button></div></div>`
        : `<div class="card empty-state"><b>No ${filter} posts yet</b><p class="muted">Try another feed filter or discover something new.</p><button type="button" class="ghost" data-feed-filter="all">${iconAsset("refresh")}<span>Show all posts</span></button></div>`)}
      <div id="lightbox" class="lightbox hidden"></div>
    `))) return;
    bindSocial($("#root"));
    $("#new-post").onclick = () => go("compose", {});
    $("#quick-compose").onclick = () => go("compose", {});
    $("#refresh-feed").onclick = () => {
      cacheSet("feed", null);
      S._drawn = "";
      render();
    };
    document.querySelectorAll("[data-feed-filter]").forEach((button) => {
      button.onclick = () => go("feed", { filter: button.getAttribute("data-feed-filter") || "all" }, "feed");
    });
    const emptyStory = document.getElementById("new-story-empty");
    if (emptyStory) emptyStory.onclick = () => go("createstory");
  }

  async function viewExplore() {
    const my = ACTIVE;
    const activeTag = (S.params.tag || "").trim().replace(/^#/, "").toLowerCase();
    let trending = { hashtags: [], posts: [] };
    let tagFeed = { items: [] };
    try { trending = await api("/explore/trending"); } catch (_) {}
    if (activeTag) {
      try { tagFeed = await api("/posts/hashtag/" + encodeURIComponent(activeTag)); } catch (_) {}
    }
    const topics = (trending && trending.hashtags) || [];
    const items = activeTag ? ((tagFeed && tagFeed.items) || []) : ((trending && trending.posts) || []);
    const topicButtons = topics.map((t) =>
      `<button type="button" class="trend-topic" data-hashtag="${esc(t.tag)}"><b>#${esc(t.tag)}</b><span class="tiny">${Number(t.count || 0)} posts</span></button>`
    ).join("");
    if (!paintRoot(my, shell(`
      <div class="row spread explore-heading">
        <div><h1 class="h1">Explore</h1><p class="tiny">Find conversations, people, and circles worth following.</p></div>
        <div class="row">
          <button type="button" class="ghost" data-go="search">${ico("search")}<span>Search</span></button>
          <button type="button" class="ghost" id="refresh-explore" title="Refresh Explore" aria-label="Refresh Explore">${iconAsset("refresh")}</button>
        </div>
      </div>
      <div class="explore-shortcuts">
        <button type="button" class="card explore-shortcut" data-go="friends">${ico("people")}<span><b>Find people</b><small>Meet someone new</small></span>${ico("back")}</button>
        <button type="button" class="card explore-shortcut" data-go="communities">${ico("list")}<span><b>Browse circles</b><small>Join a community</small></span>${ico("back")}</button>
      </div>
      <section class="card trends-card">
        <div class="row spread"><div><h2 class="section-title">Trending topics</h2><p class="tiny">Popular hashtags across Uxaoro</p></div>${activeTag ? `<button type="button" class="ghost" id="clear-tag">${iconAsset("tag")}<span>All topics</span></button>` : ""}</div>
        <div class="trend-topics">${topicButtons || `<span class="tiny">No trending topics yet. Add a hashtag to your next post.</span>`}</div>
      </section>
      ${activeTag
        ? `<div class="row spread"><h2 class="section-title">Posts tagged #${esc(activeTag)}</h2><button type="button" class="ghost" data-go="compose">${ico("plus")}<span>Start a post</span></button></div>`
        : `<div class="row spread"><h2 class="section-title">Trending posts</h2><button type="button" class="ghost" data-go="compose">${ico("plus")}<span>Share an idea</span></button></div>`}
      <div class="explore-posts">${Optim.merge("posts", items).map(postCard).join("") || `<div class="card empty-state"><b>${activeTag ? `Nothing tagged #${esc(activeTag)} yet` : "Nothing trending just yet"}</b><p class="muted">Be the first to start a conversation.</p><button type="button" data-go="compose">${iconAsset("pen-new-round")}<span>Create a post</span></button></div>`}</div>
      <div id="lightbox" class="lightbox hidden"></div>
    `))) return;
    bindSocial($("#root"));
    const refresh = $("#refresh-explore");
    if (refresh) refresh.onclick = () => { S._drawn = ""; render(); };
    const clearTag = $("#clear-tag");
    if (clearTag) clearTag.onclick = () => go("explore");
  }
  async function viewCompose() {
    const my = ACTIVE;
    const wall = S.params.wall || "";
    const comm = S.params.community || "";
    const orig = S.params.original || "";
    let originalPost = orig ? (postMenuCache.get(orig) || null) : null;
    if (orig && !originalPost) originalPost = await api("/posts/" + encodeURIComponent(orig)).catch(() => null);
    S.composeFiles = { image: null, video: null, audio: null };
    S.composePollOpen = false;
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">${orig ? "Quote repost" : "New post"}</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      ${orig ? `<div class="card quote-preview">
        <div class="row spread"><b>${iconAsset("repeat")} Quoting ${esc(nameOf(originalPost && originalPost.author))}</b><button type="button" class="ghost" id="remove-quote">${iconAsset("close-circle")}<span>Remove</span></button></div>
        <p>${esc((originalPost && originalPost.text) || "Original post")}</p>
      </div>` : ""}
      <div class="card composer">
        <textarea id="post-text" placeholder="What's new? Add #hashtags so people can browse related posts."></textarea>
        <div style="height:8px"></div>
        <div class="picker-row">
          <button class="ghost" id="pick-photo">${iconAsset("gallery")}<span>Photo</span></button>
          <button class="ghost" id="pick-video">${iconAsset("videocamera")}<span>Video</span></button>
          <button class="ghost" id="pick-audio">${iconAsset("music-note")}<span>Music</span></button>
          <button class="ghost" id="pick-smile">${iconAsset("sticker-smile-circle")}<span>Smiles</span></button>
          <button class="ghost" id="pick-poll">${iconAsset("chart")}<span>Poll</span></button>
        </div>
        <div id="compose-poll-box" class="card hidden" style="margin-top:8px;background:var(--glass)">
          <div class="row spread">
            <b>${iconAsset("chart")} Attach Poll</b>
            <button type="button" class="ghost" id="poll-clear" style="padding:3px 8px;font-size:11px">${iconAsset("close-circle")}<span>Remove poll</span></button>
          </div>
          <div style="height:6px"></div>
          <input id="poll-q" placeholder="Ask a question...">
          <div id="poll-opts-list" style="margin-top:6px">
            <input class="poll-opt-inp" placeholder="Option 1" style="margin-bottom:6px">
            <input class="poll-opt-inp" placeholder="Option 2" style="margin-bottom:6px">
          </div>
          <div class="row spread" style="margin-top:4px">
            <button type="button" class="ghost" id="poll-add-opt" style="padding:4px 10px;font-size:12px">${iconAsset("add-square")}<span>Add option</span></button>
            <label class="tiny row" style="gap:4px;cursor:pointer"><input type="checkbox" id="poll-mult"> Multiple answers</label>
          </div>
        </div>
        <div id="compose-preview"></div>
        <div class="tiny" id="len">0/2000</div>
        <div style="height:8px"></div>
        <button id="post-go">${iconAsset("send-square")}<span>Publish</span></button>
        <div class="err" id="err"></div>
      </div>
    `))) return;
    $("#back").onclick = () => history.back();
    const removeQuote = $("#remove-quote");
    if (removeQuote) removeQuote.onclick = () => go("compose", wall ? { wall } : comm ? { community: comm } : {});
    $("#post-text").oninput = () => { $("#len").textContent = ($("#post-text").value.length) + "/2000"; };
    $("#pick-poll").onclick = () => {
      S.composePollOpen = !S.composePollOpen;
      $("#compose-poll-box").classList.toggle("hidden", !S.composePollOpen);
    };
    $("#poll-clear").onclick = () => {
      S.composePollOpen = false;
      $("#compose-poll-box").classList.add("hidden");
      $("#poll-q").value = "";
    };
    $("#poll-add-opt").onclick = () => {
      const list = $("#poll-opts-list");
      const count = list.querySelectorAll(".poll-opt-inp").length;
      if (count >= 8) return;
      const inp = document.createElement("input");
      inp.className = "poll-opt-inp";
      inp.placeholder = "Option " + (count + 1);
      inp.style.marginBottom = "6px";
      list.appendChild(inp);
    };
    const paintPreview = () => {
      const box = $("#compose-preview");
      if (!box) return;
      const { image, video, audio } = S.composeFiles;
      let html = "";
      if (image) html += `<div class="attach-preview"><img src="${esc(URL.createObjectURL(image))}" alt=""><span class="tiny">photo · <a id="edit-photo">edit</a> · <a id="rm-photo">remove</a></span></div>`;
      if (video) html += `<div class="attach-preview"><video src="${esc(URL.createObjectURL(video))}" muted></video><span class="tiny">video · <a id="rm-video">remove</a></span></div>`;
      if (audio) html += `<div class="attach-preview"><span class="tiny">${iconAsset("music-note")} ${esc(audio.name || "audio")} · <a id="rm-audio">remove</a></span><audio controls src="${esc(URL.createObjectURL(audio))}"></audio></div>`;
      box.innerHTML = html;
      const rp = $("#rm-photo"); if (rp) rp.onclick = () => { S.composeFiles.image = null; paintPreview(); };
      const rv = $("#rm-video"); if (rv) rv.onclick = () => { S.composeFiles.video = null; paintPreview(); };
      const ra = $("#rm-audio"); if (ra) ra.onclick = () => { S.composeFiles.audio = null; paintPreview(); };
      const ep = $("#edit-photo");
      if (ep) ep.onclick = async () => {
        const cur = S.composeFiles.image;
        if (!cur) return;
        const ed = await UxaMedia.openPhotoEditor(cur, { title: "Edit photo" });
        if (ed) { S.composeFiles.image = ed.file; paintPreview(); }
      };
      try { if (window.UxaMedia && UxaMedia.bindMedia) UxaMedia.bindMedia(box); } catch (_) {}
    };
    $("#pick-photo").onclick = async () => {
      const f = await UxaMedia.pickPhoto();
      if (!f) return;
      // Built-in editor auto-opens on photo select (Telegram-style).
      const ed = await UxaMedia.openPhotoEditor(f, { title: "Edit photo" });
      if (!ed) return;
      S.composeFiles.image = ed.file;
      paintPreview();
    };
    $("#pick-video").onclick = async () => {
      const f = await UxaMedia.pickVideo();
      if (f) { S.composeFiles.video = f; paintPreview(); }
    };
    $("#pick-audio").onclick = async () => {
      const f = await UxaMedia.pickAudio();
      if (f) { S.composeFiles.audio = f; paintPreview(); }
    };
    $("#pick-smile").onclick = () => {
      UxaMedia.openStickerSheet(async (pick) => {
        if (pick.emoji) {
          const t = $("#post-text");
          t.value = (t.value + " " + pick.emoji).slice(0, 2000);
          t.dispatchEvent(new Event("input"));
        } else if (pick.sticker_id) {
          try {
            const packs = await UxaMedia.StickerStore.load();
            let url = "";
            packs.forEach((p) => (p.stickers || []).forEach((s) => { if (s.id === pick.sticker_id) url = s.image_url; }));
            if (url) {
              const isWebm = url.endsWith(".webm") || url.includes(".webm");
              const fileName = isWebm ? "sticker.webm" : "sticker.webp";
              const fileType = isWebm ? "video/webm" : "image/webp";
              const r = await fetch(UxaMedia.mediaUrl(url));
              const blob = await r.blob();
              S.composeFiles.image = new File([blob], fileName, { type: blob.type || fileType });
              paintPreview();
            }
          } catch (_) {}
        }
      });
    };
    $("#post-go").onclick = async () => {
      const fd = new FormData();
      fd.append("text", $("#post-text").value);
      if (comm) fd.append("community_id", comm);
      if (wall) fd.append("wall_user_id", wall);
      if (orig) fd.append("original_post_id", orig);
      if (S.composeFiles.image) fd.append("image", S.composeFiles.image);
      if (S.composeFiles.video) fd.append("video", S.composeFiles.video);
      if (S.composeFiles.audio) fd.append("audio", S.composeFiles.audio);
      if (S.composePollOpen) {
        const pq = ($("#poll-q") && $("#poll-q").value || "").trim();
        const popts = Array.from(document.querySelectorAll(".poll-opt-inp")).map((el) => (el.value || "").trim()).filter(Boolean);
        if (pq && popts.length >= 2) {
          fd.append("poll_question", pq);
          fd.append("poll_options", JSON.stringify(popts));
          fd.append("poll_multiple", $("#poll-mult") && $("#poll-mult").checked ? "1" : "0");
        }
      }
      $("#post-go").disabled = true;
      // Local-first publish: the post is inserted at the top of the timeline the
      // user lands on, marked "sending…", and is replaced by the server row when
      // the upload answers. A refusal removes it, says why, and returns the
      // draft (text + attachments) to this screen.
      const draftText = $("#post-text").value;
      const lid = Optim.localId("p");
      const localPost = {
        id: lid, __localId: lid, text: draftText, author: S.me, original_post: originalPost || null,
        created_at: new Date().toISOString(), likes_count: 0, comments_count: 0,
        reposts_count: 0, liked: false, reactions: [], my_reaction: "",
        media_url: S.composeFiles.image ? URL.createObjectURL(S.composeFiles.image)
          : S.composeFiles.video ? URL.createObjectURL(S.composeFiles.video)
          : S.composeFiles.audio ? URL.createObjectURL(S.composeFiles.audio) : "",
        media_type: S.composeFiles.video ? "video" : S.composeFiles.audio ? "audio" : S.composeFiles.image ? "image" : "",
        __community_id: comm || "", __wall_user_id: wall || "",
      };
      const undoPost = Optim.create("posts", localPost);
      const back = () => {
        if (wall) go("user", { id: wall });
        else if (comm) go("community", { id: comm });
        else go("feed", {}, "feed");
      };
      const restoreDraft = () => {
        S.composeText = draftText;
        go("compose", wall ? { wall } : comm ? { comm } : {});
        setTimeout(() => { const t = $("#post-text"); if (t) t.value = draftText; }, 0);
      };
      back();
      try {
        const created = await api("/posts", { method: "POST", body: fd });
        Optim.confirm("posts", lid, created && created.id);
        Optim.merge("posts", created ? [created] : []);
      } catch (e) {
        undoPost();
        reportActionFailure("Publish post", e);
        restoreDraft();
      } finally {
        $("#post-go").disabled = false;
      }
    };
  }

  async function viewCreateStory() {
    const my = ACTIVE;
    S.storyFile = null;
    S.storyKind = "image";
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">New story</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      <div class="card">
        <div class="picker-row">
          <button class="ghost" id="st-photo">${iconAsset("gallery")}<span>Photo</span></button>
          <button class="ghost" id="st-video">${iconAsset("videocamera")}<span>Video</span></button>
        </div>
        <div id="st-preview"></div>
        <div style="height:8px"></div>
        <input id="st-cap" placeholder="Caption (optional)">
        <div style="height:8px"></div>
        <button id="st-go">${iconAsset("send-square")}<span>Share story</span></button>
        <div class="err" id="err"></div>
      </div>
    `))) return;
    $("#back").onclick = () => go("feed", {}, "feed");
    const paint = () => {
      const box = $("#st-preview");
      if (!box) return;
      if (!S.storyFile) { box.innerHTML = `<p class="tiny">Pick a photo or video — the editor opens automatically.</p>`; return; }
      const url = URL.createObjectURL(S.storyFile);
      box.innerHTML = S.storyKind === "video"
        ? `<video controls playsinline src="${esc(url)}" style="width:100%;border-radius:12px;background:#000"></video>`
        : `<img src="${esc(url)}" style="width:100%;border-radius:12px"> <div><button class="ghost" id="st-edit">${iconAsset("gallery-edit")}<span>Edit photo</span></button></div>`;
      const e = $("#st-edit");
      if (e) e.onclick = async () => {
        const ed = await UxaMedia.openPhotoEditor(S.storyFile, { title: "Edit story" });
        if (ed) { S.storyFile = ed.file; paint(); }
      };
    };
    paint();
    $("#st-photo").onclick = async () => {
      const f = await UxaMedia.pickPhoto();
      if (!f) return;
      const ed = await UxaMedia.openPhotoEditor(f, { title: "Edit story" });
      if (!ed) return;
      S.storyFile = ed.file;
      S.storyKind = "image";
      paint();
    };
    $("#st-video").onclick = async () => {
      const f = await UxaMedia.pickVideo();
      if (!f) return;
      S.storyFile = f;
      S.storyKind = "video";
      paint();
    };
    $("#st-go").onclick = async () => {
      if (!S.storyFile) { $("#err").textContent = "Pick a photo"; return; }
      const fd = new FormData();
      fd.append("file", S.storyFile);
      fd.append("caption", $("#st-cap").value);
      // Local-first: the ring for this user is in the tray before the upload
      // answers. Its id is the user id, which we already know, so the server
      // copy takes the same slot and no duplicate ring ever appears.
      const already = (cacheGet("stories", {}).items || []).some((g) => g.user && S.me && g.user.id === S.me.id);
      const lid = Optim.localId("st");
      let undoRing = null;
      if (!already && S.me) {
        const preview = URL.createObjectURL(S.storyFile);
        undoRing = Optim.create("story_rings", {
          id: S.me.id, __localId: lid, user: S.me, unseen: true,
          items: [{ id: lid, media_url: preview, caption: $("#st-cap").value, __pending: true }],
        });
        Optim.confirm("story_rings", lid, S.me.id);
      }
      go("feed", {}, "feed");
      try {
        await api("/stories", { method: "POST", body: fd });
        cacheSet("stories", null);
      } catch (e) {
        if (undoRing) undoRing();
        reportActionFailure("Post story", e);
        go("createstory", {});
      }
    };
  }

  async function viewStory(userId) {
    const my = ACTIVE;
    const feed = await api("/stories").catch(() => cacheGet("stories", { items: [] }));
    const group = (feed.items || []).find((g) => g.user && g.user.id === userId);
    if (!group) {
      if (!paintRoot(my, shell(`<p class="muted">No stories.</p><button class="ghost" data-go="feed">${ico("back")}<span>Back</span></button>`))) return;
      return;
    }
    let i = 0;
    const paint = async () => {
      const s = group.stories[i];
      if (!s) { go("feed", {}, "feed"); return; }
      await api("/stories/" + s.id + "/view", { method: "POST" }).catch(() => {});
      const mine = S.me && s.author_id === S.me.id;
      const isVideo = (s.media_type === "video") || /\.mp4($|\?)|\.webm($|\?)|\.mov($|\?)/i.test(s.image_url || "");
      const stage = isVideo
        ? `<video src="${esc(media(s.image_url))}" controls autoplay playsinline style="width:100%;flex:1;background:#000"></video>`
        : `<img src="${esc(media(s.image_url))}" alt="">`;
      const sReacts = (s.reactions || []).map((r) => `<span class="chip" style="padding:2px 8px;font-size:12px">${esc(r.emoji)} ${r.count}</span>`).join(" ");
      const quickStoryEmojis = ["❤️", "🔥", "😂", "👏", "🤩", "🎉"].map((e) =>
        `<button type="button" class="ghost" data-sreact="${esc(e)}" style="padding:4px 8px;font-size:16px;${s.my_reaction === e ? "border-color:var(--coral)" : ""}">${e}</button>`
      ).join("");
      if (!paintRoot(my, `<div class="story-layer" aria-label="Story viewer">
        <div class="story-progress">${group.stories.map((_, index) => `<span class="story-progress-seg"><i style="width:${index < i ? 100 : index === i ? 100 : 0}%"></i></span>`).join("")}</div>
        <div class="bar story-head">
          <div class="row story-owner">${avatar(group.user)}<span><b>${esc(nameOf(group.user))}</b><small>${i + 1} of ${group.stories.length} · ${iconAsset("eye")} ${s.views || 0} views</small></span></div>
          <div class="row"><button type="button" class="ghost" id="story-share" aria-label="Share story">${ico("share")}</button><button type="button" class="ghost" id="story-del" ${mine ? "" : "style='display:none'"}>${iconAsset("trash-bin-trash")}<span>Delete</span></button><button type="button" class="ghost" id="story-close">${iconAsset("close-circle")}<span>Close</span></button></div>
        </div>
        <div class="story-stage">${stage}</div>
        <div class="story-caption">${esc(s.caption || "")}</div>
        <div class="story-reaction-summary">${sReacts}</div>
        <div class="bar story-footer">
          <button type="button" class="ghost" id="story-prev" ${i === 0 ? "disabled" : ""} aria-label="Previous story">${ico("back")}</button>
          <div class="story-quick-reactions">${quickStoryEmojis}</div>
          ${!mine ? `<button type="button" class="ghost" id="story-reply">${iconAsset("chat-round-dots")}<span>Reply</span></button>` : ""}
          <button type="button" id="story-next">${i + 1 < group.stories.length ? iconAsset("alt-arrow-right") + "<span>Next</span>" : iconAsset("check-circle") + "<span>Done</span>"}</button>
        </div>
      </div>`)) return;
      $("#story-close").onclick = () => go("feed", {}, "feed");
      $("#story-prev").onclick = () => { if (i > 0) { i -= 1; paint(); } };
      $("#story-next").onclick = () => { i += 1; paint(); };
      $("#story-share").onclick = () => shareLink(shareUrl("/story?id=" + encodeURIComponent(userId)), "Uxaoro story", `See ${nameOf(group.user)}'s story`);
      const reply = $("#story-reply");
      if (reply) reply.onclick = async () => {
        try {
          const chat = await api("/chats", { method: "POST", body: { user_ids: [group.user.id] } });
          go("chat", { id: chat.id }, "messages");
        } catch (e) { alert(e.message || "Could not open this conversation"); }
      };
      document.querySelectorAll("[data-sreact]").forEach((b) => {
        b.onclick = async () => {
          const em = b.getAttribute("data-sreact");
          // The chip answers the tap itself: the tally moves now, the server
          // confirms behind it, and a refusal puts the old tally back.
          const before = { reactions: s.reactions, my_reaction: s.my_reaction };
          await localFirst("React to story", () => {
            s.reactions = optimisticReactions(before.reactions, before.my_reaction, em);
            s.my_reaction = before.my_reaction === em ? "" : em;
            return () => { s.reactions = before.reactions; s.my_reaction = before.my_reaction; };
          }, () => api("/stories/" + encodeURIComponent(s.id) + "/react", { method: "POST", body: { emoji: em } }), { repaint: false });
          paint();
        };
      });
      const del = $("#story-del");
      if (del && mine) del.onclick = async () => {
        await localFirst("Delete story", () => Optim.remove("stories", s.id),
          () => api("/stories/" + s.id, { method: "DELETE" }), { repaint: false });
        go("feed", {}, "feed");
      };
    };
    paint();
  }

  async function viewCommunities() {
    const my = ACTIVE;
    const q = S.params.q || "";
    const mine = S.params.mine === "1";
    let page = cacheGet("comms", { items: [] });
    try {
      page = await api("/communities?q=" + encodeURIComponent(q) + "&mine=" + mine);
      cacheSet("comms", page);
    } catch (_) {}
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">Circles</h1><button id="new-c">${ico("plus")}<span>New</span></button></div>
      <div class="card row">
        <input id="c-q" placeholder="Search communities" value="${esc(q)}">
        <button class="ghost" id="c-search">${ico("search")}<span>Search</span></button>
      </div>
      <div class="tabs">
        <button class="chip ${!mine ? "on" : ""}" id="all-c">All</button>
        <button class="chip ${mine ? "on" : ""}" id="mine-c">My communities</button>
      </div>
      ${(page.items || []).map((c) => `<div class="list-item" data-comm="${esc(c.id)}">
        <b>${esc(c.name)}</b> <span class="tiny">@${esc(c.username || c.slug)} · ${c.members_count || 0} members</span>
        <div class="tiny">${esc(c.description || "")}</div>
      </div>`).join("") || `<p class="muted">No communities.</p>`}
    `))) return;
    bindSocial($("#root"));
    $("#new-c").onclick = () => go("createcommunity");
    $("#c-search").onclick = () => go("communities", { q: $("#c-q").value, mine: mine ? "1" : "0" }, "communities");
    $("#c-q").onkeydown = (e) => { if (e.key === "Enter") $("#c-search").click(); };
    $("#all-c").onclick = () => go("communities", { q, mine: "0" }, "communities");
    $("#mine-c").onclick = () => go("communities", { q, mine: "1" }, "communities");
  }

  async function viewCreateCommunity() {
    const my = ACTIVE;
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">New community</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      <div class="card">
        <input id="c-name" placeholder="Name (can match another community)">
        <div style="height:8px"></div>
        <input id="c-user" placeholder="Username (unique, like photos_club)">
        <div style="height:8px"></div>
        <textarea id="c-desc" placeholder="Description"></textarea>
        <div style="height:8px"></div>
        <button id="c-go">${iconAsset("add-circle")}<span>Create</span></button>
        <div class="err" id="err"></div>
      </div>
    `))) return;
    $("#back").onclick = () => go("communities", {}, "communities");
    $("#c-go").onclick = async () => {
      const draft = { name: $("#c-name").value, username: $("#c-user").value, description: $("#c-desc").value };
      // Local-first: the community is on screen (and opens) before the server
      // answers; a refusal brings the form back with the values still in it.
      const lid = Optim.localId("c");
      const undo = Optim.create("communities", Object.assign({ id: lid, __localId: lid, members_count: 1, joined: true, is_member: true, my_role: "owner" }, draft));
      go("communities", {}, "communities");
      try {
        const c = await api("/communities", { method: "POST", body: draft });
        Optim.confirm("communities", lid, c && c.id);
        go("community", { id: c.id });
      } catch (e) {
        undo();
        reportActionFailure("Create community", e);
        go("createcommunity", {});
        setTimeout(() => {
          const n = $("#c-name"), u2 = $("#c-user"), d = $("#c-desc");
          if (n) n.value = draft.name; if (u2) u2.value = draft.username; if (d) d.value = draft.description;
          const box = $("#err"); if (box) box.textContent = (e && e.message) || "Could not create the community";
        }, 0);
      }
    };
  }

  async function viewCommunity(id, uname) {
    const my = ACTIVE;
    if (!id && uname) {
      try {
        const found = await api("/lookup/communities/" + encodeURIComponent(String(uname).replace(/^@/, "")));
        id = found.id;
        S.params.id = id;
      } catch (_) {
        if (!paintRoot(my, shell(`<p class="err">Community not found</p>`))) return;
        return;
      }
    }
    const c = Optim.merge("communities", [await api("/communities/" + id)])[0];
    const posts = await api("/communities/" + id + "/posts");
    const amAdmin = c.my_role === "owner" || c.my_role === "admin";
    // Lets postCard show Pin/Delete on this community's posts for its admins.
    S._commCtx = { id, role: c.my_role || "" };
    if (!paintRoot(my, shell(`
      ${c.cover_url ? `<img class="cover" src="${esc(media(c.cover_url))}">` : `<div class="cover"></div>`}
      <div class="row" style="margin-top:-28px">${avatar({ avatar_url: c.avatar_url, display_name: c.name }, "lg")}
        <div>
          <h1 class="h1">${esc(c.name)} ${c.is_closed ? `<span class="nsfw-tag" title="Closed community — only members see posts">${iconAsset("lock-keyhole")} Closed</span>` : ""}</h1>
          <div class="muted">@${esc(c.username || c.slug)} · ${c.members_count || 0} members · you: ${esc(c.my_role || "guest")}</div>
        </div>
      </div>
      <p>${esc(c.description || "")}</p>
      <div class="row" style="flex-wrap:wrap">
        ${c.is_member ? `<button class="ghost" id="leave">${iconAsset("exit")}<span>Leave</span></button>` : `<button id="join">${iconAsset("user-plus")}<span>Join</span></button>`}
        <button class="ghost" id="members">${iconAsset("users-group-rounded")}<span>Members</span></button>
        ${amAdmin ? `<button id="comm-manage">${iconAsset("settings-minimalistic")}<span>Manage</span></button>` : ""}
        ${c.is_member ? `<button id="c-post">${iconAsset("send-square")}<span>Post here</span></button>` : ""}
        <button class="ghost" id="share-c">${ico("share")}<span>Share</span></button>
      </div>
      ${Optim.merge("posts", posts.items || []).map(postCard).join("")}
    `))) return;
    bindSocial($("#root"));
    // Joining/leaving flips the member count and the button before the server
    // answers; a failure puts the previous state back.
    const setMembership = (joined) => () => {
      const c = Optim.get("communities", id) || {};
      const count = Math.max(0, (Number(c.members_count) || 0) + (joined ? 1 : -1));
      return Optim.patch("communities", id, { joined, is_member: joined, my_role: joined ? (c.my_role || "member") : "", members_count: count });
    };
    const j = $("#join"); if (j) j.onclick = async () => { await localFirst("Join community", setMembership(true), () => api("/communities/" + id + "/join", { method: "POST" })); };
    const l = $("#leave"); if (l) l.onclick = async () => { await localFirst("Leave community", setMembership(false), () => api("/communities/" + id + "/leave", { method: "POST" })); };
    $("#members").onclick = () => go("members", { id });
    const mg = $("#comm-manage");
    if (mg) mg.onclick = () => go("commanage", { id });
    const pub = $("#c-post");
    if (pub) pub.onclick = () => go("compose", { community: id });
    const shc = $("#share-c");
    if (shc) shc.onclick = () => {
      const link = (c.username || c.slug)
        ? shareUrl("/community?u=" + encodeURIComponent(c.username || c.slug))
        : shareUrl("/community?id=" + encodeURIComponent(c.id));
      shareLink(link, c.name || "Uxaoro", "Join my community on Uxaoro");
    };
  }

  // Community control panel: details, look, access rules, danger zone.
  async function viewCommManage(id) {
    const my = ACTIVE;
    const c = Optim.merge("communities", [await api("/communities/" + id)])[0];
    if (c.my_role !== "owner" && c.my_role !== "admin") {
      go("community", { id });
      return;
    }
    const isOwner = c.my_role === "owner";
    const whoPost = c.who_can_post || "members";
    const whoInvite = c.who_can_invite || "admins";
    const roleBtn = (cur, key, val) => `<button type="button" class="chip ${cur === val ? "on" : ""}" data-set="${key}" data-val="${val}">${cur === val ? "• " : ""}${val}</button>`;
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">${iconAsset("settings-minimalistic")} Manage ${esc(c.name)}</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      <div class="card">
        <b>Details</b>
        <div style="height:8px"></div>
        <input id="c-name" value="${esc(c.name)}" placeholder="Name">
        <div style="height:8px"></div>
        ${isOwner ? `<div class="row"><input id="c-user" value="${esc(c.username || c.slug || "")}" placeholder="Username (link @name)"><button class="ghost" id="c-user-go">${iconAsset("check-circle")}<span>Set</span></button></div>
        <p class="tiny">Changing the username changes the public link @name.</p>
        <div style="height:8px"></div>` : ""}
        <textarea id="c-desc" placeholder="Description">${esc(c.description || "")}</textarea>
        <div style="height:8px"></div>
        <button id="c-save">${iconAsset("check-circle")}<span>Save details</span></button>
      </div>
      <div class="card">
        <b>Look</b>
        <div style="height:8px"></div>
        <div class="picker-row">
          <button class="ghost" id="c-ava-btn">${iconAsset("gallery-add")}<span>Avatar…</span></button>
          <button class="ghost" id="c-cover-btn">${iconAsset("gallery-add")}<span>Cover photo…</span></button>
        </div>
      </div>
      <div class="card">
        <b>Access</b>
        <div class="row spread" style="margin-top:8px">
          <div>
            <span>Closed community</span>
            <div class="tiny">Closed: posts and members are hidden from non-members and joining is blocked.</div>
          </div>
          <button class="ghost" id="c-closed">${iconAsset(c.is_closed ? "lock-keyhole" : "lock-keyhole-unlocked")}<span>${c.is_closed ? "Closed" : "Open"}</span></button>
        </div>
        <div style="height:10px"></div>
        <b>Who can post</b>
        <div class="tabs">${["members", "editors", "admins"].map((k) => roleBtn(whoPost, "who_can_post", k)).join("")}</div>
        <b>Who can invite</b>
        <div class="tabs">${["members", "editors", "admins"].map((k) => roleBtn(whoInvite, "who_can_invite", k)).join("")}</div>
      </div>
      <div class="card row spread">
        <div><b>Members & roles</b><div class="tiny">Promote, demote, invite and remove members.</div></div>
        <button class="ghost" id="to-members">${iconAsset("users-group-rounded")}<span>Members</span></button>
      </div>
      ${isOwner ? `<div class="card">
        <b>Danger zone</b>
        <div style="height:8px"></div>
        <button class="danger" id="c-del">${iconAsset("trash-bin-trash")}<span>Delete community</span></button>
      </div>` : ""}
      <div class="err" id="err"></div>
    `))) return;
    const errBox = $("#err");
    const fail = (e) => { if (errBox) errBox.textContent = e.message; };
    $("#back").onclick = () => go("community", { id });
    $("#to-members").onclick = () => go("members", { id });
    $("#c-save").onclick = async () => {
      const body = { name: $("#c-name").value, description: $("#c-desc").value };
      const ok = await localFirst("Save community", () => Optim.patch("communities", id, body),
        () => api("/communities/" + id, { method: "PATCH", body }), { repaint: false });
      if (ok) { toast("Community updated", "settings-minimalistic"); render(); } else { fail({ message: "Not saved - the old details are still in place." }); }
    };
    const userBtn = $("#c-user-go");
    if (userBtn) userBtn.onclick = async () => {
      const body = { username: $("#c-user").value };
      const ok = await localFirst("Change username", () => Optim.patch("communities", id, body),
        () => api("/communities/" + id, { method: "PATCH", body }), { repaint: false });
      if (ok) { toast("Username updated", "settings-minimalistic"); render(); } else { fail({ message: "Not saved - the old username is still in place." }); }
    };
    const avaBtn = $("#c-ava-btn");
    if (avaBtn) avaBtn.onclick = async () => {
      const picked = await UxaMedia.pickAndEditPhoto("Edit community avatar");
      if (!picked) return;
      const fd = new FormData(); fd.append("file", picked.file);
      const local = URL.createObjectURL(picked.file);
      // The chosen file is on the community immediately...
      const undoLocal = Optim.patch("communities", id, { avatar_url: local });
      render();
      try {
        // ...then the permanent URL from the server takes the same slot, and the
        // blob can be released without ever showing a broken image.
        const res = await api("/communities/" + id + "/avatar", { method: "POST", body: fd });
        undoLocal();
        if (res && res.avatar_url) Optim.patch("communities", id, { avatar_url: res.avatar_url });
        render();
        setTimeout(() => { try { URL.revokeObjectURL(local); } catch (_) {} }, 1500);
      } catch (e) {
        undoLocal();
        reportActionFailure("Upload community photo", e);
        fail({ message: "Upload failed - the previous photo is still in place." });
      }
    };
    const coverBtn = $("#c-cover-btn");
    if (coverBtn) coverBtn.onclick = async () => {
      const picked = await UxaMedia.pickAndEditPhoto("Edit community cover");
      if (!picked) return;
      const fd = new FormData(); fd.append("file", picked.file);
      const local = URL.createObjectURL(picked.file);
      const undoLocal = Optim.patch("communities", id, { cover_url: local });
      render();
      try {
        const res = await api("/communities/" + id + "/cover", { method: "POST", body: fd });
        undoLocal();
        if (res && res.cover_url) Optim.patch("communities", id, { cover_url: res.cover_url });
        render();
        setTimeout(() => { try { URL.revokeObjectURL(local); } catch (_) {} }, 1500);
      } catch (e) {
        undoLocal();
        reportActionFailure("Upload community cover", e);
        fail({ message: "Upload failed - the previous cover is still in place." });
      }
    };
    $("#c-closed").onclick = async () => {
      const want = !c.is_closed;
      await localFirst(want ? "Close community" : "Open community",
        () => Optim.patch("communities", id, { is_closed: want }),
        () => api("/communities/" + id, { method: "PATCH", body: { is_closed: want } }));
    };
    document.querySelectorAll("[data-set]").forEach((n) => n.onclick = async () => {
      const body = {};
      const field = n.getAttribute("data-set");
      body[field] = n.getAttribute("data-val");
      await localFirst("Community setting", () => Optim.patch("communities", id, body),
        () => api("/communities/" + id, { method: "PATCH", body }));
    });
    const cdel = $("#c-del");
    if (cdel) cdel.onclick = async () => {
      if (!confirm("Delete this community? All its posts will be removed.")) return;
      await localFirst("Delete community", () => Optim.remove("communities", id),
        () => api("/communities/" + id, { method: "DELETE" }));
      go("communities", {}, "communities");
    };
  }

  async function viewMembers(id) {
    const my = ACTIVE;
    const c = await api("/communities/" + id);
    // Through the overlay, so an invite/removal/role change the server has not
    // echoed back yet survives the refetch this render triggers.
    const memberKind = "community_members:" + id;
    const members = Optim.merge(memberKind, await api("/communities/" + id + "/members"), (m) => m && m.id);
    const canAdmin = c.my_role === "owner" || c.my_role === "admin";
    const isOwner = c.my_role === "owner";
    const roleOptions = (cur) => ["member", "editor", "moderator", "admin"]
      .filter((r) => isOwner || r !== "admin" || cur === "admin")
      .map((r) => `<option value="${r}"${cur === r ? " selected" : ""}>${r}</option>`)
      .join("");
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">${esc(c.name)} members</h1>
        <div class="row">
          ${canAdmin ? `<button class="ghost" id="to-manage">${iconAsset("settings-minimalistic")}<span>Manage</span></button>` : ""}
          <button class="ghost" id="back">${ico("back")}<span>Back</span></button>
        </div>
      </div>
      ${canAdmin ? `<div class="card row"><input id="inv" placeholder="Invite by username"><button id="inv-go">${iconAsset("user-plus")}<span>Invite</span></button></div>
      <div class="err" id="err"></div>` : ""}
      ${(members || []).map((u) => `<div class="list-item row spread">
        <span data-user="${esc(u.id)}">${esc(nameOf(u))} <span class="tiny">@${esc(u.username)}${u.__pending ? '<span class="pending-note"> · sending…</span>' : ""}</span></span>
        <span class="row">
          ${u.community_role === "owner" ? `<span class="chip on">owner</span>`
            : canAdmin && u.id !== (S.me && S.me.id) ? `
            <select data-role-for="${esc(u.id)}" title="Role">${roleOptions(u.community_role || "member")}</select>
            <button class="ghost" data-kick="${esc(u.id)}">${iconAsset("user-cross")}<span>Remove</span></button>`
            : `<span class="tiny">${esc(u.community_role || "member")}</span>`}
        </span>
      </div>`).join("")}
    `))) return;
    bindSocial($("#root"));
    $("#back").onclick = () => go("community", { id });
    const tm = $("#to-manage");
    if (tm) tm.onclick = () => go("commanage", { id });
    const inv = $("#inv-go");
    if (inv) inv.onclick = async () => {
      try {
        const u = await api("/lookup/users/" + encodeURIComponent($("#inv").value.trim().replace(/^@/, "")));
        // The invited member lands in the list with a "sending…" marker.
        const lid = Optim.localId("m");
        const undo = Optim.create(memberKind, Object.assign({}, u, { __localId: lid, community_role: "member" }));
        Optim.confirm(memberKind, lid, u.id);
        await localFirst("Invite member", () => undo, () => api("/communities/" + id + "/invite", { method: "POST", body: { user_id: u.id } }));
      } catch (e) { const box = $("#err"); if (box) box.textContent = e.message; }
    };
    document.querySelectorAll("[data-kick]").forEach((n) => n.onclick = async () => {
      if (!confirm("Remove this member from the community?")) return;
      const uid = n.getAttribute("data-kick");
      await localFirst("Remove member", () => Optim.remove(memberKind, uid),
        () => api("/communities/" + id + "/members/" + uid, { method: "DELETE" }));
    });
    document.querySelectorAll("[data-role-for]").forEach((n) => n.onchange = async () => {
      const uid = n.getAttribute("data-role-for");
      const want = n.value;
      await localFirst("Change role", () => Optim.patch(memberKind, uid, { community_role: want }),
        () => api("/communities/" + id + "/members/" + uid + "/role", { method: "POST", body: { role: want } }));
    });
  }

  async function viewFriends() {
    const my = ACTIVE;
    const tab = S.params.tab || "friends";
    const query = (S.params.q || "").trim().toLowerCase();
    let friends = cacheGet("friends", []);
    let incoming = [];
    let outgoing = [];
    let suggest = [];
    try {
      friends = Optim.merge("users", await api("/friends")); cacheSet("friends", friends);
      incoming = await api("/friends/requests").catch(() => []);
      incoming = Optim.merge("friend_requests", incoming || []);
      outgoing = Optim.merge("friend_outgoing", await api("/friends/outgoing"), (u) => u && u.id);
      suggest = Optim.merge("users", await api("/friends/suggestions"));
    } catch (_) {}
    const matches = (u) => !query || `${nameOf(u)} ${u.username || ""}`.toLowerCase().includes(query);
    const friendRows = (friends || []).filter(matches);
    const requestRows = (incoming || []).filter(matches);
    const outgoingRows = (outgoing || []).filter(matches);
    const suggestionRows = (suggest || []).filter(matches);
    const personIdentity = (u, subtitle) => `<span class="people-ident" data-user="${esc(u.id)}" role="link" tabindex="0" aria-label="View ${esc(nameOf(u))}'s profile">${avatar(u)}<span><b>${esc(nameOf(u))}</b><small>@${esc(u.username || "")}${subtitle ? ` · ${esc(subtitle)}` : ""}</small></span></span>`;
    if (!paintRoot(my, shell(`
      <div class="row spread"><div><h1 class="h1">People</h1><p class="tiny">Stay connected, meet new people, and manage friend requests.</p></div><button type="button" class="ghost" data-go="search">${ico("search")}<span>Search</span></button></div>
      <div class="card row people-search">
        <input id="people-q" placeholder="Search this list" aria-label="Search people" value="${esc(S.params.q || "")}">
        <button type="button" class="ghost" id="people-filter">${ico("search")}<span>Search</span></button>
        ${query ? `<button type="button" class="ghost" id="people-clear" aria-label="Clear search" title="Clear search">${iconAsset("close-circle")}</button>` : ""}
      </div>
      <div class="card row people-add">
        <input id="by-user" placeholder="Add by username" aria-label="Add friend by username">
        <button type="button" id="by-go">${iconAsset("user-plus")}<span>Add friend</span></button>
      </div>
      <div class="tabs people-tabs" role="tablist" aria-label="People sections">
        <button class="chip ${tab === "friends" ? "on" : ""}" data-ftab="friends">Friends <span class="tiny">${friends.length || 0}</span></button>
        <button class="chip ${tab === "requests" ? "on" : ""}" data-ftab="requests">Requests ${incoming.length ? `<span class="badge">${incoming.length > 99 ? "99+" : incoming.length}</span>` : ""}</button>
        <button class="chip ${tab === "suggested" ? "on" : ""}" data-ftab="suggested">Suggested</button>
      </div>
      ${tab === "requests" ? `<h2 class="section-title">Incoming requests</h2>${requestRows.map((u) => `<div class="list-item people-row">
        ${personIdentity(u, "wants to connect")}
        <span class="row"><button type="button" class="ok" data-acc="${esc(u.id)}">${iconAsset("check-circle")}<span>Accept</span></button><button type="button" class="ghost" data-dec="${esc(u.id)}">${iconAsset("close-circle")}<span>Decline</span></button></span>
      </div>`).join("") || `<p class="muted">${query ? "No requests match your search." : "No pending requests."}</p>`}` : ""}
      ${tab === "friends" ? `<h2 class="section-title">Your friends <span class="tiny">${friendRows.length}</span></h2>${friendRows.map((u) => `<div class="list-item people-row">
        ${personIdentity(u, presenceLine(u) || "Friend")}
        <span class="row"><button type="button" class="ghost" data-message-user="${esc(u.id)}">${iconAsset("chat-round-dots")}<span>Message</span></button><button type="button" class="ghost" data-profile-user="${esc(u.id)}">${iconAsset("user-circle")}<span>Profile</span></button></span>
      </div>`).join("") || `<div class="card empty-state"><b>${query ? "No friends match" : "Your people are waiting"}</b><p class="muted">${query ? "Try another name, or search all of Uxaoro." : "Add someone by username or find people to start building your network."}</p><div class="row"><button type="button" class="ghost" data-ftab="suggested">${iconAsset("users-group-two-rounded")}<span>See suggestions</span></button><button type="button" data-go="search">${iconAsset("users-group-two-rounded")}<span>Find people</span></button></div></div>`}` : ""}
      ${tab === "suggested" ? `<h2 class="section-title">People you may know</h2>${suggestionRows.map((u) => `<div class="list-item people-row">
        ${personIdentity(u, "Suggested for you")}
        <span class="row"><button type="button" class="ghost" data-profile-user="${esc(u.id)}">${iconAsset("user-circle")}<span>Profile</span></button>${u.friend_status === "pending_out" ? `<button type="button" class="ghost" disabled>${iconAsset("check-circle")}<span>Request sent</span></button>` : u.friend_status === "friends" ? `<button type="button" class="ghost" disabled>${iconAsset("check-circle")}<span>Friends</span></button>` : `<button type="button" data-req="${esc(u.id)}">${iconAsset("user-plus")}<span>Add</span></button>`}</span>
      </div>`).join("") || `<p class="muted">${query ? "No suggestions match your search." : "No suggestions right now."}</p>`}` : ""}
      ${tab === "requests" && outgoingRows.length ? `<h2 class="section-title outgoing-title">Outgoing requests</h2>${outgoingRows.map((u) => `<div class="list-item people-row">
        ${personIdentity(u, "Request sent")}
        <span class="tiny">Pending${u.__pending ? " · sending…" : ""}</span>
      </div>`).join("")}` : ""}
    `))) return;
    bindSocial($("#root"));
    document.querySelectorAll("[data-ftab]").forEach((n) => n.onclick = () => go("friends", { tab: n.getAttribute("data-ftab"), q: query }, "friends"));
    const runFilter = () => go("friends", { tab, q: $("#people-q").value.trim() }, "friends");
    $("#people-filter").onclick = runFilter;
    $("#people-q").onkeydown = (e) => { if (e.key === "Enter") runFilter(); };
    const clear = $("#people-clear");
    if (clear) clear.onclick = () => go("friends", { tab }, "friends");
    $("#by-go").onclick = async () => {
      const uname = $("#by-user").value.trim().replace(/^@/, "");
      if (!uname) return;
      const lid = Optim.localId("fr");
      const undo = Optim.create("friend_outgoing", { id: lid, __localId: lid, username: uname, display_name: uname });
      const res = await localFirst("Send friend request", () => undo,
        () => api("/friends/request-by-username", { method: "POST", body: { username: uname } }));
      if (res && res.user_id) Optim.confirm("friend_outgoing", lid, res.user_id);
    };
    $("#by-user").onkeydown = (e) => { if (e.key === "Enter") $("#by-go").click(); };
    document.querySelectorAll("[data-message-user]").forEach((button) => button.onclick = async (e) => {
      e.stopPropagation();
      const uid = button.getAttribute("data-message-user");
      button.disabled = true;
      try {
        const chat = await api("/chats", { method: "POST", body: { user_ids: [uid] } });
        go("chat", { id: chat.id }, "messages");
      } catch (err) { button.disabled = false; alert(err.message || "Could not open this chat"); }
    });
    document.querySelectorAll("[data-profile-user]").forEach((button) => button.onclick = () => go("user", { id: button.getAttribute("data-profile-user") }));
    document.querySelectorAll("[data-acc]").forEach((n) => n.onclick = async () => {
      const uid = n.getAttribute("data-acc");
      await localFirst("Accept friend request", () => {
        const undoRow = Optim.remove("friend_requests", uid);
        const undoUser = Optim.patch("users", uid, { friend_status: "friends", is_friend: true });
        return () => { undoRow(); undoUser(); };
      }, () => api("/friends/accept/" + uid, { method: "POST" }));
    });
    document.querySelectorAll("[data-dec]").forEach((n) => n.onclick = async () => {
      const uid = n.getAttribute("data-dec");
      await localFirst("Decline friend request", () => {
        const undoRow = Optim.remove("friend_requests", uid);
        const undoUser = Optim.patch("users", uid, { friend_status: "none", is_friend: false });
        return () => { undoRow(); undoUser(); };
      }, () => api("/friends/decline/" + uid, { method: "POST" }));
    });
    document.querySelectorAll("[data-req]").forEach((n) => n.onclick = async () => {
      const uid = n.getAttribute("data-req");
      await localFirst("Friend request", () => Optim.patch("users", uid, { friend_status: "pending_out" }),
        () => api("/friends/request/" + uid, { method: "POST" }));
    });
  }

  async function viewChats() {
    const my = ACTIVE;
    let chats = cacheGet("chats", []);
    try {
      // Make sure the Saved Messages chat exists so it always shows here.
      await ensureSavedChat().catch(() => null);
      chats = Optim.merge("chats", await api("/chats"));
      cacheSet("chats", chats);
    } catch (_) {}
    const query = (S.params.q || "").trim().toLowerCase();
    const chatFilter = ["unread", "direct", "groups", "saved"].includes(S.params.filter) ? S.params.filter : "all";
    const matchesType = (c) => {
      if (chatFilter === "unread") return Number(c.unread || 0) > 0;
      if (chatFilter === "saved") return c.kind === "saved";
      if (chatFilter === "groups") return !!c.is_group && c.kind !== "saved";
      if (chatFilter === "direct") return !c.is_group && c.kind !== "saved";
      return true;
    };
    const shown = (chats || []).filter((c) => {
      if (!matchesType(c)) return false;
      if (!query) return true;
      const other = (c.members || []).find((m) => S.me && m.id !== S.me.id);
      const title = c.kind === "saved" ? "Saved Messages" : c.is_group ? (c.title || "Group") : nameOf(other);
      return title.toLowerCase().includes(query) || (c.members || []).some((m) => (m.username || "").toLowerCase().includes(query));
    });
    // Saved Messages first, like a pinned chat.
    shown.sort((a, b) => (b.kind === "saved") - (a.kind === "saved"));
    const chatFilters = [["all", "All"], ["unread", "Unread"], ["direct", "Direct"], ["groups", "Groups"], ["saved", "Saved"]].map(([key, label]) =>
      `<button type="button" class="chip ${chatFilter === key ? "on" : ""}" data-chat-filter="${key}" aria-pressed="${chatFilter === key}">${label}</button>`
    ).join("");
    if (!paintRoot(my, shell(`
      <div class="row spread"><div><h1 class="h1">Wire</h1><p class="tiny">Private conversations, protected by end-to-end encryption.</p></div><div class="row"><button class="ghost" id="new-dm">${iconAsset("chat-round-dots")}<span>New DM</span></button><button class="ghost" id="new-group">${ico("people")}<span>New group</span></button></div></div>
      <div class="card row chat-search-row">
        <input id="chat-q" placeholder="Search chats and people" aria-label="Search chats" value="${esc(S.params.q || "")}">
        <button type="button" class="ghost" id="chat-search">${ico("search")}<span>Search</span></button>
        ${S.params.q ? `<button type="button" class="ghost" id="chat-clear" aria-label="Clear chat search" title="Clear chat search">${iconAsset("close-circle")}</button>` : ""}
      </div>
      <div class="chat-filters" role="tablist" aria-label="Filter conversations">${chatFilters}</div>
      <div class="chat-list">
      ${shown.map((c) => {
        const other = (c.members || []).find((m) => S.me && m.id !== S.me.id);
        const isSaved = c.kind === "saved";
        const title = isSaved ? "Saved Messages" : c.is_group ? (c.title || "Group") : nameOf(other);
        const flags = [c.pinned ? "Pinned" : "", c.muted ? "Muted" : ""].filter(Boolean).join(" · ");
        const presence = !isSaved && !c.is_group && other ? presenceLine(other) : "";
        const sub = isSaved ? "Your private chat with yourself" : c.is_group ? "Group conversation" : (presence || "Direct message");
        const subHtml = other && !c.is_group && !isSaved
          ? `<span data-presence="${esc(other.id)}" data-presence-keep="1" data-presence-fallback="Direct message">${esc(sub)}</span>`
          : esc(sub);
        const chatAvatar = isSaved
          ? `<div class="chat-list-avatar saved-chat-avatar">${iconAsset("bookmark")}</div>`
          : c.is_group
            ? `<div class="chat-list-avatar group-chat-avatar">${ico("people")}</div>`
            : avatar(other || {});
        return `<div class="list-item chat-list-item" data-chat="${esc(c.id)}" role="button" tabindex="0" aria-label="Open ${esc(title)}">
          ${chatAvatar}
          <div class="chat-list-copy">
            <div class="row spread"><b>${esc(title)}</b>${c.unread ? `<span class="badge">${c.unread > 99 ? "99+" : c.unread}</span>` : ""}</div>
            <div class="tiny">${subHtml}${flags ? " · " + flags : ""}</div>
          </div>
          <span class="tiny chat-list-hint">${isSaved ? "Private" : c.is_group ? "Group" : "E2EE"}</span>
        </div>`;
      }).join("") || `<div class="card empty-state"><b>${query || chatFilter !== "all" ? "No conversations match" : "Your inbox is empty"}</b><p class="muted">Start a direct message, create a group, or open Saved Messages.</p><div class="row"><button type="button" id="empty-new-dm">${iconAsset("chat-round-line")}<span>New DM</span></button><button type="button" class="ghost" id="empty-saved">${iconAsset("bookmark")}<span>Saved Messages</span></button></div></div>`}
      </div>
    `))) return;
    bindSocial($("#root"));
    $("#new-group").onclick = () => go("newgroup", {}, "messages");
    $("#new-dm").onclick = () => go("newchat", {}, "messages");
    const searchChats = () => go("messages", { q: $("#chat-q").value.trim(), filter: chatFilter }, "messages");
    $("#chat-search").onclick = searchChats;
    $("#chat-q").onkeydown = (e) => { if (e.key === "Enter") searchChats(); };
    const clearSearch = $("#chat-clear");
    if (clearSearch) clearSearch.onclick = () => go("messages", { filter: chatFilter }, "messages");
    document.querySelectorAll("[data-chat-filter]").forEach((button) => button.onclick = () =>
      go("messages", { q: query, filter: button.getAttribute("data-chat-filter") }, "messages"));
    const emptyNewDm = $("#empty-new-dm");
    if (emptyNewDm) emptyNewDm.onclick = () => go("newchat", {}, "messages");
    const emptySaved = $("#empty-saved");
    if (emptySaved) emptySaved.onclick = () => openSavedChat();
  }

  async function viewNewChat() {
    const my = ACTIVE;
    const friends = await api("/friends").catch(() => cacheGet("friends", []));
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">New message</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      <button class="ghost" data-go="newgroup">${iconAsset("add-square")}<span>Create a group</span></button>
      <p class="tiny">End-to-end encrypted. Pick a friend.</p>
      ${(friends || []).map((u) => `<div class="list-item" data-pick="${esc(u.id)}">${esc(nameOf(u))} <span class="tiny">@${esc(u.username)}</span></div>`).join("") || `<p class="muted">No friends yet.</p>`}
    `))) return;
    $("#back").onclick = () => go("messages", {}, "messages");
    document.querySelectorAll("[data-pick]").forEach((n) => n.onclick = async () => {
      // The tap is acknowledged at once (the row greys out) instead of looking
      // dead while the chat is created; a failure says so and re-enables it.
      if (n.getAttribute("data-busy") === "1") return;
      n.setAttribute("data-busy", "1");
      n.style.opacity = ".55";
      const res = await localFirst("Open chat", () => null,
        () => api("/chats", { method: "POST", body: { user_ids: [n.getAttribute("data-pick")] } }), { repaint: false });
      n.style.opacity = "";
      n.setAttribute("data-busy", "");
      if (res && res.id) go("chat", { id: res.id }, "messages");
    });
  }

  async function viewNewGroup() {
    const my = ACTIVE;
    const friends = await api("/friends").catch(() => cacheGet("friends", []));
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">New group</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      <div class="card">
        <input id="gtitle" placeholder="Group name">
        <div style="height:8px"></div>
        <button id="create" disabled>${iconAsset("add-circle")}<span>Create</span></button>
      </div>
      ${(friends || []).map((u) => `<label class="list-item row"><input type="checkbox" data-uid="${esc(u.id)}" style="width:auto"> ${esc(nameOf(u))} <span class="tiny">@${esc(u.username)}</span></label>`).join("")}
    `))) return;
    $("#back").onclick = () => go("messages", {}, "messages");
    const sync = () => {
      const ids = [...document.querySelectorAll("[data-uid]:checked")].map((n) => n.getAttribute("data-uid"));
      $("#create").disabled = !$("#gtitle").value.trim() || !ids.length;
    };
    document.querySelectorAll("[data-uid]").forEach((n) => n.onchange = sync);
    $("#gtitle").oninput = sync;
    $("#create").onclick = async () => {
      const ids = [...document.querySelectorAll("[data-uid]:checked")].map((n) => n.getAttribute("data-uid"));
      const btn = $("#create");
      btn.disabled = true;
      btn.textContent = "Creating…";
      const res = await localFirst("Create group", () => null,
        () => api("/chats", { method: "POST", body: { user_ids: ids, title: $("#gtitle").value.trim() } }), { repaint: false });
      btn.textContent = "Create";
      btn.disabled = false;
      if (res && res.id) go("chat", { id: res.id }, "messages");
    };
  }

  const b64ToU8 = (s) => {
    const bin = atob(s || "");
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  };

  // Download + decrypt an E2EE chat attachment, returning an object URL.
  // Returns null for legacy plaintext media (no media_nonce) / failures.
  async function decryptMsgMedia(m, meId) {
    if (!m || !m.media_nonce || !(m.media_url || m.image_url)) return null;
    if (S.mediaCache.has(m.id)) return S.mediaCache.get(m.id);
    try {
      const res = await fetch(media(m.media_url || m.image_url), S.token ? { headers: { Authorization: "Bearer " + S.token } } : undefined);
      if (!res.ok) return null;
      const pt = await CryptoApp.decryptBytes(new Uint8Array(await res.arrayBuffer()), m.media_nonce, m.keys_json, meId);
      if (!pt) return null;
      const objUrl = URL.createObjectURL(new Blob([pt], { type: m.media_mime || "application/octet-stream" }));
      S.mediaCache.set(m.id, objUrl);
      if (S.mediaCache.size > 60) {
        const oldest = S.mediaCache.keys().next().value;
        try { URL.revokeObjectURL(S.mediaCache.get(oldest)); } catch (_) {}
        S.mediaCache.delete(oldest);
      }
      return objUrl;
    } catch (_) {
      return null;
    }
  }

  function bubbleHtml(m, text, blobUrl) {
    const mine = S.me && m.sender_id === S.me.id;
    let parts = { text: String(text || ""), media_url: m.media_url || m.image_url || "", media_type: m.media_type || "", media_mime: m.media_mime || "", sticker_id: m.sticker_id || "", sticker: m.sticker || null };
    try {
      if (window.UxaMedia && UxaMedia.parseMsgPayload) {
        // `text` here is already decrypted; plaintext columns are fallback.
        parts = UxaMedia.parseMsgPayload(text, m);
      }
    } catch (_) {}
    if (blobUrl) parts = Object.assign({}, parts, { media_url: blobUrl });
    let mediaHtml = "";
    try { if (window.UxaMedia && UxaMedia.msgMediaHtml) mediaHtml = UxaMedia.msgMediaHtml(parts); } catch (_) {}
    const isSticker = !!(mediaHtml && (parts.sticker || parts.media_type === "sticker" || (parts.sticker_id && mediaHtml.includes("sticker"))));
    const isWebmSticker = isSticker && (mediaHtml && (mediaHtml.includes(".webm") || mediaHtml.includes("video/webm")));
    const bodyText = parts.text || "";
    let bigEmoji = "";
    try {
      if (!mediaHtml && window.UxaMedia && UxaMedia.isSingleEmoji && UxaMedia.isSingleEmoji(bodyText)) {
        bigEmoji = `<div class="sticker-msg">${esc(bodyText)}</div>`;
      }
    } catch (_) {}
    const bubbleCls = isWebmSticker ? "bubble sticker-no-bg" : (mine ? "me" : "them");
    const saveLink = isSticker ? `<a class="sticker-save" onclick="saveStickerToFav('${esc(m.sticker_id || m.id)}')">★ Save</a>` : "";
    // Forwarded-from header (posts forwarded into Saved Messages).
    const fwd = parts.forward && (parts.forward.post_id || parts.forward.author)
      ? `<div class="fwd-head" ${parts.forward.post_id ? `data-fwdpost="${esc(parts.forward.post_id)}"` : ""} title="${parts.forward.post_id ? "Open original post" : ""}">↪ Forwarded from <b>${esc(parts.forward.author || "Uxaoro")}</b></div>`
      : "";
    const reactState = ` data-reacts="${esc(JSON.stringify(m.reactions || []))}" data-mine="${esc(m.my_reaction || "")}"`;
    return `<div class="bubble ${bubbleCls}" data-mid="${esc(m.id)}"${reactState}>
      ${fwd}
      ${mediaHtml}
      ${bigEmoji || (bodyText ? `<div class="body">${esc(bodyText)}</div>` : "")}
      <div class="tiny">${esc(when(m.created_at))}${mine ? " · Sent" : ""} ${mine ? `<a data-unsend="${esc(m.id)}">Unsend</a>` : ""} <a data-copy="${esc(m.id)}">Copy</a> ${saveLink}</div>
      ${reactRow(m.id, m.reactions, m.my_reaction, true)}
    </div>`;
  }

  // Message ids currently being painted. paintBubble() is async (decrypt
  // awaits), so the same message can arrive twice almost simultaneously
  // (POST response + WebSocket echo). The DOM check alone is racy — this set
  // closes the window so a bubble is only ever inserted once.
  const paintingMids = new Set();

  async function paintBubble(m) {
    const thread = $("#thread");
    if (!thread) return;
    if (!m || !m.id) return;
    if (paintingMids.has(m.id)) return;
    if (thread.querySelector(`[data-mid="${cssEsc(m.id)}"]`)) return;
    paintingMids.add(m.id);
    try {
      const meId = S.me && S.me.id;
      let raw = "";
      try { raw = await CryptoApp.decrypt(m.ciphertext, m.nonce, m.keys_json, meId); } catch (_) { raw = ""; }
      // Sticker / media messages may legitimately have empty ciphertext on some
      // legacy rows — fall back to plaintext columns instead of an error wall.
      let text = raw;
      if ((text == null || text === "") && (m.media_url || m.image_url || m.sticker_id || m.sticker)) text = "";
      if (text == null || (text === "" && !m.media_url && !m.image_url && !m.sticker_id && !m.sticker)) text = "Unable to decrypt. Missing key.";
      const blobUrl = await decryptMsgMedia(m, meId);
      if (thread.querySelector(`[data-mid="${cssEsc(m.id)}"]`)) return;
      thread.insertAdjacentHTML("beforeend", bubbleHtml(m, text || "", blobUrl));
      thread.scrollTop = thread.scrollHeight;
      bindChatExtras(thread);
    } finally {
      paintingMids.delete(m.id);
    }
  }

  function bindChatExtras(el) {
    bindReacts(el);
    try { if (window.UxaMedia && UxaMedia.bindMedia) UxaMedia.bindMedia(el); } catch (_) {}
    el.querySelectorAll("[data-unsend]").forEach((n) => n.onclick = async () => {
      const mid = n.getAttribute("data-unsend");
      const bubble = document.querySelector(`[data-mid="${cssEsc(mid)}"]`);
      const body = bubble ? bubble.querySelector(".body") : null;
      const previous = body ? body.textContent : "";
      await localFirst("Delete message", () => {
        // The bubble is emptied immediately; a refusal restores the text.
        if (body) body.textContent = "Message deleted";
        return () => { if (body) body.textContent = previous; };
      }, () => api("/chats/" + S.params.id + "/messages/" + mid, { method: "DELETE" }), { repaint: false });
    });
    el.querySelectorAll("[data-copy]").forEach((n) => n.onclick = () => {
      const b = document.querySelector(`[data-mid="${cssEsc(n.getAttribute("data-copy"))}"] .body`);
      if (b) navigator.clipboard.writeText(b.textContent).catch(() => {});
    });
    el.querySelectorAll("[data-fwdpost]").forEach((n) => n.onclick = (e) => {
      e.stopPropagation();
      go("post", { id: n.getAttribute("data-fwdpost") });
    });
  }

  async function viewChat(id) {
    const my = ACTIVE;
    const chat = await api("/chats/" + id);
    S.liveChat = chat;
    S.chatAttach = null;
    let page = cacheGet("msgs_" + id, { items: [] });
    try { page = await api("/chats/" + id + "/messages"); cacheSet("msgs_" + id, page); } catch (_) {}
    const meId = S.me.id;
    const other = (chat.members || []).find((m) => m.id !== meId);
    const isSavedChat = chat.kind === "saved";
    const title = isSavedChat ? "Saved Messages" : chat.is_group ? (chat.title || "Group") : nameOf(other);
    const decrypted = [];
    for (const m of page.items || []) {
      let raw = "";
      try { raw = await CryptoApp.decrypt(m.ciphertext, m.nonce, m.keys_json, meId); } catch (_) { raw = ""; }
      let text = raw;
      if ((text == null || text === "") && (m.media_url || m.image_url || m.sticker_id || m.sticker)) text = "";
      if (text == null || (text === "" && !m.media_url && !m.image_url && !m.sticker_id && !m.sticker)) text = "Unable to decrypt. Missing key.";
      const blob = await decryptMsgMedia(m, meId);
      decrypted.push({ m, text: text || "", blob });
    }
    cacheSet("plain_" + id, decrypted.map((d) => ({ id: d.m.id, text: d.text, created_at: d.m.created_at, me: d.m.sender_id === meId })));
    const draft = localStorage.getItem("uxa_draft_" + id) || "";
    if (!paintRoot(my, shell(`
      <div class="chat-wrap">
      <div class="row spread">
        <h1 class="h1">${esc(title)}</h1>
        <div class="row">
          ${!chat.is_group && other ? `<button class="ghost" id="audio-call">${ico("phone")}<span>Call</span></button>
          <button class="ghost" id="video-call">${ico("video")}<span>Video</span></button>` : ""}
          <button class="ghost" id="chat-info">${iconAsset("info-circle")}<span>Info</span></button>
        </div>
      </div>
      <p class="tiny">${!chat.is_group && other && presenceLine(other) ? `<span data-presence="${esc(other.id)}">${esc(presenceLine(other))}</span> · ` : (!chat.is_group && other ? `<span class="hidden" data-presence="${esc(other.id)}"></span>` : "")}${isSavedChat ? "Your private space — only you can see it" : "Locked with E2EE"} · ${esc(chat.my_role || "member")}${chat.pinned ? " · pinned" : ""}${chat.muted ? " · muted" : ""}</p>
      <div id="thread">${decrypted.map((d) => bubbleHtml(d.m, d.text, d.blob)).join("")}</div>
      <div id="typing" class="typing hidden">typing…</div>
      <div id="chat-attach-preview"></div>
      <div class="chat-foot">
        <button class="ghost" id="attach" aria-label="Attach a photo, video or music" title="Photo / video / music">${iconAsset("paperclip")}</button>
        <button class="ghost" id="smile-btn" title="Smiles">${iconAsset("sticker-smile-circle")}</button>
        <div id="quick-stick" class="quick-stickers"></div>
        <input id="msg" placeholder="Encrypted message" value="${esc(draft)}">
        <button id="send">${ico("envelope")}<span>Send</span></button>
      </div>
      </div>
    `, "chat-full"))) return;
    const thread = $("#thread");
    if (thread) thread.scrollTop = thread.scrollHeight;
    try {
      if (window.UxaMedia && UxaMedia.StickerStore && UxaMedia.StickerStore.loadFavorites) {
        UxaMedia.StickerStore.loadFavorites().then((favs) => {
          const q = $("#quick-stick");
          if (!q) return;
          q.innerHTML = (favs || []).slice(0, 5).map((s) =>
            `<button type="button" class="quick-sticker" data-qsid="${esc(s.id)}" data-qsurl="${esc(s.image_url || "")}" title="Send favorite sticker">${s.image_url ? `<img src="${esc(media(s.image_url))}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle">` : "⭐"}</button>`
          ).join("");
          q.querySelectorAll("[data-qsid]").forEach((btn) => {
            btn.onclick = () => sendSticker(chat, { sticker_id: btn.getAttribute("data-qsid"), media_url: btn.getAttribute("data-qsurl") || "" });
          });
        });
      }
    } catch (_) {}
    bindChatExtras($("#root"));
    const paintAttach = () => {
      const box = $("#chat-attach-preview");
      if (!box) return;
      const a = S.chatAttach;
      if (!a) { box.innerHTML = ""; return; }
      // Local File attachment: preview straight from the local blob —
      // nothing is uploaded until Send, and then only ciphertext.
      const localUrl = a.file ? URL.createObjectURL(a.file) : "";
      const kind = (window.UxaMedia && UxaMedia.kindOf ? UxaMedia.kindOf(a.media_url || (a.file && a.file.name) || "", a.media_type, a.media_mime) : "");
      const prev = a.sticker_id ? `<div class="tiny">Sticker attached</div>`
        : kind === "video" ? `<video src="${esc(localUrl)}" muted></video>`
        : kind === "audio" ? `<div class="tiny">${iconAsset("music-note")} audio attached</div>`
        : `<img src="${esc(localUrl)}" alt="">`;
      box.innerHTML = `<div class="attach-preview">${prev}<span class="tiny">${esc(a.media_type || kind || "file")}</span><button class="ghost" id="attach-clear" aria-label="Remove attachment" title="Remove attachment">${iconAsset("close-circle")}</button></div>`;
      const c = $("#attach-clear");
      if (c) c.onclick = () => { S.chatAttach = null; paintAttach(); };
      try { if (window.UxaMedia && UxaMedia.bindMedia) UxaMedia.bindMedia(box); } catch (_) {}
    };
    $("#send").onclick = () => sendMsg(chat);
    $("#attach").onclick = async () => {
      try {
        const f = await UxaMedia.pickMedia();
        if (!f) return;
        let fileToUpload = f;
        // Photos go through the built-in editor (Telegram-style).
        if (f.type.startsWith("image/")) {
          const ed = await UxaMedia.openPhotoEditor(f, { title: "Edit photo" });
          if (!ed) return;
          fileToUpload = ed.file;
        }
        // Keep the file locally; it is encrypted + uploaded on Send.
        const mt = (fileToUpload.type || "").toLowerCase();
        S.chatAttach = {
          file: fileToUpload,
          media_url: "",
          media_type: mt.startsWith("video/") ? "video" : mt.startsWith("audio/") ? "audio" : "image",
          media_mime: mt,
        };
        paintAttach();
      } catch (e) { alert(e.message); }
      finally { const s = $("#send"); if (s) s.disabled = false; }
    };
    $("#smile-btn").onclick = () => {
      UxaMedia.openStickerSheet(async (pick) => {
        if (pick.sticker_id) {
          await sendSticker(chat, { sticker_id: pick.sticker_id, media_url: pick.image_url || "" });
        } else if (pick.emoji) {
          const inp = $("#msg");
          if (inp) { inp.value = (inp.value + " " + pick.emoji).trim() + " "; inp.focus(); }
        }
      });
    };
    $("#msg").oninput = () => {
      const v = $("#msg").value;
      if (v) localStorage.setItem("uxa_draft_" + id, v);
      else localStorage.removeItem("uxa_draft_" + id);
    };
    $("#msg").onkeydown = (e) => {
      if (e.key === "Enter") { e.preventDefault(); sendMsg(chat); }
      wsSend("typing", { chat_id: id });
    };
    const ac = $("#audio-call"); if (ac) ac.onclick = () => startCall(chat, other, false);
    const vc = $("#video-call"); if (vc) vc.onclick = () => startCall(chat, other, true);
    $("#chat-info").onclick = () => go("chatinfo", { id }, "messages");
  }

  async function sendMsg(chat, presetAttach) {
    const input = $("#msg");
    const text = ((input && input.value) || "").trim();
    const attach = presetAttach || S.chatAttach || null;
    if (!text && !attach) return;
    // In-flight guard: prevents double-clicks, double-Enter, or key-repeat
    // from firing the same send twice (the "multiple copies" bug).
    if (S.msgSending) return;
    S.msgSending = true;
    const sendBtn = $("#send");
    if (sendBtn) sendBtn.disabled = true;
    // Idempotency key: the server stores it with the message and refuses to
    // create a second row for the same (chat, sender, client_id). This keeps
    // a retried send (flaky network / token refresh) from duplicating.
    let clientId = "";
    try {
      clientId = (window.crypto && typeof window.crypto.randomUUID === "function")
        ? window.crypto.randomUUID()
        : ("m-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12));
    } catch (_) {
      clientId = "m-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    }
    // Local-first: the bubble lands in the thread now, marked pending, so the
    // user never watches a spinner for their own message. The encryption and
    // the POST happen behind it; a failure removes the bubble and restores the
    // draft (with the attachment) so nothing is lost.
    const threadEl = $("#thread");
    const optimisticMid = "optim:" + clientId;
    const localPreview = attach
      ? (attach.file ? URL.createObjectURL(attach.file) : (attach.media_url || ""))
      : "";
    const optimisticBubble = (() => {
      if (!threadEl || !S.me) return null;
      const shellMsg = Object.assign(
        { id: optimisticMid, sender_id: S.me.id, created_at: new Date().toISOString() },
        attach ? { media_url: localPreview, media_type: attach.media_type || "", media_mime: attach.media_mime || "" } : {},
        attach && attach.sticker_id ? { sticker_id: attach.sticker_id, media_type: "sticker" } : {},
      );
      threadEl.insertAdjacentHTML("beforeend", bubbleHtml(shellMsg, text, localPreview || null));
      const el = threadEl.querySelector(`[data-mid="${cssEsc(optimisticMid)}"]`);
      if (el) el.classList.add("pending");
      threadEl.scrollTop = threadEl.scrollHeight;
      if (input) input.value = "";
      return el;
    })();
    const dropOptimistic = () => {
      if (optimisticBubble && optimisticBubble.parentNode) optimisticBubble.parentNode.removeChild(optimisticBubble);
      if (localPreview && localPreview.startsWith("blob:")) {
        try { URL.revokeObjectURL(localPreview); } catch (_) {}
      }
    };
    try {
      const pubs = {};
      pubs[S.me.id] = CryptoApp.publicPem();
      for (const u of chat.members || []) {
        try {
          const pk = await api("/users/" + u.id + "/pubkey");
          if (pk.pubkey) pubs[u.id] = pk.pubkey;
        } catch (_) {}
      }
      let payload = text;
      let msgType = "text";
      let extra = {};
      let fileBytes = null;
      if (attach) {
        if (attach.sticker_id) {
          msgType = "sticker";
          extra = { sticker_id: attach.sticker_id, media_url: attach.media_url || "", media_type: "sticker" };
          payload = UxaMedia.packMsgPayload(text, extra);
        } else if (attach.file) {
          // E2EE attachment: the file is encrypted with the message key (own
          // nonce) and only the ciphertext is uploaded.
          msgType = attach.media_type === "video" ? "video" : attach.media_type === "audio" ? "audio" : "image";
          fileBytes = new Uint8Array(await attach.file.arrayBuffer());
        } else if (attach.media_url) {
          msgType = attach.media_type === "video" ? "video" : attach.media_type === "audio" ? "audio" : attach.media_type === "sticker" ? "sticker" : "image";
          extra = { media_url: attach.media_url, media_type: attach.media_type || msgType, media_mime: attach.media_mime || "" };
          payload = UxaMedia.packMsgPayload(text, extra);
        }
      }
      const enc = await CryptoApp.encryptBundle(payload, pubs, fileBytes);
      if (attach && attach.file && enc.media_ct) {
        const saved = await UxaMedia.uploadEncrypted(b64ToU8(enc.media_ct), msgType, attach.media_mime || "", "chat");
        extra = { media_url: saved.url, media_type: attach.media_type || msgType, media_mime: attach.media_mime || "" };
      }
      const sent = await api("/chats/" + chat.id + "/messages", {
        method: "POST",
        body: Object.assign({ client_id: clientId, msg_type: msgType, ciphertext: enc.ciphertext, nonce: enc.nonce, keys_json: enc.keys_json, media_nonce: enc.media_nonce || "" }, extra),
      });
      dropOptimistic();
      if (input) input.value = "";
      localStorage.removeItem("uxa_draft_" + chat.id);
      S.chatAttach = null;
      const prev = $("#chat-attach-preview");
      if (prev) prev.innerHTML = "";
      await paintBubble(sent);
    } catch (e) {
      // Roll the optimistic bubble back and hand the draft back for a retry.
      dropOptimistic();
      if (input && text && !input.value) input.value = text;
      if (attach) {
        S.chatAttach = attach;
        try { if (typeof paintAttach === "function") paintAttach(); } catch (_) {}
      }
      reportActionFailure("Send message", e);
      const errEl = $("#f-err");
      if (errEl) errEl.textContent = (e && e.message) || "Message failed to send";
    } finally {
      S.msgSending = false;
      const btn = $("#send");
      if (btn) btn.disabled = false;
    }
  }

  async function sendSticker(chat, pick) {
    await sendMsg(chat, pick);
  }

  async function viewChatInfo(id) {
    const my = ACTIVE;
    const chat = await api("/chats/" + id);
    // Member-list edits are overlaid so a refetch that has not caught up yet
    // cannot drop a member the user just added (or bring one back they removed).
    const memberKind = "chat_members:" + id;
    chat.members = Optim.merge(memberKind, chat.members || [], (m) => m && m.id);
    const meId = S.me.id;
    const other = (chat.members || []).find((m) => m.id !== meId);
    const isSavedChat = chat.kind === "saved";
    const heading = isSavedChat ? "Saved Messages" : chat.is_group ? (chat.title || "Group") : nameOf(other);
    const canAdmin = chat.my_role === "owner" || chat.my_role === "admin";
    const canInvite = canAdmin || (chat.is_group && chat.members_can_invite);
    if (!paintRoot(my, shell(`
      <h1 class="h1">${esc(heading)}</h1>
      <div class="card">
        <div class="row spread"><span>Pin chat</span><button class="ghost" id="pin">${iconAsset("pin")}<span>${chat.pinned ? "Unpin" : "Pin"}</span></button></div>
        <div class="row spread"><span>Mute</span><button class="ghost" id="mute">${iconAsset(chat.muted ? "volume-cross" : "volume-loud")}<span>${chat.muted ? "Unmute" : "Mute"}</span></button></div>
        <p class="tiny">${isSavedChat ? "Your private chat with yourself · E2EE" : chat.is_group ? "Group · E2EE · you: " + esc(chat.my_role || "member") : "Direct message · E2EE"}</p>
      </div>
      ${chat.is_group && canInvite ? `<div class="card">
        <b>Invite link</b>
        <p class="tiny">Share the link — anyone with it can join this group.</p>
        <div class="row" style="margin-top:8px">
          <button class="ghost" id="inv-share">${ico("share")}<span>Share link</span></button>
          <button class="ghost" id="inv-copy">${iconAsset("copy")}<span>Copy link</span></button>
          ${canAdmin ? `<button class="ghost" id="inv-revoke">${iconAsset("link-broken")}<span>Revoke</span></button>` : ""}
        </div>
      </div>` : ""}
      ${chat.is_group && canAdmin ? `<div class="card"><input id="gtitle" value="${esc(chat.title || "")}" placeholder="Group name"><div style="height:8px"></div><button id="rename">${iconAsset("pen")}<span>Rename</span></button>
        <div style="height:8px"></div>
        <button class="ghost" id="invites">${iconAsset("user-plus")}<span>Members can invite · ${chat.members_can_invite ? "on" : "off"}</span></button>
      </div>` : ""}
      ${chat.is_group && canInvite ? `<div class="card row"><input id="addn" placeholder="Add by username"><button id="add">${iconAsset("user-plus")}<span>Add</span></button></div>` : ""}
      <h3>Members</h3>
      ${(chat.members || []).map((u) => {
        const role = u.community_role || "member";
        return `<div class="list-item row spread">
          <span data-user="${esc(u.id)}">${esc(nameOf(u))} <span class="tiny">@${esc(u.username)} · ${esc(role)}${u.__pending ? '<span class="pending-note"> · sending…</span>' : ""}</span></span>
          ${chat.is_group && canAdmin && u.id !== meId && role !== "owner" ? `<span>
            ${chat.my_role === "owner" ? `<button class="ghost" data-crole="${esc(u.id)}" data-role="${esc(role)}">${iconAsset("shield-user")}<span>${role === "admin" ? "Demote" : "Admin"}</span></button>` : ""}
            <button class="ghost" data-rm="${esc(u.id)}">${iconAsset("user-cross")}<span>Remove</span></button>
          </span>` : ""}
        </div>`;
      }).join("")}
      ${chat.is_group && chat.my_role !== "owner" ? `<button class="ghost" id="leave-g">${iconAsset("exit")}<span>Leave group</span></button>` : ""}
      <button class="ghost" id="back-chat">${ico("back")}<span>Back to chat</span></button>
    `))) return;
    bindSocial($("#root"));
    $("#pin").onclick = async () => {
      const want = !chat.pinned;
      await localFirst(want ? "Pin chat" : "Unpin chat", () => Optim.patch("chats", id, { pinned: want }),
        () => api("/chats/" + id + "/pin", { method: "POST", body: { pinned: want } }));
    };
    $("#mute").onclick = async () => {
      const want = !chat.muted;
      await localFirst(want ? "Mute chat" : "Unmute chat", () => Optim.patch("chats", id, { muted: want }),
        () => api("/chats/" + id + "/mute", { method: "POST", body: { muted: want } }));
    };
    const rn = $("#rename");
    if (rn) rn.onclick = async () => {
      const title = $("#gtitle").value;
      await localFirst("Rename group", () => Optim.patch("chats", id, { title }),
        () => api("/chats/" + id, { method: "PATCH", body: { title } }));
    };
    const inv = $("#invites");
    if (inv) inv.onclick = async () => {
      const want = !chat.members_can_invite;
      await localFirst("Group setting", () => Optim.patch("chats", id, { members_can_invite: want }),
        () => api("/chats/" + id, { method: "PATCH", body: { members_can_invite: want } }));
    };
    const grabInvite = async () => (await api("/chats/" + id + "/invite-link")).url;
    const ish = $("#inv-share");
    if (ish) ish.onclick = async () => {
      try { await shareLink(await grabInvite(), chat.title || "Group", "Join my group on Uxaoro"); }
      catch (e) { alert(e.message); }
    };
    const icp = $("#inv-copy");
    if (icp) icp.onclick = async () => {
      try { const url = await grabInvite(); toast((await copyText(url)) ? "Link copied" : url, ""); }
      catch (e) { alert(e.message); }
    };
    const irv = $("#inv-revoke");
    if (irv) irv.onclick = async () => {
      if (!confirm("Revoke the current invite link? A new one will replace it.")) return;
      try {
        await api("/chats/" + id + "/invite-link/revoke", { method: "POST" });
        toast("Invite link revoked", "");
      } catch (e) { alert(e.message); }
    };
    const add = $("#add");
    if (add) add.onclick = async () => {
      const u = await api("/lookup/users/" + encodeURIComponent($("#addn").value.trim().replace(/^@/, "")));
      const lid = Optim.localId("chatm");
      const undo = Optim.create(memberKind, Object.assign({}, u, { __localId: lid, community_role: "member" }));
      Optim.confirm(memberKind, lid, u.id);
      await localFirst("Add member", () => undo, () => api("/chats/" + id + "/members", { method: "POST", body: { user_id: u.id } }));
    };
    document.querySelectorAll("[data-crole]").forEach((n) => n.onclick = async () => {
      const uid = n.getAttribute("data-crole");
      const next = n.getAttribute("data-role") === "admin" ? "member" : "admin";
      await localFirst("Change role", () => Optim.patch(memberKind, uid, { community_role: next }),
        () => api("/chats/" + id + "/members/" + uid + "/role", { method: "POST", body: { role: next } }));
    });
    document.querySelectorAll("[data-rm]").forEach((n) => n.onclick = async () => {
      const uid = n.getAttribute("data-rm");
      await localFirst("Remove member", () => Optim.remove(memberKind, uid),
        () => api("/chats/" + id + "/members/" + uid, { method: "DELETE" }));
    });
    const lg = $("#leave-g");
    if (lg) lg.onclick = async () => {
      const gone = await localFirst("Leave group", () => Optim.remove("chats", id),
        () => api("/chats/" + id + "/members/" + meId, { method: "DELETE" }));
      if (gone) go("messages", {}, "messages");
    };
    $("#back-chat").onclick = () => go("chat", { id }, "messages");
  }

  async function viewJoin(token) {
    const my = ACTIVE;
    let inv = null;
    try {
      inv = await api("/chats/invites/" + encodeURIComponent(token || ""));
    } catch (e) {
      if (!paintRoot(my, shell(`
        <div class="card" style="text-align:center">
          <h1 class="h1">Invite link</h1>
          <p class="err">${esc(e.message)}</p>
          <button class="ghost" data-go="feed">${ico("house")}<span>Go to feed</span></button>
        </div>
      `))) return;
      return;
    }
    if (!paintRoot(my, shell(`
      <div class="card" style="text-align:center">
        <h1 class="h1">${esc(inv.title)}</h1>
        <p class="muted">${inv.members_count} members</p>
        <p class="tiny">You are invited to this group on Uxaoro</p>
        <div class="row" style="justify-content:center;margin-top:8px">
          <button id="join-g">${iconAsset(inv.joined ? "chat-round-line" : "user-plus")}<span>${inv.joined ? "Open chat" : "Join group"}</span></button>
          <button class="ghost" data-go="feed">${iconAsset("close-circle")}<span>Not now</span></button>
        </div>
      </div>
    `))) return;
    const jg = $("#join-g");
    if (jg) jg.onclick = async () => {
      try {
        const chat = inv.joined
          ? { id: inv.chat_id }
          : await api("/chats/invites/" + encodeURIComponent(token || "") + "/join", { method: "POST" });
        go("chat", { id: chat.id || inv.chat_id }, "messages");
      } catch (e) { reportActionFailure("Join group", e); }
    };
  }

  function friendButtons(u) {
    const st = u.friend_status || "";
    if (st === "friends") return `<button class="ghost" id="unfr">${iconAsset("user-check-rounded")}<span>Friends</span></button>`;
    if (st === "pending_out") return `<button class="ghost" disabled>Request sent</button>`;
    if (st === "pending_in") return `<button id="fr-acc">${iconAsset("check-circle")}<span>Accept request</span></button>`;
    return `<button id="fr-them">${iconAsset("user-plus")}<span>Add friend</span></button>`;
  }

  // Premium customization helpers (applied to names/bios on profiles).
  function custStyle(u) {
    const c = (u && u.customization) || {};
    let s = "";
    if (c.name_color && /^#[0-9a-f]{6}$/.test(c.name_color)) s += `color:${c.name_color};`;
    if (c.name_style === "bold") s += "font-weight:800;";
    else if (c.name_style === "italic") s += "font-style:italic;";
    else if (c.name_style === "gradient") s += "background:linear-gradient(90deg,var(--coral),#7c6cff);-webkit-background-clip:text;background-clip:text;color:transparent;";
    if (c.glow) s += `text-shadow:0 0 8px var(--coral);`;
    return s;
  }
  const custBadge = (u) => {
    const premB = (u && u.customization && u.customization.badge) || "";
    const premPill = premB ? `<span class="nsfw-tag" style="background:var(--coral);color:#fff;margin-right:4px">${esc(premB)}</span>` : "";
    const badges = (u && Array.isArray(u.badges)) ? u.badges.filter((b) => b && b.applied !== false) : [];
    const userPills = badges.map((b) => {
      const tip = b.name ? (b.description ? `${b.name} — ${b.description}` : b.name) : "";
      if (b.image_webp && b.image_webp !== "/uploads/badges/default.webp") {
        return `<span class="badge-pill" title="${esc(tip)}" style="margin-right:4px;display:inline-flex;align-items:center;vertical-align:middle"><img src="${esc(media(b.image_webp))}" alt="${esc(b.name || "")}" style="width:18px;height:18px;vertical-align:middle;border-radius:4px;object-fit:contain" onerror="this.style.display='none'"></span>`;
      }
      return `<span class="badge-pill" title="${esc(tip)}" style="margin-right:4px;background:var(--coral);color:#fff;border-radius:10px;padding:2px 6px;font-size:11px;font-weight:bold;display:inline-flex;align-items:center;vertical-align:middle">${iconAsset("medal-star")}</span>`;
    }).join("");
    return premPill + userPills;
  };
  const formatSalePerks = (raw, saleObj) => {
    let it = raw || {};
    if (typeof it === "string") {
      try { it = JSON.parse(it); } catch (_) { it = {}; }
    }
    const parts = [];
    const premDays = Number(it && (it.premium_days || (it.premium ? 30 : 0))) || 0;
    if (premDays > 0) parts.push(`Premium ${premDays}d`);
    if (it && Array.isArray(it.badges) && it.badges.length) parts.push(`${it.badges.length} badge${it.badges.length > 1 ? "s" : ""}`);
    const priceUx = Number((saleObj && saleObj.price_ux !== undefined ? saleObj.price_ux : (it && it.price_ux)) || 0) || 0;
    parts.push(priceUx > 0 ? `${priceUx} UX` : "Free");
    return parts.length ? parts.join(" · ") : "Special offer";
  };
  // Human-readable time window of a sale ("⏱ from … until …") + state chip.
  const saleWindowInfo = (s) => {
    if (!s || (!s.starts_at && !s.ends_at)) return { text: "", chip: "" };
    const from = s.starts_at ? when(s.starts_at) : "now";
    const until = s.ends_at ? when(s.ends_at) : "no end";
    const text = `⏱ ${s.starts_at ? "from " + from : "now"}${s.ends_at ? " until " + until : ""}`;
    const nowMs = Date.now();
    const state = s.active_now ? "Active"
      : (s.starts_at && new Date(s.starts_at).getTime() > nowMs ? "Scheduled" : "Ended");
    const chip = `<span class="chip ${s.active_now ? "on" : ""}" style="padding:2px 8px;font-size:11px">${state}</span>`;
    return { text, chip };
  };
  const renderBadgesAndSalesPanel = (prefix, myBadges, sales, showAdminShortcut) => {
    const bList = Array.isArray(myBadges) ? myBadges : [];
    const appliedCount = bList.filter((b) => b && b.applied !== false).length;
    const sList = Array.isArray(sales) ? sales : [];
    return `
      <div class="card" style="margin-top:8px">
        <div class="row spread">
          <b>${iconAsset("medal-star")} My Badges (${appliedCount}/5 applied)</b>
          ${showAdminShortcut ? `<button class="ghost" data-go="admin" data-atab-go="badges">${iconAsset("settings-minimalistic")}<span>Manage in Control panel</span></button>` : ""}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          ${bList.length ? bList.map((b) => {
            const isApplied = b.applied !== false;
            const iconHtml = b.image_webp && b.image_webp !== "/uploads/badges/default.webp"
              ? `<img src="${esc(media(b.image_webp))}" alt="" style="width:16px;height:16px;border-radius:3px;object-fit:contain" onerror="this.style.display='none'">`
              : iconAsset("medal-star");
            return `
              <span class="badge-pill" title="${esc(b.description || b.name || "")}" style="background:${isApplied ? "var(--coral)" : "var(--surface-2, rgba(128,128,128,0.22))"};color:${isApplied ? "#fff" : "var(--fg)"};opacity:${isApplied ? "1" : "0.75"};padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;display:inline-flex;align-items:center;gap:6px">
                ${iconHtml}
                <span>${esc(b.name || "")}</span>
                <button type="button" class="ghost" data-toggle-badge="${esc(b.id)}" style="padding:1px 7px;font-size:11px;min-height:auto;line-height:1.3;border-radius:8px;background:rgba(0,0,0,0.2);color:inherit;border:none;cursor:pointer">${iconAsset("medal-star")}<span>${isApplied ? "Unapply" : "Apply"}</span></button>
              </span>
            `;
          }).join("") : `<span class="tiny muted">No badges yet. Redeem a promocode below (up to 5 applied at once).</span>`}
        </div>
        <div class="row" style="margin-top:8px">
          <input id="${prefix}-promo-code" placeholder="Enter badge promocode" style="max-width:240px">
          <button class="ghost" id="${prefix}-promo-btn">${iconAsset("medal-star")}<span>Apply badge</span></button>
        </div>
        <div class="tiny" id="${prefix}-promo-msg" style="margin-top:4px"></div>
      </div>
      <div class="card" style="margin-top:8px">
        <div class="row spread">
          <b>${iconAsset("tag-price")} My Sales & Offers (${sList.length})</b>
          ${showAdminShortcut ? `<button class="ghost" data-go="admin" data-atab-go="sales">${iconAsset("settings-minimalistic")}<span>Manage in Control panel</span></button>` : ""}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
          ${sList.length ? sList.map((s) => {
            const priceUx = Number(s.price_ux || (s.items && s.items.price_ux) || 0) || 0;
            const used = !!(s.once && s.applied_by_me);
            const win = saleWindowInfo(s);
            const nowMs = Date.now();
            const notStarted = !s.active_now && s.starts_at && new Date(s.starts_at).getTime() > nowMs;
            const ended = !s.active_now && !notStarted;
            let action;
            if (used) action = `<button class="ghost" disabled title="One-time sale — already activated">${iconAsset("check-circle")}<span>Activated</span></button>`;
            else if (notStarted) action = `<button class="ghost" disabled title="Sale is not active yet">Starts ${esc(when(s.starts_at))}</button>`;
            else if (ended) action = `<button class="ghost" disabled title="This sale has ended">Ended</button>`;
            else action = `<button class="ghost" data-apply-sale="${esc(s.id)}">${iconAsset("tag-price")}<span>${priceUx > 0 ? `Buy (${priceUx} UX)` : "Apply sale"}</span></button>`;
            return `
            <div class="list-item row spread" style="padding:6px 0">
              <div>
                <span class="badge-pill" style="background:var(--coral);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold">${iconAsset("medal-star")} ${esc(s.name || "")}</span>
                ${s.once ? `<span class="nsfw-tag" style="margin-left:4px" title="This sale can be activated only once">1×</span>` : ""}
                <span class="tiny" style="margin-left:6px">${esc(formatSalePerks(s.items, s))}</span>
                ${win.text ? `<div class="tiny" style="margin-left:6px">${esc(win.text)} ${win.chip}</div>` : ""}
              </div>
              ${action}
            </div>
            `;
          }).join("") : `<span class="tiny muted">No active sales right now.</span>`}
        </div>
      </div>
    `;
  };
  const bindBadgesAndSales = (prefix, rootEl) => {
    const scope = rootEl || document;
    scope.querySelectorAll("[data-atab-go]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        go("admin", { tab: btn.getAttribute("data-atab-go") });
      };
    });
    scope.querySelectorAll("[data-toggle-badge]").forEach((btn) => {
      btn.onclick = async (e) => {
        e.preventDefault();
        const bid = btn.getAttribute("data-toggle-badge");
        // The badge flips under the cursor before the server answers.
        const list = (S.me && S.me.badges) || [];
        const target = list.find((b) => b && (b.id === bid || b.badge_id === bid));
        const res = await localFirst("Badge", () => {
          if (!target) return null;
          const was = target.applied === undefined ? true : !!target.applied;
          target.applied = !was;
          return () => { target.applied = was; };
        }, () => api("/users/me/badges/" + encodeURIComponent(bid) + "/toggle", { method: "POST", body: {} }));
        if (res === null) return;
        S.me = await api("/auth/me").catch(() => S.me);
        if (S.me) cacheSet("me", S.me);
        toast(res && res.applied ? "Badge applied!" : "Badge unapplied", "medal-star");
        render();
      };
    });
    scope.querySelectorAll("[data-apply-sale]").forEach((btn) => {
      btn.onclick = async (e) => {
        e.preventDefault();
        const sid = btn.getAttribute("data-apply-sale");
        try {
          await api("/sales/apply", { method: "POST", body: { sale_id: sid } });
          S.me = await api("/auth/me").catch(() => S.me);
          if (S.me) cacheSet("me", S.me);
          toast("Sale applied!", "tag-price");
          render();
        } catch (err) { alert(err.message); }
      };
    });
    const pBtn = $("#" + prefix + "-promo-btn");
    if (pBtn) pBtn.onclick = async () => {
      const inp = $("#" + prefix + "-promo-code");
      const msg = $("#" + prefix + "-promo-msg");
      const code = (inp && inp.value || "").trim();
      if (!code) { if (msg) msg.textContent = "Enter a promocode first."; return; }
      try {
        await api("/badges/apply", { method: "POST", body: { code } });
        if (inp) inp.value = "";
        S.me = await api("/auth/me").catch(() => S.me);
        if (S.me) cacheSet("me", S.me);
        toast("Badge applied!", "medal-star");
        render();
      } catch (err) {
        if (msg) msg.textContent = err.message;
      }
    };
  };
  const custProfileTheme = (u) => {
    const t = (u && u.customization && u.customization.profile_theme) || "";
    const bg = { midnight: "#0b1026", sunset: "linear-gradient(180deg,#3a1c45,#83442c)", forest: "linear-gradient(180deg,#12301f,#254a2c)", ocean: "linear-gradient(180deg,#0d2b45,#1a5e70)", mono: "#1c1c1c" }[t] || "";
    return bg ? ` style="background:${bg}"` : "";
  };

  async function viewProfile(id, uname) {
    const my = ACTIVE;
    if (!id && uname) {
      try {
        const found = await api("/lookup/users/" + encodeURIComponent(String(uname).replace(/^@/, "")));
        id = found.id;
        S.params.id = id;
      } catch (_) {
        if (!paintRoot(my, shell(`<p class="err">User not found</p>`))) return;
        return;
      }
    }
    const self = S.me && id === S.me.id;
    let u = self ? S.me : null;
    let sales = [];
    let myBadges = [];
    let visitors = [];
    try { u = await api(self ? "/auth/me" : "/users/" + id); if (self) { S.me = u; cacheSet("me", u); } else { u = Optim.merge("users", [u])[0]; } } catch (_) { u = cacheGet("me", u); }
    if (self) {
      try { sales = (await api("/users/me/sales")).items || []; } catch (_) {}
      try { myBadges = (await api("/users/me/badges")).items || (u && u.badges) || []; } catch (_) { myBadges = (u && u.badges) || []; }
      try { visitors = (await api("/users/me/visitors")).items || []; } catch (_) {}
    }
    const posts = await api("/users/" + (u.id) + "/posts").catch(() => ({ items: [] }));
    const seen = presenceLine(u) ? "· " + presenceLine(u) : "";
    const seenHtml = `<span data-presence="${esc(u.id)}" data-presence-keep="1" data-presence-fallback="">${esc(presenceLine(u))}</span>`;
    const statusEmoji = u.status_emoji ? `<span title="Status emoji">${esc(u.status_emoji)}</span> ` : "";
    const pronounsBadge = u.pronouns ? `<span class="chip" style="padding:2px 8px;font-size:11px;margin-left:4px">${esc(u.pronouns)}</span>` : "";
    const websiteLink = u.website ? `<p class="tiny">${iconAsset("link")} <a href="${esc(u.website.startsWith("http") ? u.website : "https://" + u.website)}" target="_blank" rel="noopener">${esc(u.website)}</a></p>` : "";
    const visitorsHtml = self && visitors.length > 0 ? `
      <div class="card" style="margin-top:8px">
        <div class="row spread">
          <b>${iconAsset("eye")} Recent Profile Visitors (${u.profile_views_count || visitors.length})</b>
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">
          ${visitors.slice(0, 12).map((v) => `<button type="button" class="chip" data-user="${esc(v.user.id)}">${esc(nameOf(v.user))} <span class="tiny">@${esc(v.user.username)}</span></button>`).join("")}
        </div>
      </div>` : "";
    if (!paintRoot(my, shell(`
      ${!self ? `<button class="ghost" id="back-user">${ico("back")}<span>Back</span></button>` : ""}
      <div${custProfileTheme(u)}>
      ${u.cover_url ? `<img class="cover" src="${esc(media(u.cover_url))}">` : `<div class="cover"></div>`}
      <div class="row" style="margin-top:-28px">
        ${avatar(u, "lg")}
        <div>
          <h1 class="h1">${statusEmoji}<span style="${custStyle(u)}">${esc(nameOf(u))}</span>${pronounsBadge}${u.online ? `<span class="dot"></span>` : ""} ${u.nsfw ? `<span class="nsfw-tag" title="Account marked NSFW">NSFW</span>` : ""} ${custBadge(u)} ${u.premium ? `<span class="nsfw-tag" title="Uxaoro Premium" style="background:var(--coral);color:#fff">${iconAsset("crown")}</span>` : ""}</h1>
          <div class="muted">@${esc(u.username)} ${seen ? "· " + seenHtml : seenHtml} · ${u.friends_count || 0} friends · ${iconAsset("eye")} ${u.profile_views_count || 0} views</div>
        </div>
      </div>
      <p${(u.customization && u.customization.bio_color) ? ` style="color:${esc(u.customization.bio_color)}"` : ""}>${esc(u.bio || "")}</p>
      <p class="tiny">${esc(u.status || "")}${u.city ? " · " + esc(u.city) : ""}</p>
      ${websiteLink}
      </div>
      <div class="row" style="flex-wrap:wrap">
        ${self ? `
          ${isStaff() ? `<button class="ghost" data-go="admin">${iconAsset("shield-check")}<span>Control panel</span></button>` : ""}
          <button class="ghost" data-go="editprofile">${iconAsset("pen")}<span>Edit</span></button>
          <button class="ghost" data-go="settings">${ico("gear")}<span>Settings</span></button>
          <button class="ghost" id="saved-chat-btn" title="Saved Messages">${iconAsset("bookmark")}<span>Saved</span></button>
          <button class="ghost" id="share-user">${ico("share")}<span>Share</span></button>
        ` : `${friendButtons(u)} <button id="msg-them">${iconAsset("chat-round-line")}<span>Message</span></button> <button class="ghost" id="wall">${iconAsset("document-text")}<span>Wall</span></button> <button class="ghost" id="share-user">${ico("share")}<span>Share</span></button> <button class="ghost" id="blk">${iconAsset("user-block")}<span>Block</span></button>`}
      </div>
      ${visitorsHtml}
      ${self ? renderBadgesAndSalesPanel("prof", myBadges, sales, isStaff()) : ""}
      ${self ? `<p class="tiny">Role: ${esc(S.me.role)}${S.me.is_developer ? ` · <b class="dev-badge">Developer ${iconAsset("check-circle")}</b>` : ` · <a data-go="developer">Become a developer</a>`}</p>
      ${selfNsfwNote()}` : `${u.nsfw ? `<p class="tiny"><span class="nsfw-tag">NSFW</span> This account is marked as posting adult content.</p>` : ""}${u.is_developer ? `<p class="tiny"><b class="dev-badge">Developer ${iconAsset("check-circle")}</b> builds apps on Uxaoro Account</p>` : ""}`}
      ${Optim.merge("posts", posts.items || []).map(postCard).join("")}
    `))) return;
    bindSocial($("#root"));
    if (self) bindBadgesAndSales("prof", $("#root"));
    const backUser = $("#back-user");
    if (backUser) backUser.onclick = () => {
      if (history.length > 1) history.back();
      else go("feed", {}, "feed");
    };
    const mt = $("#msg-them");
    if (mt) mt.onclick = async () => {
      const chat = await api("/chats", { method: "POST", body: { user_ids: [u.id] } });
      go("chat", { id: chat.id }, "messages");
    };
    const fr = $("#fr-them");
    if (fr) fr.onclick = async () => { await localFirst("Friend request", () => Optim.patch("users", u.id, { friend_status: "pending_out" }), () => api("/friends/request/" + u.id, { method: "POST" })); };
    const acc = $("#fr-acc");
    if (acc) acc.onclick = async () => { await localFirst("Accept friend request", () => Optim.patch("users", u.id, { friend_status: "friends", is_friend: true }), () => api("/friends/accept/" + u.id, { method: "POST" })); };
    const un = $("#unfr");
    if (un) un.onclick = async () => { await localFirst("Remove friend", () => Optim.patch("users", u.id, { friend_status: "none", is_friend: false }), () => api("/friends/" + u.id, { method: "DELETE" })); };
    const wall = $("#wall");
    if (wall) wall.onclick = () => go("compose", { wall: u.id });
    const blk = $("#blk");
    if (blk) blk.onclick = async () => {
      // Leave the profile immediately; the block is rolled back if it fails.
      const done = await localFirst("Block user", () => Optim.patch("users", u.id, { is_blocked: true }),
        () => api("/users/" + u.id + "/block", { method: "POST" }), { repaint: false });
      if (done !== null) go("feed", {}, "feed");
    };
    const shu = $("#share-user");
    if (shu) shu.onclick = () => {
      const link = u.username
        ? shareUrl("/user?u=" + encodeURIComponent(u.username))
        : shareUrl("/user?id=" + encodeURIComponent(u.id));
      shareLink(link, nameOf(u), "Find me on Uxaoro");
    };
    const mk = $("#nsfw-mark-self");
    if (mk) mk.onclick = async () => {
      try {
        await patchMe("NSFW mark", { nsfw: true });
        render();
      } catch (e) { alert(e.message); }
    };
    const um = $("#nsfw-unmark-self");
    if (um) um.onclick = async () => {
      try {
        await patchMe("NSFW mark", { nsfw: false });
        render();
      } catch (e) { alert(e.message); }
    };
  }

  // Text under the profile action row about the reader's own NSFW mark.
  const selfNsfwNote = () => {
    const m = S.me || {};
    if (!m.nsfw) {
      return `<p class="tiny"><span class="nsfw-tag">NSFW</span> Your account is not marked. <a id="nsfw-mark-self">Mark it NSFW</a> (you can remove it later, unless staff locks it).</p>`;
    }
    if (m.nsfw_locked) {
      return `<p class="tiny"><span class="nsfw-tag">NSFW</span> Account marked NSFW (${m.nsfw_source === "auto" ? "automatic rule" : "by staff"}${typeof m.nsfw_ratio === "number" ? ` · ${Math.round(m.nsfw_ratio * 100)}% of last week's posts` : ""}) — locked, only staff can remove it.</p>`;
    }
    return `<p class="tiny"><span class="nsfw-tag">NSFW</span> Account marked NSFW${typeof m.nsfw_ratio === "number" ? ` · ${Math.round(m.nsfw_ratio * 100)}% of last week's posts` : ""}. <a id="nsfw-unmark-self">Remove mark</a>.</p>`;
  };

  async function viewEditProfile() {
    const my = ACTIVE;
    const me = S.me || {};
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">Edit profile</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      <div class="card">
        <p class="tiny">Avatar</p>
        <div class="picker-row"><button class="ghost" id="ava-btn">${iconAsset("gallery-add")}<span>Choose photo</span></button></div>
        <p class="tiny">Cover</p>
        <div class="picker-row"><button class="ghost" id="cov-btn">${iconAsset("gallery-add")}<span>Choose photo</span></button></div>
        <div style="height:8px"></div>
        <input id="dn" placeholder="Display name" value="${esc(me.display_name || "")}">
        <div style="height:8px"></div>
        <div class="row" style="gap:8px">
          <input id="status-emoji" placeholder="Status emoji (e.g. 🚀)" value="${esc(me.status_emoji || "")}" style="max-width:160px">
          <input id="pronouns" placeholder="Pronouns (e.g. they/them)" value="${esc(me.pronouns || "")}">
        </div>
        <div style="height:8px"></div>
        <input id="status" placeholder="Status message" value="${esc(me.status || "")}">
        <div style="height:8px"></div>
        <input id="city" placeholder="City" value="${esc(me.city || "")}">
        <div style="height:8px"></div>
        <input id="website" placeholder="Website (https://...)" value="${esc(me.website || "")}">
        <div style="height:8px"></div>
        <textarea id="bio" placeholder="Bio">${esc(me.bio || "")}</textarea>
        <div style="height:8px"></div>
        <button id="save-me">${iconAsset("check-circle")}<span>Save</span></button>
        <div class="err" id="err"></div>
      </div>
    `))) return;
    $("#back").onclick = () => go("profile", {}, "profile");
    $("#save-me").onclick = async () => {
      // The profile updates and navigates right away; a rejected save reverts
      // to the old values and reports the error.
      const fields = {
        display_name: $("#dn").value,
        bio: $("#bio").value,
        status: $("#status").value,
        city: $("#city").value,
        status_emoji: $("#status-emoji").value,
        pronouns: $("#pronouns").value,
        website: $("#website").value,
      };
      const before = S.me;
      const saved = await localFirst("Save profile", () => {
        S.me = Object.assign({}, S.me, fields);
        cacheSet("me", S.me);
        return () => { S.me = before; cacheSet("me", before); };
      }, () => api("/users/me", { method: "PATCH", body: fields }), { repaint: false });
      if (saved) {
        S.me = saved;
        cacheSet("me", saved);
        go("profile", {}, "profile");
      } else {
        const e = $("#err");
        if (e) e.textContent = "Save failed - your old profile is still in place.";
      }
    };
    const uploadWithEditor = async (endpoint) => {
      const picked = await UxaMedia.pickAndEditPhoto("Edit photo");
      if (!picked) return;
      const fd = new FormData();
      fd.append("file", picked.file);
      // The picture the user just chose is on the profile at once (blob URL);
      // the upload replaces it with the permanent one, a failure rolls back.
      const field = endpoint.indexOf("cover") >= 0 ? "cover_url" : "avatar_url";
      const before = S.me ? S.me[field] : null;
      const local = URL.createObjectURL(picked.file);
      const saved = await localFirst("Upload photo", () => {
        S.me = Object.assign({}, S.me, { [field]: local });
        cacheSet("me", S.me);
        return () => { S.me = Object.assign({}, S.me, { [field]: before }); cacheSet("me", S.me); };
      }, () => api(endpoint, { method: "POST", body: fd }), { repaint: false });
      if (!saved) {
        try { URL.revokeObjectURL(local); } catch (_) {}
        throw new Error("Upload failed - the previous photo is still in place.");
      }
      await afterLogin();
      render();
      setTimeout(() => { try { URL.revokeObjectURL(local); } catch (_) {} }, 1500);
    };
    $("#ava-btn").onclick = () => uploadWithEditor("/users/me/avatar").catch((e) => { const b = $("#err"); if (b) b.textContent = e.message; });
    $("#cov-btn").onclick = () => uploadWithEditor("/users/me/cover").catch((e) => { const b = $("#err"); if (b) b.textContent = e.message; });
  }

  async function viewSearch() {
    const my = ACTIVE;
    if (!paintRoot(my, shell(`
      <div class="row spread"><div><h1 class="h1">${ico("search")} Search</h1><p class="tiny">Find people and communities across Uxaoro.</p></div><button type="button" class="ghost" data-go="explore">${iconAsset("compass")}<span>Explore</span></button></div>
      <div class="card row search-box">
        <input id="q" type="search" placeholder="People or communities" aria-label="Search people or communities" value="${esc(S.params.q || "")}">
        ${S.params.q ? `<button type="button" class="ghost" id="clear-q" aria-label="Clear search" title="Clear search">${iconAsset("close-circle")}</button>` : ""}
      </div>
      <div id="res">${S.params.q ? `<p class="muted">Searching…</p>` : `<div class="card empty-state"><b>Start with a name or username</b><p class="muted">Search profiles and public circles, or browse trending topics.</p><div class="row"><button type="button" data-go="friends">${ico("people")}<span>People</span></button><button type="button" class="ghost" data-go="communities">${ico("list")}<span>Circles</span></button><button type="button" class="ghost" data-go="explore">${iconAsset("chart-2")}<span>Trending</span></button></div></div>`}</div>
    `))) return;
    const results = $("#res");
    const run = async () => {
      const q = $("#q").value.trim();
      if (q.length < 2) {
        results.innerHTML = `<p class="tiny">Enter at least 2 characters to search.</p>`;
        return;
      }
      results.innerHTML = `<p class="muted">Searching…</p>`;
      try {
        const data = await api("/search?q=" + encodeURIComponent(q));
        results.innerHTML = `
          <div class="search-section"><div class="row spread"><h2 class="section-title">People</h2><span class="tiny">${(data.users || []).length} results</span></div>
          ${(data.users || []).map((u) => `<div class="list-item search-result">
            ${avatar(u)}<span class="search-result-copy" data-user="${esc(u.id)}" role="link" tabindex="0"><b>${esc(nameOf(u))}</b><small>@${esc(u.username || "")}${u.bio ? ` · ${esc(u.bio)}` : ""}</small></span><button type="button" class="ghost" data-profile-user="${esc(u.id)}">${iconAsset("user-circle")}<span>View profile</span></button>
          </div>`).join("") || `<p class="tiny">No people found.</p>`}</div>
          <div class="search-section"><div class="row spread"><h2 class="section-title">Circles</h2><span class="tiny">${(data.communities || []).length} results</span></div>
          ${(data.communities || []).map((c) => `<div class="list-item search-result">
            ${avatar({ avatar_url: c.avatar_url, display_name: c.name, username: c.username })}<span class="search-result-copy" data-comm="${esc(c.id)}"><b>${esc(c.name)}</b><small>@${esc(c.username || c.slug || "")} · ${Number(c.members_count || 0)} members</small></span><button type="button" class="ghost" data-comm="${esc(c.id)}">${iconAsset("users-group-rounded")}<span>Open circle</span></button>
          </div>`).join("") || `<p class="tiny">No circles found.</p>`}</div>
        `;
        bindSocial(results);
        results.querySelectorAll("[data-profile-user]").forEach((button) => button.onclick = (e) => { e.stopPropagation(); go("user", { id: button.getAttribute("data-profile-user") }); });
      } catch (err) {
        results.innerHTML = `<div class="card"><p class="err">${esc(err.message || "Search failed")}</p><button type="button" class="ghost" id="retry-search">${iconAsset("refresh")}<span>Try again</span></button></div>`;
        const retry = $("#retry-search");
        if (retry) retry.onclick = run;
      }
    };
    $("#q").oninput = () => { clearTimeout(S._search); S._search = setTimeout(run, 220); };
    $("#q").onkeydown = (e) => { if (e.key === "Enter") { clearTimeout(S._search); run(); } };
    const clear = $("#clear-q");
    if (clear) clear.onclick = () => go("search");
    if (S.params.q) run();
  }

  async function viewNotes() {
    const my = ACTIVE;
    const n = await api("/notifications");
    const items = (n && n.items) || [];
    const parsePayload = (note) => {
      const raw = note && note.payload;
      if (raw && typeof raw === "object") return raw;
      try { return JSON.parse(raw || "{}"); } catch (_) { return {}; }
    };
    const openTarget = (note) => {
      const p = parsePayload(note);
      if (p.post_id || p.original_post_id) return { kind: "post", id: p.post_id || p.original_post_id };
      if (p.community_id) return { kind: "community", id: p.community_id };
      if (p.chat_id) return { kind: "chat", id: p.chat_id };
      if (p.user_id) return { kind: "user", id: p.user_id };
      if (String(note.ntype || "").includes("friend")) return { kind: "friends", id: "" };
      if (String(note.ntype || "").includes("message")) return { kind: "messages", id: "" };
      return null;
    };
    const rows = items.map((item) => {
      const target = openTarget(item);
      const targetAttrs = target ? `data-note-open="${esc(target.kind)}" data-note-id="${esc(target.id)}"` : "";
      return `<article class="card notification-card ${item.read ? "" : "unread"}">
        <div class="notification-mark">${item.read ? iconAsset("check-read") : iconAsset("bell-bing")}</div>
        <div class="notification-copy">
          <div class="row spread"><b>${esc(item.title || "Notification")}</b>${!item.read ? `<span class="notification-dot" title="Unread"></span>` : ""}</div>
          <p>${esc(item.body || "")}</p>
          <span class="tiny">${esc(when(item.created_at))}</span>
        </div>
        ${target ? `<button type="button" class="ghost notification-open" ${targetAttrs}>${iconAsset("alt-arrow-right")}<span>Open ${target.kind === "post" ? "post" : target.kind === "user" ? "profile" : target.kind === "community" ? "circle" : target.kind === "chat" ? "chat" : target.kind === "friends" ? "requests" : "inbox"}</span></button>` : ""}
      </article>`;
    }).join("");
    if (!paintRoot(my, shell(`
      <div class="row spread"><div><h1 class="h1">${ico("bell")} Alerts</h1><p class="tiny">Updates about your people and posts</p></div><button class="ghost" id="read" ${items.some((i) => !i.read) ? "" : "disabled"}>${iconAsset("check-read")}<span>Mark all read</span></button></div>
      ${rows || `<div class="card empty-state"><b>You’re all caught up</b><p class="muted">New likes, comments, friend requests, and other updates will appear here.</p><button type="button" class="ghost" data-go="feed">${iconAsset("arrow-left")}<span>Back to feed</span></button></div>`}
    `))) return;
    document.querySelectorAll("[data-note-open]").forEach((button) => button.onclick = () => {
      const kind = button.getAttribute("data-note-open");
      const id = button.getAttribute("data-note-id");
      if (kind === "post" && id) go("post", { id });
      else if (kind === "user" && id) go("user", { id });
      else if (kind === "community" && id) go("community", { id });
      else if (kind === "chat" && id) go("chat", { id }, "messages");
      else if (kind === "friends") go("friends", { tab: "requests" }, "friends");
      else if (kind === "messages") go("messages", {}, "messages");
    });
    $("#read").onclick = async () => {
      const before = S.badge ? Object.assign({}, S.badge) : null;
      const done = await localFirst("Mark notifications read", () => {
        // The badge empties before the server confirms; it comes back on failure.
        S.badge = Object.assign({}, S.badge, { notifications: 0 });
        return () => { S.badge = before; };
      }, () => api("/notifications/read-all", { method: "POST" }), { repaint: false });
      await refreshBadge();
      if (done) render();
    };
  }

  async function viewPost(id) {
    const my = ACTIVE;
    const p = await api("/posts/" + id);
    const comments = await api("/posts/" + id + "/comments");
    if (!paintRoot(my, shell(`
      <button class="ghost" id="back">${ico("back")}<span>Back</span></button>
      ${postCard(Optim.merge("posts", [p])[0])}
      <h3>Comments</h3>
      ${Optim.merge("comments", comments || []).map((c) => `<div class="list-item row spread" data-cmt="${esc(c.id)}">
        <span><b>${esc(nameOf(c.author))}</b> ${esc(c.text)}${c.__pending ? ` <span class="pending-note">sending…</span>` : ""}</span>
        ${(S.me && c.author && c.author.id === S.me.id) || isStaff() ? `<button class="ghost" data-delc="${esc(c.id)}" aria-label="Delete comment" title="Delete comment">${iconAsset("trash-bin-trash")}</button>` : ""}
      </div>`).join("")}
      <div class="row"><input id="cmt" placeholder="Write a comment"><button id="cmt-go">${iconAsset("send-square")}<span>Send</span></button></div>
    `))) return;
    bindSocial($("#root"));
    $("#back").onclick = () => history.back();
    $("#cmt-go").onclick = async () => {
      const box = $("#cmt");
      const text = (box && box.value || "").trim();
      if (!text) return;
      if (box) box.value = "";
      const before = Optim.get("posts", id) || {};
      const lid = Optim.localId("c");
      await localFirst("Comment", () => {
        const undo = Optim.create("comments", {
          id: lid, __localId: lid, text, created_at: new Date().toISOString(),
          author: S.me || {},
        });
        const undoCount = Optim.patch("posts", id, { comments_count: (Number(before.comments_count) || 0) + 1 });
        return () => { undo(); undoCount(); };
      }, async () => {
        const created = await api("/posts/" + id + "/comments", { method: "POST", body: { text } });
        Optim.confirm("comments", lid, created && created.id);
        return created;
      });
    };
    document.querySelectorAll("[data-delc]").forEach((n) => n.onclick = async () => {
      const cid = n.getAttribute("data-delc");
      const before = Optim.get("posts", id) || {};
      await localFirst("Delete comment", () => {
        const undo = Optim.remove("comments", cid);
        const undoCount = Optim.patch("posts", id, { comments_count: Math.max(0, (Number(before.comments_count) || 0) - 1) });
        return () => { undo(); undoCount(); };
      }, () => api("/comments/" + cid, { method: "DELETE" }));
    });
  }

  async function viewBlocked() {
    const my = ACTIVE;
    const items = Optim.merge("blocked", await api("/users/me/blocked").catch(() => []));
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">Blocked</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      ${(items || []).map((u) => `<div class="list-item row spread">
        <span>${esc(nameOf(u))} <span class="tiny">@${esc(u.username)}</span></span>
        <button class="ghost" data-unb="${esc(u.id)}">${iconAsset("user-check-rounded")}<span>Unblock</span></button>
      </div>`).join("") || `<p class="muted">No blocked users</p>`}
    `))) return;
    $("#back").onclick = () => go("settings");
    document.querySelectorAll("[data-unb]").forEach((n) => n.onclick = async () => {
      const uid = n.getAttribute("data-unb");
      await localFirst("Unblock user", () => Optim.remove("blocked", uid),
        () => api("/users/" + uid + "/block", { method: "DELETE" }));
      render();
    });
  }

  function privSelect(id, value, three) {
    const opts = three
      ? [["everyone", "Everyone"], ["friends", "Friends"], ["nobody", "Nobody"]]
      : [["everyone", "Everyone"], ["nobody", "Nobody"]];
    return `<select id="${id}">${opts.map(([k, l]) =>
      `<option value="${k}"${value === k ? " selected" : ""}>${l}</option>`
    ).join("")}</select>`;
  }

  function privRow(id, title, hint, value, three) {
    return `<div class="priv-row"><b>${esc(title)}</b><div class="hint">${esc(hint)}</div>${privSelect(id, value || "everyone", three)}</div>`;
  }

  async function viewSettings() {
    const my = ACTIVE;
    const me = S.me || {};
    const totpOn = !!me.totp_enabled;
    let sales = [];
    let myBadges = [];
    let sessions = [];
    try { sales = (await api("/users/me/sales")).items || []; } catch (_) {}
    try { myBadges = (await api("/users/me/badges")).items || me.badges || []; } catch (_) { myBadges = me.badges || []; }
    try {
      sessions = Optim.merge("sessions", (await api("/auth/sessions")).items || [], (x) => x && x.id);
    } catch (_) {}
    let logins = [];
    let alertsOn = me.security_alerts !== false;
    let keyBackup = null;
    try {
      keyBackup = await api("/e2ee/backup?meta=1");
    } catch (_) {}
    try {
      const act = await api("/me/security/activity");
      logins = act.items || [];
      alertsOn = act.alerts_enabled !== false;
    } catch (_) {}
    if (!paintRoot(my, shell(`
      <h1 class="h1">${ico("gear")} Settings</h1>
      <p class="sec-label">Badges & Sales</p>
      ${renderBadgesAndSalesPanel("set", myBadges, sales, isStaff())}
      <p class="sec-label">Look</p>
      <div class="card">${lookPanel()}</div>
      <p class="sec-label">Privacy</p>
      <div class="card">
        ${privRow("wcm", "Who can message me", "Direct messages on Wire", me.who_can_message, true)}
        ${privRow("wci", "Who can add me to a community", "Invites into circles", me.who_can_invite_community, true)}
        ${privRow("wcg", "Who can add me to a group", "Messenger groups", me.who_can_add_group, true)}
        ${privRow("wcf", "Who can send me a friend request", "People tab", me.who_can_friend, false)}
        ${privRow("wcc", "Who can call me", "Audio and video", me.who_can_call, true)}
        ${privRow("wcl", "Who can see last visit time", "When you were last here", me.who_can_see_last_seen, true)}
        ${privRow("wco", "Who can see when I am online", "Live / offline status", me.who_can_see_online, true)}
        ${privRow("wcs", "Who can see my stories", "24-hour lanterns", me.who_can_see_stories, true)}
        <button id="save-priv">${iconAsset("lock-keyhole")}<span>Save privacy</span></button>
      </div>
      <p class="sec-label">Security</p>
      <div class="card">
        <b>Linked accounts</b>
        <p class="tiny">Link Google or GitHub after registration to sign in using either your password, Google, or GitHub.</p>
        <div class="row spread" style="margin-top:8px">
          <div class="row" style="gap:8px">
            ${GOOGLE_SVG}
            <div>
              <b>Google</b>
              <div class="tiny">${me.google_linked ? `Connected ${iconAsset("check-circle")} — you can sign in with Google` : "Not connected"}</div>
            </div>
          </div>
          ${me.google_linked
            ? `<button type="button" class="ghost" id="btn-unlink-google">${iconAsset("link-broken")}<span>Unlink</span></button>`
            : `<button type="button" id="btn-link-google">${iconAsset("link")}<span>Link Google</span></button>`}
        </div>
        <div style="height:10px"></div>
        <div class="row spread">
          <div class="row" style="gap:8px">
            ${GITHUB_SVG}
            <div>
              <b>GitHub</b>
              <div class="tiny">${me.github_linked ? `Connected ${iconAsset("check-circle")} — you can sign in with GitHub` : "Not connected"}</div>
            </div>
          </div>
          ${me.github_linked
            ? `<button type="button" class="ghost" id="btn-unlink-github">${iconAsset("link-broken")}<span>Unlink</span></button>`
            : `<button type="button" id="btn-link-github">${iconAsset("link")}<span>Link GitHub</span></button>`}
        </div>
        <div class="err" id="oauth-link-err"></div>
      </div>
      <div class="card">
        <b>Password</b>
        <div style="height:8px"></div>
        ${me.has_password === false ? "" : `<input id="old-p" type="password" placeholder="Current password"><div style="height:8px"></div>`}
        <input id="new-p" type="password" placeholder="New password">
        <div style="height:8px"></div>
        <button id="save-pass">${iconAsset("key")}<span>${me.has_password === false ? "Set password" : "Change password"}</span></button>
      </div>
      <div class="card">
        <b>Authenticator app</b>
        <p class="tiny">${totpOn
          ? "Two-factor is on. Codes from Google Authenticator, Aegis, or similar."
          : "Protect sign-in with a 6-digit code from an authenticator app."}</p>
        ${totpOn ? `
          <input id="t-pass" type="password" placeholder="Password">
          <div style="height:8px"></div>
          <input id="t-code" placeholder="Authenticator code" inputmode="numeric">
          <div style="height:8px"></div>
          <button class="danger" id="t-off">${iconAsset("shield-cross")}<span>Turn off 2FA</span></button>
        ` : `
          <button id="t-setup">${iconAsset("key")}<span>Set up authenticator</span></button>
          <div id="t-box" class="hidden">
            <p class="tiny">Scan this QR code with your authenticator app</p>
            <div id="t-qr-wrap" style="display:flex;justify-content:center;margin:8px 0">
              <img id="t-qr" alt="Authenticator QR code" width="180" height="180"
                   style="border-radius:12px;background:#fff;padding:8px;display:none">
            </div>
            <p class="tiny">Or enter the secret key manually</p>
            <div class="secret-key" id="t-secret"></div>
            <a class="tiny" id="t-open" href="#" target="_blank" rel="noopener">Open authenticator app</a>
            <div style="height:8px"></div>
            <input id="t-code" placeholder="Code from app" inputmode="numeric">
            <div style="height:8px"></div>
            <button id="t-on">${iconAsset("shield-check")}<span>Confirm and enable</span></button>
          </div>
        `}
        <div class="err" id="t-err"></div>
      </div>
      <div class="card">
        <div class="row spread">
          <div>
            <b>${iconAsset("devices")} Active Sessions &amp; Devices (${sessions.length})</b>
            <div class="tiny">Devices currently signed in to your Uxaoro account</div>
          </div>
          ${sessions.length > 1 ? `<button type="button" class="ghost" id="btn-revoke-others">${iconAsset("logout")}<span>Sign out other devices</span></button>` : ""}
        </div>
        <div style="margin-top:8px">
          ${sessions.map((s) => `
            <div class="list-item row spread" style="padding:8px 0">
              <div>
                <b>${esc(s.device || "Uxaoro Client")}</b> ${s.is_latest ? `<span class="nsfw-tag" style="background:var(--coral)">Current</span>` : ""}
                <div class="tiny">${esc(s.ip_address ? s.ip_address + " · " : "")}Active ${esc(when(s.last_used_at || s.created_at))}</div>
              </div>
              <button type="button" class="ghost" data-revoke-sess="${esc(s.id)}" style="padding:4px 8px;font-size:11px">${iconAsset("exit")}<span>Revoke</span></button>
            </div>
          `).join("") || `<p class="tiny muted">Current session active</p>`}
        </div>
      </div>
      <div class="card">
        <div class="row spread">
          <div>
            <b>${iconAsset("shield-check")} Sign-in security</b>
            <div class="tiny">Alerts for new devices, and every recent sign-in to this account</div>
          </div>
        </div>
        <label class="row" style="gap:8px;align-items:center;margin-top:8px">
          <input type="checkbox" id="sec-alerts" ${alertsOn ? "checked" : ""}>
          <span>Alert me about new sign-ins</span>
        </label>
        <div style="margin-top:8px">
          ${logins.map((e) => `
            <div class="list-item" style="padding:8px 0">
              <b>${esc(e.device || "Unknown device")}</b>
              ${e.new_device ? `<span class="nsfw-tag" style="background:var(--coral)">New device</span>` : ""}
              <div class="tiny">${esc(methodLabel(e.method))}${e.ip_address ? " · " + esc(e.ip_address) : ""} · ${esc(when(e.at))} (${esc(relTime(e.at))})</div>
            </div>
          `).join("") || `<p class="tiny muted">No sign-ins recorded yet.</p>`}
        </div>
      </div>
      <div class="card">
        <b>${iconAsset("key")} Key backup</b>
        <p class="tiny">Your end-to-end encryption keys are sealed with your password and stored on the server, so signing in on a new device restores them - the server only holds the encrypted blob.</p>
        <div id="kb-state">${keyBackupStateHtml(keyBackup)}</div>
        <div class="row" style="gap:6px;margin-top:8px">
          <button type="button" class="ghost" id="kb-now">${iconAsset("archive-up")}<span>${keyBackup && keyBackup.exists ? "Update backup" : "Back up now"}</span></button>
          <button type="button" class="ghost" id="kb-restore" ${keyBackup && keyBackup.exists ? "" : "disabled"}>${iconAsset("archive-down")}<span>Restore</span></button>
          <button type="button" class="ghost" id="kb-delete" ${keyBackup && keyBackup.exists ? "" : "disabled"}>${iconAsset("trash-bin-trash")}<span>Delete</span></button>
        </div>
      </div>
      <p class="sec-label">Premium</p>
      <div class="card">
        <div class="row spread">
          <div>
            ${me.premium ? `<b style="color:var(--coral)">Uxaoro Premium ${iconAsset("check-circle")}</b><div class="tiny">40 stories/day · 4000 communities · Developer tab · customization</div>`
              : `<b>Uxaoro Premium</b><div class="tiny">More stories, more communities, Developer tab, customization — paid with UX.</div>`}
          </div>
          <button class="ghost" data-go="premium">${iconAsset("crown")}<span>${me.premium ? "Manage" : "Get Premium"}</span></button>
        </div>
      </div>
      <p class="sec-label">Developer</p>
      <div class="card">
        <div class="row spread"><span>${me.is_developer ? `<b class="dev-badge">Developer Account ${iconAsset("check-circle")}</b>` : "Developer Account"}</span><button class="ghost" data-go="developer">${iconAsset("code")}<span>${me.is_developer ? "My projects" : "Get access"}</span></button></div>
        <p class="tiny">Confirm email code + enable 2FA to create projects with their own Uxaoro API Key and “Login with Uxaoro”.</p>
      </div>
      <p class="sec-label">Content</p>
      <div class="card">
        <div class="row spread">
          <div>
            <b>Show NSFW content</b>
            <div class="tiny">Flagged posts and posts from NSFW-marked accounts stay hidden while this is off.</div>
          </div>
          <button class="ghost" id="tgl-nsfw">${iconAsset(me.show_nsfw ? "eye" : "eye-closed")}<span>${me.show_nsfw ? "On" : "Off"}</span></button>
        </div>
        <div style="height:10px"></div>
        <div class="row spread">
          <div>
            <b>My account is NSFW</b>
            <div class="tiny">${typeof me.nsfw_ratio === "number" ? `${Math.round(me.nsfw_ratio * 100)}% of your posts in the last 7 days are flagged. ` : ""}Marked accounts see NSFW content by default.</div>
          </div>
          ${me.nsfw_locked
            ? `<span class="nsfw-tag">NSFW · locked</span>`
            : `<button class="ghost" id="tgl-my-nsfw">${iconAsset("flag")}<span>${me.nsfw ? "Remove mark" : "Mark as NSFW"}</span></button>`}
        </div>
        ${me.nsfw_locked ? `<p class="tiny">The mark is locked (${me.nsfw_source === "auto" ? "automatic weekly rule" : "by staff"}) — only staff can change it.</p>` : ""}
      </div>
      <p class="sec-label">Account</p>
      <div class="card">
        <div class="row" style="flex-wrap:wrap;gap:8px">
          <button class="ghost" data-go="blocked">${iconAsset("user-block")}<span>Blocked users</span></button>
          <button class="ghost" data-go="editprofile">${iconAsset("pen")}<span>Edit profile</span></button>
          <button class="ghost" id="saved-chat-btn">${iconAsset("bookmark")}<span>Saved Messages</span></button>
          <button class="ghost" id="btn-export-data">${iconAsset("download")}<span>Export account data (JSON)</span></button>
        </div>
        <p class="tiny" style="margin-top:8px">Messages stay encrypted on this device. The server never sees plaintext.</p>
        <button class="danger" id="out">${iconAsset("logout")}<span>Log out</span></button>
      </div>
      ${devSettingsHtml()}
      ${devVersionHtml()}
    `))) return;
    bindLook($("#root"));
    bindBadgesAndSales("set", $("#root"));
    document.querySelectorAll("[data-revoke-sess]").forEach((b) => {
      b.onclick = async () => {
        try {
          const sid = b.getAttribute("data-revoke-sess");
          const done = await localFirst("Revoke session", () => Optim.remove("sessions", sid),
            () => api("/auth/sessions/" + encodeURIComponent(sid), { method: "DELETE" }));
          if (done) toast("Session revoked", "lock-keyhole");
        } catch (e) { alert(e.message); }
      };
    });
    const revOthers = $("#btn-revoke-others");
    if (revOthers) revOthers.onclick = async () => {
      // Every device but this one leaves the list right away.
      const gone = sessions.filter((x) => !x.is_latest).map((x) => x.id);
      const done = await localFirst("Sign out other devices",
        () => { const undos = gone.map((sid) => Optim.remove("sessions", sid)); return () => undos.forEach((u) => u()); },
        () => api("/auth/sessions/revoke-others", { method: "POST", body: { refresh_token: S.refresh || "" } }));
      if (done) toast("Signed out of all other devices", "lock-keyhole");
    };
    const kbNow = $("#kb-now");
    if (kbNow) kbNow.onclick = () => openKeyBackupPrompt("backup");
    const kbRestore = $("#kb-restore");
    if (kbRestore) kbRestore.onclick = () => openKeyBackupPrompt("restore");
    const kbDelete = $("#kb-delete");
    if (kbDelete) kbDelete.onclick = async () => {
      if (!confirm("Delete the server copy of your encryption keys? Devices that already have the key keep working, but a new device will not be able to restore it.")) return;
      try {
        await api("/e2ee/backup", { method: "DELETE" });
        toast("Key backup deleted from the server", "key");
        render();
      } catch (e) {
        alert(e.message);
      }
    };
    const secAlerts = $("#sec-alerts");
    if (secAlerts) secAlerts.onchange = async () => {
      const want = !!secAlerts.checked;
      const updated = await patchMe("Alerts setting", { security_alerts: want });
      if (updated) {
        toast(want ? "Alerts on for new sign-ins" : "Alerts off", "shield-check");
      } else {
        secAlerts.checked = !want;
      }
    };
    const expBtn = $("#btn-export-data");
    if (expBtn) expBtn.onclick = async () => {
      try {
        const data = await api("/users/me/export");
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `uxaoro-export-${(S.me && S.me.username) || "account"}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast("Account export downloaded", "archive-down");
      } catch (e) { alert(e.message); }
    };
    $("#save-priv").onclick = async () => {
      const saved = await patchMe("Save privacy", {
        who_can_message: $("#wcm").value,
        who_can_invite_community: $("#wci").value,
        who_can_add_group: $("#wcg").value,
        who_can_friend: $("#wcf").value,
        who_can_call: $("#wcc").value,
        who_can_see_last_seen: $("#wcl").value,
        who_can_see_online: $("#wco").value,
        who_can_see_stories: $("#wcs").value,
      });
      if (saved) toast("Privacy settings saved", "lock-keyhole");
    };
    $("#tgl-nsfw").onclick = async () => {
      try {
        await patchMe("Content setting", { show_nsfw: !S.me.show_nsfw });
      } catch (e) { alert(e.message); }
    };
    const myNsfw = $("#tgl-my-nsfw");
    if (myNsfw) myNsfw.onclick = async () => {
      try {
        await patchMe("NSFW mark", { nsfw: !S.me.nsfw });
      } catch (e) { alert(e.message); }
    };
    const btnLinkGoogle = $("#btn-link-google");
    if (btnLinkGoogle) btnLinkGoogle.onclick = () => startSocialOAuth("google", true);
    const btnUnlinkGoogle = $("#btn-unlink-google");
    if (btnUnlinkGoogle) btnUnlinkGoogle.onclick = () => unlinkSocialOAuth("google");
    const btnLinkGithub = $("#btn-link-github");
    if (btnLinkGithub) btnLinkGithub.onclick = () => startSocialOAuth("github", true);
    const btnUnlinkGithub = $("#btn-unlink-github");
    if (btnUnlinkGithub) btnUnlinkGithub.onclick = () => unlinkSocialOAuth("github");
    $("#save-pass").onclick = async () => {
      try {
        const oldEl = $("#old-p");
        await api("/auth/password", { method: "POST", body: { old_password: oldEl ? oldEl.value : "", new_password: $("#new-p").value } });
        S.me = await api("/auth/me");
        cacheSet("me", S.me);
        alert("Password saved");
        if (oldEl) oldEl.value = "";
        $("#new-p").value = "";
        render();
      } catch (e) { alert(e.message); }
    };
    const setup = $("#t-setup");
    if (setup) setup.onclick = async () => {
      try {
        const s = await api("/auth/2fa/setup", { method: "POST" });
        $("#t-secret").textContent = (s.secret || "").replace(/(.{4})/g, "$1 ").trim();
        const a = $("#t-open");
        if (a) a.href = s.otpauth_url || "#";
        const qr = $("#t-qr");
        if (qr && s.otpauth_url) {
          qr.src = qrImageUrl(s.otpauth_url, 200);
          qr.style.display = "block";
          qr.onerror = () => { qr.style.display = "none"; };
        }
        $("#t-box").classList.remove("hidden");
      } catch (e) { $("#t-err").textContent = e.message; }
    };
    const onBtn = $("#t-on");
    if (onBtn) onBtn.onclick = async () => {
      try {
        await api("/auth/2fa/enable", { method: "POST", body: { code: ($("#t-code").value || "").trim() } });
        S.me = await api("/auth/me");
        cacheSet("me", S.me);
        render();
      } catch (e) { $("#t-err").textContent = e.message; }
    };
    const offBtn = $("#t-off");
    if (offBtn) offBtn.onclick = async () => {
      try {
        await api("/auth/2fa/disable", { method: "POST", body: { password: $("#t-pass").value, code: ($("#t-code").value || "").trim() } });
        S.me = await api("/auth/me");
        cacheSet("me", S.me);
        render();
      } catch (e) { $("#t-err").textContent = e.message; }
    };
    $("#out").onclick = async () => {
      if (!confirm("Sign out?")) return;
      try { await api("/auth/logout", { method: "POST", body: { refresh_token: S.refresh } }); } catch (_) {}
      hangup();
      clearSession();
      go("login");
    };
  }

  async function viewPremium() {
    const my = ACTIVE;
    const st = await api("/premium/status").catch(() => null);
    if (!st) { paintRoot(my, shell(`<p class="err">Could not load premium status.</p>`)); return; }
    if (!S.me) S.me = await api("/users/me").catch(() => ({}));
    const until = st.premium_until ? new Date(st.premium_until).toLocaleDateString() : "";
    const plans = st.prices.map((p) =>
      `<button class="ghost" data-buy="${p.days}">${iconAsset("wallet")}<span>${p.days} days — ${p.ux} UX</span></button>`
    ).join("");
    const opt = (key, values, current, label, noneLabel) => `
      <p class="sec-label">${label}</p>
      <div class="tabs">${[`<button class="chip ${!current ? "on" : ""}" data-cust="${key}=">${noneLabel}</button>`]
        .concat(values.filter((v) => v).map((v) =>
          `<button class="chip ${current === v ? "on" : ""}" data-cust="${key}=${v}">${v}</button>`)).join("")}</div>`;
    const cust = st.customization || {};
    const colorRow = (key, label, current) => `
      <p class="sec-label">${label}</p>
      <div class="row">
        <input type="color" value="${current || "#ff6b6b"}" data-color="${key}" style="width:48px;height:32px;padding:0;border:0;background:none">
        <span class="tiny">${current || "default"}</span>
        ${current ? `<button class="ghost" data-cust="${key}=">${iconAsset("undo-left-round")}<span>Reset</span></button>` : ""}
      </div>`;
    paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">${iconAsset("crown")} Uxaoro Premium</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      <div class="card">
        ${st.active
          ? `<p><b style="color:var(--coral)">Premium active ✓</b> until ${esc(until)}</p>`
          : `<p><b>Premium</b> — pay with <a data-go="wallet">UX</a>, no card needed.</p>`}
        <p class="tiny">
          · Developer tab (OAuth projects, Uxaoro API keys)<br>
          · ${st.stories_limit} stories a day (free: 4)<br>
          · Own up to ${st.communities_limit} communities (free: 40)<br>
          · Profile & chat customization: profile themes, name glow & colors, badges, chat bubbles
        </p>
        <div class="row" style="margin-top:10px">${st.active ? "" : plans}<span class="tiny">Balance: ${st.balance_ux} UX</span></div>
      </div>
      ${st.active ? `
      <h3>Customization</h3>
      <div class="card">
        ${colorRow("name_color", "Name color", cust.name_color)}
        ${colorRow("bio_color", "Bio color", cust.bio_color)}
        ${opt("glow", st.options.glow, cust.glow, "Name glow", "None")}
        ${opt("name_style", st.options.name_style, cust.name_style, "Name style", "Normal")}
        ${opt("badge", st.options.badge, cust.badge, "Profile badge", "None")}
        ${opt("bubble", st.options.bubble, cust.bubble, "Chat bubble", "Default")}
        ${opt("profile_theme", st.options.profile_theme, cust.profile_theme, "Profile theme", "Default")}
        <div class="err" id="cust-err"></div>
      </div>` : `<p class="tiny">Buy Premium above to unlock customization.</p>`}
    `));
    bindLook($("#root"));
    $("#back").onclick = () => history.back();
    document.querySelectorAll("[data-buy]").forEach((n) => n.onclick = async () => {
      try {
        const r = await api("/premium/buy", { method: "POST", body: { days: parseInt(n.getAttribute("data-buy"), 10) } });
        S.me = await api("/users/me");
        uxToast(`Premium active for ${r.days} more days`);
        render();
      } catch (e) { uxToast(e.message); }
    });
    const saveCust = async (patch) => {
      // The new look is applied on the spot; a rejection restores the old one.
      const before = S.me ? Object.assign({}, S.me.customization) : null;
      const r = await localFirst("Customization", () => {
        S.me.customization = Object.assign({}, S.me.customization, patch);
        return () => { S.me.customization = before; };
      }, () => api("/users/me/customization", { method: "PATCH", body: { customization: patch } }), { repaint: false });
      if (r && r.customization) S.me.customization = r.customization;
      if (!r) { const el = $("#cust-err"); if (el) el.textContent = "Not saved - the previous look is still in place."; }
      render();
    };
    document.querySelectorAll("[data-cust]").forEach((n) => n.onclick = () => {
      const [k, v] = n.getAttribute("data-cust").split("=");
      saveCust({ [k]: v || "" });
      setTimeout(render, 250);
    });
    document.querySelectorAll("[data-color]").forEach((n) => n.onchange = () => {
      saveCust({ [n.getAttribute("data-color")]: n.value });
      setTimeout(render, 250);
    });
  }

  async function viewDeveloper() {
    const my = ACTIVE;
    // The Developer tab is a Premium privilege now.
    if (!(S.me && S.me.premium)) {
      paintRoot(my, shell(`
        <div class="row spread"><h1 class="h1">${ico("star")} Developer</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
        <div class="card">
          <p><b>Uxaoro Premium required</b></p>
          <p class="tiny">Creating OAuth projects and API keys is a Premium privilege. Buy Premium with UX, then come back to verify your Developer Account.</p>
          <div class="row" style="margin-top:10px"><button data-go="premium">${iconAsset("crown")}<span>Get Premium</span></button><button class="ghost" data-go="wallet">${iconAsset("wallet")}<span>Open UX Wallet</span></button></div>
        </div>
      `));
      bindLook($("#root"));
      $("#back").onclick = () => history.back();
      return;
    }
    let st = { is_developer: !!(S.me && S.me.is_developer), totp_enabled: !!(S.me && S.me.totp_enabled), email_verified: true, email: (S.me && S.me.email) || "" };
    let projects = [];
    try { st = await api("/dev/status"); } catch (_) {}
    if (st.is_developer) {
      try { projects = await api("/dev/projects"); } catch (e) { projects = { _err: e.message }; }
    }
    const totpOn = !!(st.totp_enabled || (S.me && S.me.totp_enabled));
    const items = Array.isArray(projects) ? projects : [];
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">${ico("star")} Developer</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      ${st.is_developer ? `<p class="tiny"><b class="dev-badge">Developer Account ${iconAsset("check-circle")}</b> ${(esc(st.email || ""))}</p>` : `<p class="tiny">Get a Developer Account to create projects. Each project gets its own <b>Uxaoro API Key</b> and <b>Login with Uxaoro</b> (like Google Account).</p>`}
      ${!st.is_developer ? `
      <div class="card">
        <b>1. Confirm email code</b>
        <p class="tiny">We send a 6-digit code to ${esc(st.email || "your email")}. It proves you own the inbox.</p>
        <div class="row"><button class="ghost" id="dev-send">${iconAsset("send-square")}<span>Send code</span></button></div>
        <div style="height:8px"></div>
        <div class="row"><input id="dev-code" placeholder="6-digit code" inputmode="numeric"><button id="dev-verify">${iconAsset("shield-check")}<span>Verify &amp; become developer</span></button></div>
        <div class="err" id="dev-err"></div>
      </div>
      <div class="card">
        <b>2. Enable two-factor (required)</b>
        <p class="tiny">${totpOn ? "2FA is on ✓. Now confirm the email code above." : "Protect your developer projects with an authenticator app."}</p>
        ${totpOn ? "" : `<button class="ghost" data-go="settings">${iconAsset("settings-minimalistic")}<span>Open Settings &rarr; Authenticator</span></button>`}
      </div>
      ` : `
      <div class="card">
        <b>New project (your app)</b>
        <p class="tiny">Projects hold future features. Today: each project = one external app with its own API key + Login with Uxaoro.</p>
        <input id="dp-name" placeholder="App name (e.g. My Shop)">
        <div style="height:8px"></div>
        <input id="dp-site" placeholder="Website https://myapp.example.com (optional)">
        <div style="height:8px"></div>
        <textarea id="dp-desc" placeholder="Short description (optional)"></textarea>
        <div style="height:8px"></div>
        <textarea id="dp-redir" placeholder="Redirect URIs, one per line (e.g. https://myapp.example.com/oauth/callback)"></textarea>
        <div style="height:8px"></div>
        <button id="dp-create">${iconAsset("add-circle")}<span>Create project</span></button>
        <div class="err" id="dp-err"></div>
        <div id="dp-keybox"></div>
      </div>
      ${(projects && projects._err) ? `<p class="err">${esc(projects._err)}</p>` : items.map((p) => `
        <div class="list-item row spread" data-devproj="${esc(p.id)}">
          <span><b>${esc(p.name)}</b><div class="tiny">client_id <span class="mono">${esc(p.client_id || p.id)}</span> · key ${esc(p.api_key_prefix || "")}… · ${p.tokens_count || 0} sessions</div></span>
          <button class="ghost">${iconAsset("alt-arrow-right")}<span>Open</span></button>
        </div>`).join("") || `<p class="muted">No projects yet. Create your first app above.</p>`}
      <div class="card">
        <b>Granted access</b>
        <p class="tiny">External apps you signed into with Uxaoro Account.</p>
        <div id="grants"><p class="tiny">Loading…</p></div>
      </div>
      `}
    `))) return;
    bindSocial($("#root"));
    $("#back").onclick = () => go("settings");
    const send = $("#dev-send");
    if (send) send.onclick = async () => {
      const box = $("#dev-err");
      try { await api("/dev/request", { method: "POST" }); if (box) box.textContent = "Code sent — check your inbox"; }
      catch (e) { if (box) box.textContent = e.message; }
    };
    const verify = $("#dev-verify");
    if (verify) verify.onclick = async () => {
      const box = $("#dev-err");
      try {
        const r = await api("/dev/verify", { method: "POST", body: { code: ($("#dev-code").value || "").trim() } });
        S.me = r.user || await api("/auth/me");
        cacheSet("me", S.me);
        render();
      } catch (e) { if (box) box.textContent = e.message; }
    };
    const create = $("#dp-create");
    if (create) create.onclick = async () => {
      const box = $("#dp-err");
      if (box) box.textContent = "";
      try {
        const p = await api("/dev/projects", { method: "POST", body: {
          name: $("#dp-name").value,
          website: $("#dp-site").value,
          description: $("#dp-desc").value,
          redirect_uris: $("#dp-redir").value,
        } });
        if (p.api_key) {
          $("#dp-keybox").innerHTML = `<div class="keybox"><b>Copy your Uxaoro API Key now — it is shown once:</b><div class="mono" id="dp-key">${esc(p.api_key)}</div><div class="row"><button id="dp-copy">${iconAsset("copy")}<span>Copy key</span></button><button class="ghost" id="dp-open">${iconAsset("document-text")}<span>Open integration guide</span></button></div></div>`;
          $("#dp-copy").onclick = () => navigator.clipboard.writeText(p.api_key).catch(() => {});
          $("#dp-open").onclick = () => go("devproject", { id: p.id });
        } else {
          go("devproject", { id: p.id });
        }
      } catch (e) { if (box) box.textContent = e.message; }
    };
    document.querySelectorAll("[data-devproj]").forEach((n) => n.onclick = (e) => {
      if (e.target && e.target.tagName === "BUTTON") { go("devproject", { id: n.getAttribute("data-devproj") }); return; }
      go("devproject", { id: n.getAttribute("data-devproj") });
    });
    const grants = $("#grants");
    if (grants) {
      try {
        const list = await api("/dev/tokens");
        grants.innerHTML = (list || []).map((t) => `<div class="row spread"><span><b>${esc(t.project_name)}</b> <span class="tiny">${esc(t.created_at || "")}</span></span><button class="ghost" data-revoke="${esc(t.project_id)}">${iconAsset("link-broken")}<span>Revoke</span></button></div>`).join("") || `<p class="tiny">No external sessions.</p>`;
        grants.querySelectorAll("[data-revoke]").forEach((b) => b.onclick = async () => {
          await api("/oauth/revoke", { method: "POST", body: { client_id: b.getAttribute("data-revoke") } });
          render();
        });
      } catch (_) { grants.innerHTML = `<p class="tiny">Could not load.</p>`; }
    }
  }

  // Canonical public addresses from backend/site_adress.4set (via GET /version).
  // Used for OAuth integration snippets so external devs always see the real
  // https address instead of localhost.
  async function publicBases() {
    if (S.pub && S.pub.api) return S.pub;
    try {
      const v = await api("/version");
      if (v && (v.api_base || v.web_base)) {
        S.pub = { api: v.api_base || "", web: v.web_base || v.api_base || "" };
        return S.pub;
      }
    } catch (_) {}
    S.pub = { api: "", web: "" };
    return S.pub;
  }

  function webBase() {
    if (S.pub && S.pub.web) return S.pub.web;
    const b = apiBase();
    return b || location.origin;
  }

  async function viewDevProject(id) {
    const my = ACTIVE;
    const p = await api("/dev/projects/" + id);
    const pub = await publicBases();
    const apiB = pub.api || apiBase() || location.origin;
    const webB = pub.web || webBase();
    const redir0 = (p.redirect_uris && p.redirect_uris[0]) || "https://your-app.example.com/oauth/callback";
    const authLink = webB + "/#/oauth?client_id=" + encodeURIComponent(p.client_id || p.id) + "&redirect_uri=" + encodeURIComponent(redir0) + "&state=hello123";
    const btnHtml = `<a href="${authLink}" style="display:inline-block;background:#000;color:#fff;padding:10px 18px;border-radius:999px;font-weight:700;text-decoration:none">Continue with Uxaoro</a>`;
    const pySnippet = `import requests\nAPI = "${apiB}"\nCLIENT_ID = "${p.client_id || p.id}"\nAPI_KEY = "uxa_live_... (paste your key)"\n\n# 1) Send the user to:\n# ${authLink}\n# 2) They approve -> your redirect_uri receives ?code=...&state=...\n# 3) Exchange the code (server-side, never in browser):\nr = requests.post(f"{apiB}/oauth/token", json={\n    "client_id": CLIENT_ID,\n    "api_key": API_KEY,\n    "code": "<code from query>",\n    "redirect_uri": "${redir0}",\n})\nr.raise_for_status()\nprint(r.json()["user"])  # {id, username, display_name, avatar_url}\n\n# 4) Later, verify any access token:\nv = requests.post(f"{apiB}/oauth/verify", json={\n    "client_id": CLIENT_ID, "api_key": API_KEY, "access_token": "<token>"})\nprint(v.json()["user"])`;
    const jsSnippet = `const API = "${apiB}";\nconst CLIENT_ID = "${p.client_id || p.id}";\nconst API_KEY = "uxa_live_..."; // keep on server!\nconst REDIRECT = "${redir0}";\n\n// Login link:\n// ${authLink}\n\n// Exchange (Node, server-side):\nconst r = await fetch(API + "/oauth/token", {\n  method: "POST", headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ client_id: CLIENT_ID, api_key: API_KEY, code, redirect_uri: REDIRECT }),\n});\nconst { access_token, user } = await r.json();\n\n// Fetch profile any time:\nconst u = await fetch(API + "/oauth/userinfo", {\n  headers: { Authorization: "Bearer " + access_token, "X-Uxaoro-Api-Key": API_KEY },\n});`;
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">${esc(p.name)}</h1><button class="ghost" id="back">${ico("back")}<span>Projects</span></button></div>
      <p class="tiny">client_id <span class="mono">${esc(p.client_id || p.id)}</span> · key prefix <span class="mono">${esc(p.api_key_prefix || "")}…</span> · ${p.tokens_count || 0} active sessions</p>
      <div class="card">
        <b>Edit project</b>
        <div style="height:8px"></div>
        <input id="ep-name" value="${esc(p.name)}" placeholder="App name">
        <div style="height:8px"></div>
        <input id="ep-site" value="${esc(p.website || "")}" placeholder="Website https://...">
        <div style="height:8px"></div>
        <textarea id="ep-desc" placeholder="Description">${esc(p.description || "")}</textarea>
        <div style="height:8px"></div>
        <textarea id="ep-redir" placeholder="Redirect URIs, one per line">${esc((p.redirect_uris || []).join("\n"))}</textarea>
        <div style="height:8px"></div>
        <div class="row"><button id="ep-save">${iconAsset("check-circle")}<span>Save</span></button><button class="ghost" id="ep-regen">${iconAsset("refresh")}<span>Regenerate API key</span></button><button class="danger" id="ep-del">${iconAsset("trash-bin-trash")}<span>Delete</span></button></div>
        <div class="err" id="ep-err"></div>
        <div id="ep-keybox"></div>
      </div>
      <div class="card">
        <b>Uxaoro Account — Login with Uxaoro (like Google)</b>
        <p class="tiny">1. User clicks your button → approves <b>${esc(p.name)}</b> in Uxaoro → returns to your <span class="mono">redirect_uri</span> with <span class="mono">?code=…&state=…</span>.<br>2. Your server exchanges <span class="mono">code</span> (10 min, one-time) for <span class="mono">access_token</span> (30 days) + profile.<br>3. Keep the API key secret — only server-to-server calls.</p>
        <p class="sec-label">Button (paste into your site)</p>
        <pre class="code">${esc(btnHtml)}</pre>
        <div class="row"><button class="ghost" id="cp-btn">${iconAsset("copy")}<span>Copy button HTML</span></button><a href="${esc(authLink)}"><button>${iconAsset("code")}<span>Try login flow</span></button></a></div>
        <p class="sec-label">Authorize URL template</p>
        <pre class="code">${esc(webB + "/#/oauth?client_id=" + (p.client_id || p.id) + "&redirect_uri=<YOUR_REDIRECT>&state=<RANDOM>")}</pre>
        <p class="sec-label">Token exchange (Python)</p>
        <pre class="code">${esc(pySnippet)}</pre>
        <div class="row"><button class="ghost" id="cp-py">${iconAsset("copy")}<span>Copy Python</span></button></div>
        <p class="sec-label">Token exchange (JS / Node)</p>
        <pre class="code">${esc(jsSnippet)}</pre>
        <div class="row"><button class="ghost" id="cp-js">${iconAsset("copy")}<span>Copy JS</span></button></div>
        <p class="sec-label">Endpoints</p>
        <pre class="code">${esc("GET  " + apiB + "/oauth/project?client_id=...\nPOST " + apiB + "/oauth/token   {client_id, api_key, code, redirect_uri}\nGET  " + apiB + "/oauth/userinfo  (Bearer token + X-Uxaoro-Api-Key)\nPOST " + apiB + "/oauth/verify   {client_id, api_key, access_token}")}</pre>
      </div>
    `))) return;
    $("#back").onclick = () => go("developer");
    $("#ep-save").onclick = async () => {
      try {
        await api("/dev/projects/" + p.id, { method: "PATCH", body: {
          name: $("#ep-name").value, website: $("#ep-site").value,
          description: $("#ep-desc").value, redirect_uris: $("#ep-redir").value,
        } });
        render();
      } catch (e) { $("#ep-err").textContent = e.message; }
    };
    $("#ep-regen").onclick = async () => {
      if (!confirm("Regenerate the API key? Old key and all sessions stop working.")) return;
      try {
        const np = await api("/dev/projects/" + p.id + "/regenerate", { method: "POST" });
        if (np.api_key) {
          $("#ep-keybox").innerHTML = `<div class="keybox"><b>New key (shown once):</b><div class="mono">${esc(np.api_key)}</div><div class="row"><button id="ep-copy">${iconAsset("copy")}<span>Copy key</span></button></div></div>`;
          $("#ep-copy").onclick = () => navigator.clipboard.writeText(np.api_key).catch(() => {});
        } else render();
      } catch (e) { $("#ep-err").textContent = e.message; }
    };
    $("#ep-del").onclick = async () => {
      if (!confirm("Delete this project?")) return;
      await api("/dev/projects/" + p.id, { method: "DELETE" });
      go("developer");
    };
    $("#cp-btn").onclick = () => navigator.clipboard.writeText(btnHtml).catch(() => {});
    $("#cp-py").onclick = () => navigator.clipboard.writeText(pySnippet).catch(() => {});
    $("#cp-js").onclick = () => navigator.clipboard.writeText(jsSnippet).catch(() => {});
  }

  async function viewOAuth() {
    const my = ACTIVE;
    const q = S.params || {};
    const clientId = q.client_id || "";
    const redirectUri = q.redirect_uri || "";
    const state = q.state || "";
    if (!clientId || !redirectUri) {
      if (!paintRoot(my, shell(`<h1 class="h1">Login with Uxaoro</h1><p class="err">Missing client_id or redirect_uri. Open this page from the app's “Continue with Uxaoro” button.</p>`))) return;
      return;
    }
    let proj = null;
    try { proj = await api("/oauth/project?client_id=" + encodeURIComponent(clientId)); }
    catch (e) { paintRoot(my, shell(`<h1 class="h1">Login with Uxaoro</h1><p class="err">${esc(e.message)}</p>`)); return; }
    const back = (params) => {
      const sep = redirectUri.includes("?") ? "&" : "?";
      location.href = redirectUri + sep + params;
    };
    if (!paintRoot(my, shell(`
      <h1 class="h1">Login with Uxaoro</h1>
      <div class="card">
        <b>${esc(proj.name)}</b>
        <p class="tiny">${esc(proj.description || "")}</p>
        <p class="tiny">by @${esc((proj.owner && proj.owner.username) || "?")}${proj.website ? " · " + esc(proj.website) : ""}</p>
        <p>This app wants your public Uxaoro profile: <b>username, display name, avatar</b>. It never sees your password or messages.</p>
        <p class="tiny">Signed in as <b>${esc(nameOf(S.me))}</b> (@${esc(S.me.username)}) · redirect: <span class="mono">${esc(redirectUri)}</span></p>
        <div class="row"><button id="oa-yes">${iconAsset("check-circle")}<span>Allow</span></button><button class="ghost" id="oa-no">${iconAsset("close-circle")}<span>Deny</span></button></div>
        <div class="err" id="oa-err"></div>
      </div>
    `))) return;
    $("#oa-no").onclick = () => back("error=access_denied" + (state ? "&state=" + encodeURIComponent(state) : ""));
    $("#oa-yes").onclick = async () => {
      try {
        const r = await api("/oauth/authorize", { method: "POST", body: { client_id: clientId, redirect_uri: redirectUri, state, scope: "profile" } });
        back("code=" + encodeURIComponent(r.code) + (state ? "&state=" + encodeURIComponent(state) : ""));
      } catch (e) { $("#oa-err").textContent = e.message; }
    };
  }

  async function viewAdmin() {
    const my = ACTIVE;
    if (!isStaff()) { go("feed", {}, "feed"); return; }
    const tab = S.params.tab || "overview";
    const tabs = isAdmin()
      ? [["overview", "Overview"], ["users", "Users"], ["posts", "Posts"], ["badges", "Badges"], ["sales", "Sales"], ["reports", "Reports"], ["moderation", "Moderation"], ["ux", "UX"], ["server", "Server"], ["audit", "Audit"]]
      : [["overview", "Overview"], ["users", "Users"], ["posts", "Posts"], ["badges", "Badges"], ["sales", "Sales"], ["reports", "Reports"], ["moderation", "Moderation"]];
    let body = "";
    if (tab === "overview") {
      const s = await api("/admin/stats").catch(() => null);
      const bPage = await api("/badges").catch(() => ({ items: [] }));
      const sPage = await api("/sales").catch(() => ({ items: [] }));
      body = (s ? `
        <div class="card"><div class="tiny">Users</div><p class="stat">${s.users}</p></div>
        <div class="card"><div class="tiny">Online now</div><p class="stat">${s.online}</p></div>
        <div class="card"><div class="tiny">Posts</div><p class="stat">${s.posts}</p></div>
        <div class="card"><div class="tiny">Communities</div><p class="stat">${s.communities}</p></div>
        <div class="card"><div class="tiny">Messages (ciphertext)</div><p class="stat">${s.messages}</p></div>
        <div class="card"><div class="tiny">Open reports</div><p class="stat">${s.reports_open}</p></div>
        ${s.nsfw_posts != null ? `<div class="card"><div class="tiny">NSFW posts</div><p class="stat">${s.nsfw_posts}</p></div>
        <div class="card"><div class="tiny">NSFW accounts</div><p class="stat">${s.nsfw_users}</p></div>` : ""}
      ` : `<p class="muted">Could not load stats.</p>`) + `
        <div class="card row spread">
          <div><b>${iconAsset("medal-star")} Badges</b><div class="tiny">${(bPage.items || []).length} badges · ${(bPage.promocodes || []).length} promocodes</div></div>
          <button class="ghost" data-atab="badges">${iconAsset("medal-star")}<span>Open Badges</span></button>
        </div>
        <div class="card row spread">
          <div><b>${iconAsset("tag-price")} Sales</b><div class="tiny">${(sPage.items || []).length} active sales</div></div>
          <button class="ghost" data-atab="sales">${iconAsset("tag-price")}<span>Open Sales</span></button>
        </div>
      `;
    } else if (tab === "users") {
      const q = S.params.q || "";
      const page = await api("/admin/users?q=" + encodeURIComponent(q)).catch(() => ({ items: [] }));
      body = `
        <div class="card row"><input id="aq" placeholder="Search users" value="${esc(q)}"><button id="as">${iconAsset("card-search")}<span>Search</span></button></div>
        ${(page.items || []).map((u) => `<div class="list-item">
          <b>${esc(nameOf(u))}</b> <span class="tiny">@${esc(u.username)} · ${esc(u.role)}${u.banned ? " · BANNED" : ""}${u.nsfw ? ` · <span class="nsfw-tag">NSFW${u.nsfw_locked ? ` ${iconAsset("lock-keyhole")}` : ""}</span>` : ""}</span>
          <div class="row">
            ${u.nsfw ? `<button class="ghost" data-ansfw="${esc(u.id)}" data-on="0">${iconAsset("eye-closed")}<span>Remove NSFW</span></button>` : `<button class="ghost" data-ansfw="${esc(u.id)}" data-on="1" data-lock="1">${iconAsset("flag")}<span>Mark NSFW (lock)</span></button>`}
            ${!u.nsfw ? `<button class="ghost" data-ansfw="${esc(u.id)}" data-on="1">${iconAsset("flag")}<span>Mark NSFW (free)</span></button>` : ""}
            ${u.nsfw && !u.nsfw_manual ? `<button class="ghost" data-ansfw="${esc(u.id)}" data-manual="1">${iconAsset("refresh")}<span>Back to automatic</span></button>` : ""}
            ${u.banned ? `<button class="ghost" data-ban="${esc(u.id)}" data-on="0">${iconAsset("shield-check")}<span>Unban</span></button>` : `<button class="ghost" data-ban="${esc(u.id)}" data-on="1">${iconAsset("shield-cross")}<span>Ban</span></button>`}
            ${isAdmin() ? (u.role !== "moderator"
              ? `<button class="ghost" data-role="${esc(u.id)}" data-r="moderator">${iconAsset("shield-user")}<span>Make mod</span></button>`
              : `<button class="ghost" data-role="${esc(u.id)}" data-r="user">${iconAsset("shield-minus")}<span>Remove mod</span></button>`) : ""}
            ${isAdmin() && u.role !== "admin" ? `<button class="ghost" data-role="${esc(u.id)}" data-r="admin">${iconAsset("shield-star")}<span>Make admin</span></button>` : ""}
          </div>
        </div>`).join("")}
      `;
    } else if (tab === "posts") {
      const only = S.params.nsfw === "1";
      const page = await api("/admin/posts" + (only ? "?nsfw=1" : "")).catch(() => ({ items: [] }));
      body = `
        <div class="tabs">
          <button class="chip ${only ? "" : "on"}" data-ansfwtab="0">All posts</button>
          <button class="chip ${only ? "on" : ""}" data-ansfwtab="1">NSFW flagged</button>
        </div>
        ${(page.items || []).map((p) => `<div class="list-item">
          <b>${esc(nameOf(p.author))}</b> ${nsfwBadge(p)}
          <div class="tiny">${esc((p.text || "").slice(0, 280))}</div>
          ${p.nsfw_reason ? `<div class="tiny">Reason: ${esc(p.nsfw_reason)}${typeof p.nsfw_score === "number" ? ` · confidence ${Math.round(p.nsfw_score * 100)}%` : ""}</div>` : ""}
          <button class="ghost" data-adel="${esc(p.id)}">${iconAsset("trash-bin-trash")}<span>Delete post</span></button>
        </div>`).join("") || `<p class="muted">No posts</p>`}`;
    } else if (tab === "reports") {
      const items = await api("/admin/reports?status=open").catch(() => []);
      body = (items || []).map((r) => `<div class="list-item">
        <b>${esc(r.target_type)} · ${esc(r.reason)}</b>
        <div>${esc(r.details || "")}</div>
        <button class="ghost" data-res="${esc(r.id)}" data-st="resolved">${iconAsset("check-circle")}<span>Resolve</span></button>
        <button class="ghost" data-res="${esc(r.id)}" data-st="dismissed">${iconAsset("close-circle")}<span>Dismiss</span></button>
      </div>`).join("") || `<p class="muted">No open reports</p>`;
    } else if (tab === "moderation") {
      const m = await api("/admin/moderation").catch(() => null);
      if (!m) {
        body = `<p class="muted">Could not load the moderation status.</p>`;
      } else {
        const c = m.config || {};
        const last = c.last_result || {};
        body = `
        <div class="card">
          <div class="row spread"><b>Hourly AI moderator</b><b>${c.enabled ? (c.configured ? "running" : "no api_key — idle") : "disabled"}</b></div>
          <div class="tiny">${esc(c.provider || "")} · ${esc(c.model || "")} · ${esc(c.base_url || "")}</div>
          <div class="tiny">every ${Math.round((c.interval_seconds || 3600) / 60)} min · last run ${esc(c.last_run_at || "never")} · next ${esc(c.next_run_at || "n/a")}</div>
          ${last && (last.checked != null) ? `<div class="tiny">Last pass: checked ${last.checked}, flagged ${last.flagged}${last.errors ? `, errors ${last.errors}` : ""}${last.reason ? ` (${esc(last.reason)})` : ""}</div>` : ""}
          <div class="row" style="margin-top:6px">
            <span class="chip">Pending ${c.pending || 0}</span>
            <span class="chip">Flagged posts ${c.flagged_posts || 0}</span>
            <span class="chip">NSFW accounts ${c.marked_accounts || 0}</span>
          </div>
          <div class="tiny" style="margin-top:6px">Weekly rule: ≥ ${Math.round((c.weekly_ratio || 0.5) * 100)}% NSFW posts over ${c.weekly_window_days || 7} days (min ${c.weekly_min_posts || 4}) → account marked <b>and locked</b>${c.auto_account_marks ? "" : " (rule disabled)"}. Manual marks are exempt.</div>
          <div class="tiny">System prompt: ${esc(c.prompt_source || "built-in")} (${c.prompt_chars || 0} chars)</div>
          <div style="height:8px"></div>
          <button id="mod-run">${iconAsset("shield-check")}<span>Run moderation now</span></button>
          <div class="err" id="mod-err"></div>
        </div>
        <p class="sec-label">Recent verdicts</p>
        ${(m.log || []).map((l) => `<div class="list-item">
          <b>${l.nsfw ? `<span class="nsfw-tag">NSFW</span>` : "safe"}</b> <span class="tiny">${esc(l.source)} · ${esc(l.verdict || "")} · score ${l.score}${l.created_at ? " · " + esc(when(l.created_at)) : ""}</span>
          <div class="tiny">${esc(l.reason || "")}${l.categories ? ` <b>(${esc(l.categories)})</b>` : ""}</div>
        </div>`).join("") || `<p class="muted">Nothing classified yet.</p>`}`;
      }
    } else if (tab === "ux") {
      const q = S.params.q || "";
      const page = await api("/admin/users?q=" + encodeURIComponent(q)).catch(() => ({ items: [] }));
      body = `
        <div class="card row"><input id="uxq" placeholder="Search users" value="${esc(q)}"><button id="uxqs">${iconAsset("card-search")}<span>Search</span></button></div>
        ${(page.items || []).map((u) => `<div class="list-item">
          <b>${esc(nameOf(u))}</b> <span class="tiny">@${esc(u.username)} · ${typeof u.balance_ux === "number" ? u.balance_ux + " UX" : ""}</span>
          <div class="row">
            <input class="ux-amt" data-uxu="${esc(u.id)}" type="number" step="any" placeholder="±UX" style="max-width:110px">
            <input class="ux-reason" data-uxr="${esc(u.id)}" placeholder="Reason" style="max-width:160px">
            <button class="ghost" data-uxg="${esc(u.id)}">${iconAsset("wallet")}<span>Apply</span></button>
          </div>
        </div>`).join("")}
      `;
    } else if (tab === "server") {
      const s = await api("/admin/settings").catch(() => null);
      if (!s) body = `<p class="err">Admin only</p>`;
      else body = `<div class="card">
        <div class="row spread"><span>Registration open</span><button class="ghost" id="reg-open">${s.registration_open ? iconAsset("check-circle") : iconAsset("close-circle")}<span>${s.registration_open ? "Open" : "Closed"}</span></button></div>
        <div class="row spread"><span>Maintenance mode</span><button class="ghost" id="maint">${s.maintenance ? iconAsset("danger-triangle") : iconAsset("check-circle")}<span>${s.maintenance ? "On" : "Off"}</span></button></div>
        <div style="height:8px"></div>
        <input id="motd" placeholder="Message of the day" value="${esc(s.motd || "")}">
        <div style="height:8px"></div>
        <button id="save-motd">${iconAsset("check-circle")}<span>Save MOTD</span></button>
      </div>`;
    } else if (tab === "badges") {
      const page = await api("/badges").catch(() => ({ items: [], promocodes: [] }));
      const bItems = page.items || [];
      const pItems = page.promocodes || [];
      body = `
        <div class="card">
          <h3>Create Badge</h3>
          <input id="adm-b-name" placeholder="Badge name (e.g. Early Supporter)">
          <div style="height:8px"></div>
          <input id="adm-b-desc" placeholder="Description (optional)">
          <div style="height:8px"></div>
          <div class="row">
            <input id="adm-b-img" placeholder="Image .webp URL" value="/uploads/badges/default.webp">
            <button class="ghost" id="adm-b-upload">${iconAsset("upload")}<span>Upload .webp</span></button>
          </div>
          <div style="height:8px"></div>
          <button id="adm-b-create">${iconAsset("medal-star")}<span>Create badge</span></button>
          <div class="tiny" id="adm-b-msg" style="margin-top:6px"></div>
        </div>
        <div class="card">
          <h3>Create Badge Promocode</h3>
          <select id="adm-p-badge">
            ${bItems.length ? bItems.map((b) => `<option value="${esc(b.id)}">${esc(b.name)} (${esc(b.id)})</option>`).join("") : `<option value="">Create a badge first</option>`}
          </select>
          <div style="height:8px"></div>
          <div class="row">
            <input id="adm-p-code" placeholder="Promocode (e.g. VIP-2026)">
            <button class="ghost" id="adm-p-gen">${iconAsset("refresh")}<span>Random code</span></button>
          </div>
          <div style="height:8px"></div>
          <button id="adm-p-create">${iconAsset("ticket")}<span>Create promocode</span></button>
          <div class="tiny" id="adm-p-msg" style="margin-top:6px"></div>
        </div>
        <div class="card">
          <h3>All Badges (${bItems.length})</h3>
          ${bItems.map((b) => `
            <div class="list-item row spread">
              <div>
                <span class="badge-pill" style="background:var(--coral);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold">${iconAsset("medal-star")} ${esc(b.name || "")}</span>
                <span class="tiny mono" style="margin-left:6px">${esc(b.id)}</span>
                <div class="tiny">${esc(b.description || "")} · <span class="mono">${esc(b.image_webp || "")}</span></div>
              </div>
              <button class="ghost" data-del-badge="${esc(b.id)}">${iconAsset("trash-bin-trash")}<span>Delete</span></button>
            </div>
          `).join("") || `<p class="muted">No badges created yet.</p>`}
        </div>
        <div class="card">
          <h3>Promocodes (${pItems.length})</h3>
          ${pItems.map((p) => `
            <div class="list-item row spread">
              <div>
                <b class="mono">${esc(p.code)}</b> → <b>${esc(p.badge_name || p.badge_id)}</b>
                <div class="tiny">${p.used_by ? `Used by ${esc(p.used_by)}` : `<span style="color:var(--coral)">Available</span>`}</div>
              </div>
              <div class="row">
                <button class="ghost" data-copy-promo="${esc(p.code)}">${iconAsset("copy")}<span>Copy</span></button>
                ${!p.used_by ? `<button class="ghost" data-use-promo="${esc(p.code)}">${iconAsset("ticket")}<span>Apply to me</span></button>` : ""}
              </div>
            </div>
          `).join("") || `<p class="muted">No promocodes created yet.</p>`}
        </div>
      `;
    } else if (tab === "sales") {
      const sPage = await api("/sales").catch(() => ({ items: [] }));
      const bPage = await api("/badges").catch(() => ({ items: [] }));
      const sItems = sPage.items || [];
      const bItems = bPage.items || [];
      body = `
        <div class="card">
          <h3>Create Sale</h3>
          <input id="adm-s-name" placeholder="Sale name (e.g. Autumn Bundle)">
          <div style="height:8px"></div>
          <p class="tiny">Price in UX (0 = Free):</p>
          <input id="adm-s-price" type="number" min="0" step="any" value="0" placeholder="Price in UX (0 = Free)">
          <div style="height:8px"></div>
          <label class="row" style="gap:8px;cursor:pointer">
            <input type="checkbox" id="adm-s-prem" style="width:auto" checked>
            <span>Include Uxaoro Premium</span>
          </label>
          <div style="height:6px"></div>
          <div class="row" style="gap:8px">
            <input id="adm-s-prem-days" type="number" min="1" step="1" value="30" placeholder="Premium days (any length, e.g. 7, 30, 90, 365)" style="max-width:260px">
            <span class="tiny muted">days of Premium</span>
          </div>
          <div style="height:8px"></div>
          <p class="tiny">Include Badges in this Sale:</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 8px">
            ${bItems.length ? bItems.map((b) => `
              <label class="chip" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">
                <input type="checkbox" data-sale-badge="${esc(b.id)}" style="width:auto">
                <span>${iconAsset("medal-star")} ${esc(b.name)}</span>
              </label>
            `).join("") : `<span class="tiny muted">No badges yet (create badges in the Badges tab to bundle them).</span>`}
          </div>
          <p class="tiny">Target Users Rule:</p>
          <select id="adm-s-rule">
            <option value="all">All users (everyone can see & apply)</option>
            <option value="list">Specific users only (whitelist)</option>
            <option value="except">All users except (blacklist)</option>
          </select>
          <div style="height:8px"></div>
          <label class="row" style="gap:8px;cursor:pointer">
            <input type="checkbox" id="adm-s-once" style="width:auto">
            <span>One-time — each user can activate this sale only once</span>
          </label>
          <div style="height:8px"></div>
          <p class="tiny">Time limit (optional — leave empty for no limit):</p>
          <div class="row" style="gap:12px;flex-wrap:wrap">
            <label class="row tiny" style="gap:6px">Starts
              <input id="adm-s-starts" type="datetime-local" style="width:auto">
            </label>
            <label class="row tiny" style="gap:6px">Ends
              <input id="adm-s-ends" type="datetime-local" style="width:auto">
            </label>
          </div>
          <div style="height:8px"></div>
          <input id="adm-s-users" placeholder="Usernames or IDs (comma-separated, for list / except)">
          <div style="height:8px"></div>
          <button id="adm-s-create">${iconAsset("tag-price")}<span>Create sale</span></button>
          <div class="tiny" id="adm-s-msg" style="margin-top:6px"></div>
        </div>
        <div class="card">
          <h3>Active Sales (${sItems.length})</h3>
          ${sItems.map((s) => {
            const win = saleWindowInfo(s);
            return `
            <div class="list-item row spread">
              <div>
                <span class="badge-pill" style="background:var(--coral);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold">${iconAsset("medal-star")} ${esc(s.name || "")}</span>
                ${s.once ? `<span class="nsfw-tag" style="margin-left:4px" title="Each user can activate this sale only once">1×</span>` : ""}
                ${win.chip}
                <span class="tiny mono" style="margin-left:6px">ID: ${esc(s.id)}</span>
                <div class="tiny">${esc(formatSalePerks(s.items, s))} · Rule: <b>${esc(s.users_rule || "all")}</b>${Array.isArray(s.users) && s.users.length ? ` (${esc(s.users.join(", "))})` : ""}</div>
                ${win.text ? `<div class="tiny">${esc(win.text)}</div>` : ""}
              </div>
              <div class="row">
                <button class="ghost" data-apply-sale="${esc(s.id)}">${iconAsset("tag-price")}<span>${s.once && s.applied_by_me ? "Activated" : "Apply to me"}</span></button>
                <button class="ghost" data-del-sale="${esc(s.id)}">${iconAsset("trash-bin-trash")}<span>Delete</span></button>
              </div>
            </div>
          `;}).join("") || `<p class="muted">No sales created yet.</p>`}
        </div>
      `;
    } else if (tab === "audit") {
      const page = await api("/admin/audit").catch(() => ({ items: [] }));
      body = (page.items || []).map((a) => `<div class="list-item"><b>${esc(a.action)}</b><div class="tiny">${esc(a.target_type)} ${esc(a.target_id)} ${esc(a.details || "")}</div></div>`).join("") || `<p class="muted">Empty</p>`;
    }
    if (!paintRoot(my, shell(`
      <div class="row spread"><h1 class="h1">Control panel</h1><button class="ghost" id="back">${ico("back")}<span>Back</span></button></div>
      <p class="tiny">${isAdmin() ? "Administrator" : "Moderator"}</p>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="chip ${tab === k ? "on" : ""}" data-atab="${k}">${l}</button>`).join("")}</div>
      ${body}
    `))) return;
    $("#back").onclick = () => go("profile", {}, "profile");
    document.querySelectorAll("[data-atab]").forEach((n) => n.onclick = () => go("admin", { tab: n.getAttribute("data-atab") }));
    bindBadgesAndSales("adm", $("#root"));
    const bUp = $("#adm-b-upload");
    if (bUp) bUp.onclick = async () => {
      try {
        const f = await UxaMedia.pickPhoto();
        if (!f) return;
        const fd = new FormData();
        fd.append("file", f);
        fd.append("subdir", "badges");
        const up = await api("/media/upload", { method: "POST", body: fd });
        const imgInp = $("#adm-b-img");
        if (imgInp && up && up.url) {
          imgInp.value = up.url.endsWith(".webp") ? up.url : (up.url + ".webp");
        }
      } catch (e) { alert(e.message); }
    };
    const bCreate = $("#adm-b-create");
    if (bCreate) bCreate.onclick = async () => {
      const name = ($("#adm-b-name") && $("#adm-b-name").value || "").trim();
      const description = ($("#adm-b-desc") && $("#adm-b-desc").value || "").trim();
      let image_webp = ($("#adm-b-img") && $("#adm-b-img").value || "").trim() || "/uploads/badges/default.webp";
      if (!image_webp.endsWith(".webp")) image_webp += ".webp";
      const msg = $("#adm-b-msg");
      try {
        await api("/badges", { method: "POST", body: { name, description, image_webp } });
        toast("Badge created!", "medal-star");
        render();
      } catch (e) { if (msg) msg.textContent = e.message; }
    };
    const pGen = $("#adm-p-gen");
    if (pGen) pGen.onclick = () => {
      const inp = $("#adm-p-code");
      if (inp) inp.value = "UXA-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    };
    const pCreate = $("#adm-p-create");
    if (pCreate) pCreate.onclick = async () => {
      const badge_id = ($("#adm-p-badge") && $("#adm-p-badge").value || "").trim();
      const code = ($("#adm-p-code") && $("#adm-p-code").value || "").trim();
      const msg = $("#adm-p-msg");
      try {
        await api("/badges/promocode", { method: "POST", body: { badge_id, code } });
        toast("Promocode created!", "ticket-sale");
        render();
      } catch (e) { if (msg) msg.textContent = e.message; }
    };
    document.querySelectorAll("[data-del-badge]").forEach((n) => n.onclick = async () => {
      try {
        await api("/badges/" + encodeURIComponent(n.getAttribute("data-del-badge")), { method: "DELETE" });
        render();
      } catch (e) { alert(e.message); }
    });
    document.querySelectorAll("[data-copy-promo]").forEach((n) => n.onclick = () => {
      const c = n.getAttribute("data-copy-promo");
      if (navigator.clipboard) navigator.clipboard.writeText(c).catch(() => {});
      toast("Copied: " + c, "clipboard");
    });
    document.querySelectorAll("[data-use-promo]").forEach((n) => n.onclick = async () => {
      try {
        await api("/badges/apply", { method: "POST", body: { code: n.getAttribute("data-use-promo") } });
        S.me = await api("/auth/me").catch(() => S.me);
        if (S.me) cacheSet("me", S.me);
        toast("Badge applied!", "medal-star");
        render();
      } catch (e) { alert(e.message); }
    });
    const sCreate = $("#adm-s-create");
    if (sCreate) sCreate.onclick = async () => {
      const name = ($("#adm-s-name") && $("#adm-s-name").value || "").trim();
      const price_ux = Math.max(0, parseFloat($("#adm-s-price") && $("#adm-s-price").value || "0") || 0);
      const premium = !!($("#adm-s-prem") && $("#adm-s-prem").checked);
      const rawDays = parseInt($("#adm-s-prem-days") && $("#adm-s-prem-days").value || "30", 10);
      // Keep in sync with the server cap (premium.PREMIUM_DAYS_MAX).
      const premium_days = premium ? Math.min(36500, Math.max(1, isNaN(rawDays) ? 30 : rawDays)) : 0;
      const badges = [];
      document.querySelectorAll("[data-sale-badge]").forEach((cb) => {
        if (cb.checked) badges.push(cb.getAttribute("data-sale-badge"));
      });
      const users_rule = ($("#adm-s-rule") && $("#adm-s-rule").value) || "all";
      const once = !!($("#adm-s-once") && $("#adm-s-once").checked);
      const startsLocal = ($("#adm-s-starts") && $("#adm-s-starts").value || "").trim();
      const endsLocal = ($("#adm-s-ends") && $("#adm-s-ends").value || "").trim();
      const starts_at = startsLocal ? new Date(startsLocal).toISOString() : "";
      const ends_at = endsLocal ? new Date(endsLocal).toISOString() : "";
      const usersRaw = ($("#adm-s-users") && $("#adm-s-users").value || "").trim();
      const users = usersRaw ? usersRaw.split(",").map((x) => x.trim()).filter(Boolean) : [];
      const msg = $("#adm-s-msg");
      try {
        await api("/sales", { method: "POST", body: { name, price_ux, premium_days, once, starts_at, ends_at, items: { premium: premium_days > 0, premium_days, price_ux, badges }, users_rule, users } });
        toast("Sale created!", "tag-price");
        render();
      } catch (e) { if (msg) msg.textContent = e.message; }
    };
    document.querySelectorAll("[data-del-sale]").forEach((n) => n.onclick = async () => {
      try {
        await api("/sales/" + encodeURIComponent(n.getAttribute("data-del-sale")), { method: "DELETE" });
        render();
      } catch (e) { alert(e.message); }
    });
    const as = $("#as");
    if (as) as.onclick = () => go("admin", { tab: "users", q: $("#aq").value });
    document.querySelectorAll("[data-ban]").forEach((n) => n.onclick = async () => {
      await api("/admin/users/" + n.getAttribute("data-ban") + "/ban", { method: "POST", body: { banned: n.getAttribute("data-on") === "1", reason: "Banned by staff" } });
      render();
    });
    document.querySelectorAll("[data-role]").forEach((n) => n.onclick = async () => {
      await api("/admin/users/" + n.getAttribute("data-role") + "/role", { method: "POST", body: { role: n.getAttribute("data-r") } });
      render();
    });
    document.querySelectorAll("[data-adel]").forEach((n) => n.onclick = async () => {
      await api("/admin/posts/" + n.getAttribute("data-adel"), { method: "DELETE" });
      render();
    });
    document.querySelectorAll("[data-ansfw]").forEach((n) => n.onclick = async () => {
      try {
        await api("/admin/users/" + n.getAttribute("data-ansfw") + "/nsfw", { method: "POST", body: {
          nsfw: n.getAttribute("data-on") === "1",
          locked: n.getAttribute("data-lock") === "1",
          manual: n.getAttribute("data-manual") === "1",
        } });
        render();
      } catch (e) { alert(e.message); }
    });
    document.querySelectorAll("[data-ansfwtab]").forEach((n) => n.onclick = () => {
      go("admin", { tab: "posts", nsfw: n.getAttribute("data-ansfwtab") === "1" ? "1" : "" });
    });
    const modRun = $("#mod-run");
    if (modRun) modRun.onclick = async () => {
      modRun.disabled = true;
      const err = $("#mod-err");
      try {
        const r = await api("/admin/moderation/run", { method: "POST" });
        if (err) err.textContent = `Checked ${r.checked}, flagged ${r.flagged}${r.errors ? `, errors ${r.errors}` : ""}${r.reason ? ` — ${r.reason}` : ""}`;
        render();
      } catch (e) {
        modRun.disabled = false;
        if (err) err.textContent = e.message;
      }
    };
    document.querySelectorAll("[data-res]").forEach((n) => n.onclick = async () => {
      await api("/admin/reports/" + n.getAttribute("data-res") + "/resolve", { method: "POST", body: { status: n.getAttribute("data-st") } });
      render();
    });
    const uxqs = $("#uxqs");
    if (uxqs) uxqs.onclick = () => go("admin", { tab: "ux", q: $("#uxq").value });
    document.querySelectorAll("[data-uxg]").forEach((n) => n.onclick = async () => {
      const target = n.getAttribute("data-uxg");
      const amt = document.querySelector(`.ux-amt[data-uxu="${cssEsc(target)}"]`);
      const reason = document.querySelector(`.ux-reason[data-uxr="${cssEsc(target)}"]`);
      try {
        const r = await api("/admin/users/" + target + "/ux", { method: "POST", body: {
          amount: parseFloat(amt && amt.value || 0),
          reason: reason ? reason.value.trim() : "",
        } });
        alert(`Done. New balance: ${r.balance_ux} UX`);
        render();
      } catch (e) { alert(e.message); }
    });
    const ro = $("#reg-open");
    if (ro) ro.onclick = async () => {
      const s = await api("/admin/settings");
      await api("/admin/settings", { method: "POST", body: { registration_open: !s.registration_open } });
      render();
    };
    const mt = $("#maint");
    if (mt) mt.onclick = async () => {
      const s = await api("/admin/settings");
      await api("/admin/settings", { method: "POST", body: { maintenance: !s.maintenance } });
      render();
    };
    const sm = $("#save-motd");
    if (sm) sm.onclick = async () => {
      await api("/admin/settings", { method: "POST", body: { motd: $("#motd").value } });
      render();
    };
  }

  // ---- UX digital currency ----
  function onUxEvent(data) {
    if (!data) return;
    if (S.me) {
      if (typeof data.balance_ux === "number") S.me.balance_ux = data.balance_ux;
      const msg = data.kind === "gift_in" ? `${data.from || "Someone"} sent you ${data.amount} UX`
        : data.kind === "admin" ? `${data.amount > 0 ? "+" : ""}${data.amount} UX from the admin`
        : "UX balance updated";
      uxToast(msg);
    }
  }

  function toast(text, icon) {
    let t = $("#ux-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "ux-toast";
      t.style.cssText = "position:fixed;bottom:76px;right:16px;background:var(--card,#1c1c24);color:var(--text,#eee);border:1px solid var(--line,#333);border-radius:12px;padding:10px 14px;z-index:9999;box-shadow:0 6px 24px rgba(0,0,0,.35);font-size:14px;display:flex;align-items:center;gap:8px";
      document.body.appendChild(t);
    }
    t.replaceChildren();
    if (icon) {
      const wrapper = document.createElement("span");
      wrapper.innerHTML = iconAsset(icon);
      const image = wrapper.firstElementChild;
      if (image) {
        image.style.width = "18px";
        image.style.height = "18px";
        t.appendChild(image);
      }
    }
    t.appendChild(document.createTextNode(String(text ?? "")));
    t.style.opacity = "1";
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.opacity = "0"; }, 4000);
  }

  function uxToast(text) {
    toast(text, "wallet");
  }

  // ---- share links (profiles, communities, group invite links) ----
  function webBase() {
    return location.href.split("#")[0].split("?")[0];
  }

  function shareUrl(hash) {
    return webBase() + "#" + String(hash || "").replace(/^#?\/?/, "/");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-100px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  async function shareLink(url, title, text) {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "Uxaoro", text: text || "", url });
        return;
      } catch (_) {}
    }
    toast((await copyText(url)) ? "Link copied" : url, "");
  }

  async function viewWallet() {
    const my = ACTIVE;
    const w = await api("/ux/wallet").catch(() => null);
    if (!w) { paintRoot(my, shell(`<p class="err">Could not load wallet.</p>`)); return; }
    const tx = Optim.merge("uxtx", (w.transactions && w.transactions.items) || []);
    const daily = w.daily || {};
    const bot = w.telegram_bot_username
      ? `<a class="ghost" href="https://t.me/${esc(w.telegram_bot_username)}" target="_blank" rel="noopener">Open Telegram bot</a>`
      : `<span class="tiny muted">Telegram bot is not configured on this server.</span>`;
    paintRoot(my, shell(`
      <h1 class="h1">${iconAsset("wallet")} UX Wallet</h1>
      <div class="card">
        <div class="row spread">
          <div>
            <b>${iconAsset("calendar-mark")} Daily UX Check-In &amp; Streak</b>
            <div class="tiny">Streak: <b>${daily.streak || 0} day${daily.streak === 1 ? "" : "s"}</b> · Total claimed: ${daily.total_claimed_ux || 0} UX ${daily.premium_multiplier > 1 ? `· <span style="color:var(--coral)">✦ 2x Premium Bonus</span>` : ""}</div>
          </div>
          ${daily.claimed_today
            ? `<button type="button" class="ghost" disabled>${iconAsset("check-circle")}<span>Claimed today</span></button>`
            : `<button type="button" id="ux-daily-claim">${iconAsset("gift")}<span>Claim +${daily.reward_ux || 5} UX</span></button>`}
        </div>
      </div>
      <div class="card">
        <div class="tiny">Balance</div>
        <p class="stat">${w.balance_ux} UX</p>
        <div class="tiny">${w.cryptobot_enabled ? `1 UX = ${w.rate} ${esc(w.asset)} · buy in the Telegram bot` : "Purchases are not enabled on this server."}</div>
        <div class="row" style="margin-top:10px">
          ${w.cryptobot_enabled ? `<input id="ux-buy-amt" type="number" min="1" step="1" placeholder="Amount of UX" style="max-width:160px"><button id="ux-buy">${iconAsset("wallet")}<span>Buy UX</span></button>` : ""}
          ${bot}
        </div>
        ${w.telegram_linked ? `<p class="tiny">✅ Telegram linked</p>` : `<div class="row" style="margin-top:8px"><button class="ghost" id="ux-link">${iconAsset("link")}<span>Link Telegram</span></button><span class="tiny" id="ux-code"></span></div>`}
      </div>
      <div class="card">
        <b>Gift UX</b>
        <div class="row" style="margin-top:8px">
          <input id="ux-g-user" placeholder="@username" style="max-width:160px">
          <input id="ux-g-amt" type="number" min="1" step="any" placeholder="UX" style="max-width:100px">
          <input id="ux-g-msg" placeholder="Message (optional)">
          <button id="ux-gift">${iconAsset("send-square")}<span>Send</span></button>
        </div>
        <p class="tiny">Send UX to anyone, just like that.</p>
      </div>
      <h3>History</h3>
      ${tx.map((t) => `<div class="list-item row spread">
        <span>${t.amount > 0 ? "+" : ""}${t.amount} UX <span class="tiny">· ${esc(t.reason)}${t.details ? ` · ${esc(t.details)}` : ""}</span></span>
        <span class="tiny">${esc(when(t.created_at))}</span>
      </div>`).join("") || `<p class="muted">No transactions yet.</p>`}
    `));
    const dClaim = $("#ux-daily-claim");
    if (dClaim) dClaim.onclick = async () => {
      try {
        const res = await localFirst("Claim daily UX", () => Optim.patch("wallet", "me", { claimed_today: true }),
          () => api("/ux/daily/claim", { method: "POST" }));
        if (res) {
          if (S.me && typeof res.balance_ux === "number") {
            S.me.balance_ux = res.balance_ux;
            cacheSet("me", S.me);
          }
          uxToast(`+${res.reward_ux} UX! Day ${res.streak} streak`);
          render();
        }
      } catch (e) { uxToast(e.message); }
    };
    const bb = $("#ux-buy");
    if (bb) bb.onclick = async () => {
      try {
        const p = await api("/ux/buy", { method: "POST", body: { amount: parseFloat($("#ux-buy-amt").value || 0) } });
        if (p.pay_url || p.bot_invoice_url) { window.open(p.bot_invoice_url || p.pay_url, "_blank"); }
        const poll = setInterval(async () => {
          const st = await api("/ux/purchases/" + p.id + "/status").catch(() => null);
          if (st && st.status === "paid") { clearInterval(poll); uxToast(`${st.amount_ux} UX credited`); render(); }
        }, 4000);
        setTimeout(() => clearInterval(poll), 10 * 60 * 1000);
      } catch (e) { uxToast(e.message); }
    };
    const lk = $("#ux-link");
    if (lk) lk.onclick = async () => {
      const r = await api("/ux/link/code", { method: "POST" });
      $("#ux-code").textContent = `Send /start ${r.code} to @${r.bot_username || "the bot"}`;
    };
    $("#ux-gift").onclick = async () => {
      try {
        const body = {
          username: $("#ux-g-user").value.trim(),
          amount: parseFloat($("#ux-g-amt").value || 0),
          message: $("#ux-g-msg").value.trim(),
        };
        const before = S.me ? Object.assign({}, S.me) : null;
        const sent = await localFirst("Send UX gift", () => {
          // Balance (and the history row) change before the transfer lands.
          S.me = Object.assign({}, S.me, { balance_ux: Math.max(0, (Number(S.me && S.me.balance_ux) || 0) - body.amount) });
          cacheSet("me", S.me);
          const undoRow = Optim.create("uxtx", {
            id: Optim.localId("g"), kind: "gift_out", amount: -body.amount,
            details: body.message || "", created_at: new Date().toISOString(), __localId: null,
          });
          return () => { S.me = before; cacheSet("me", before); undoRow(); };
        }, () => api("/ux/gift", { method: "POST", body }));
        if (sent) uxToast("Gift sent");
      } catch (e) { uxToast(e.message); }
    };
  }

  async function iceServers() {
    try {
      const r = await api("/calls/ice");
      return (r.ice_servers || []).map((s) => {
        const o = { urls: s.urls };
        if (s.username) { o.username = s.username; o.credential = s.credential; }
        return o;
      });
    } catch (_) {
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  }

  // Telegram-style call encryption visualization.
  // MUST stay in sync with android/.../call/CallCrypto.kt EMOJIS.
  const CALL_EMOJIS = [
    "😀", "😎", "😍", "🤔", "😴", "🤯", "🥳", "😇",
    "🤠", "👻", "🐶", "🐱", "🦊", "🐼", "🦁", "🐸",
    "🐵", "🐷", "🦄", "🐳", "🍎", "🍕", "🍓", "🍌",
    "⚽", "🚀", "🌙", "⭐", "🔥", "💧", "🎵", "🎁",
    "🌈", "🍀", "💡", "🔑", "❤️", "💎", "🌍", "🌊",
    "🍩", "☕", "🎈", "📚", "✏️", "🎮", "⚡", "🏆",
    "🎯", "🚗", "✈️", "⛵", "🏝️", "🌵", "🌻", "🍄",
    "🌚", "💯", "🎉", "💤", "👑", "💰", "🔔", "🎨",
  ];

  async function callHash(callId) {
    try {
      const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(callId || ""));
      return new Uint8Array(d);
    } catch (_) {
      // FNV fallback for very old browsers (may differ from native hash, still 4 emojis).
      let h1 = 0x811c9dc5, h2 = 0x811c9dc5;
      const s = String(callId || "");
      for (let i = 0; i < s.length; i++) {
        h1 = ((h1 ^ s.charCodeAt(i)) * 0x01000193) >>> 0;
        h2 = ((h2 ^ (s.charCodeAt(i) + 0x9e37)) * 0x01000193) >>> 0;
      }
      const out = new Uint8Array(32);
      for (let i = 0; i < 32; i++) out[i] = ((h1 >>> ((i % 4) * 8)) ^ (h2 >>> (((i + 2) % 4) * 8))) & 0xff;
      return out;
    }
  }

  async function updateCallCrypto(callId) {
    const box = $("#call-emojis");
    const key = $("#call-key");
    if (!callId) {
      if (box) box.textContent = "🔑 ❓ ❓ ❓";
      if (key) key.textContent = "";
      return;
    }
    try {
      const h = await callHash(callId);
      const picked = [0, 1, 2, 3].map((i) => CALL_EMOJIS[h[i] % CALL_EMOJIS.length]);
      if (box) box.textContent = picked.join(" ");
      if (key) {
        const hx = (i) => h[i].toString(16).padStart(2, "0").toUpperCase();
        key.textContent = "Key " + hx(4) + hx(5) + " " + hx(6) + hx(7);
      }
    } catch (_) {}
  }

  function fmtCallTimer(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    if (m >= 60) return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function stopCallTimer() {
    if (S.callTimer) { clearInterval(S.callTimer); S.callTimer = null; }
    S.callSince = 0;
    const layer = $("#call-layer");
    if (layer) layer.classList.remove("video-on");
  }

  function startCallTimer() {
    stopCallTimer();
    S.callSince = Date.now();
    // Видео активно: сворачиваем карточку, чтобы было видно человека.
    if (S.call && S.call.video) {
      const layer = $("#call-layer");
      if (layer) layer.classList.add("video-on");
    }
    const st = $("#call-status");
    if (st) st.textContent = "00:00";
    S.callTimer = setInterval(() => {
      const el = $("#call-status");
      if (!el || !S.call) { stopCallTimer(); return; }
      el.textContent = fmtCallTimer(Math.floor((Date.now() - S.callSince) / 1000));
    }, 1000);
  }

  function showCall(phase, name, video) {
    const layer = $("#call-layer");
    layer.classList.remove("hidden");
    layer.classList.remove("video-on");
    const nm = name || "Call";
    $("#call-name").textContent = nm;
    const av = $("#call-avatar");
    if (av) av.textContent = (nm.trim()[0] || "?").toUpperCase();
    const sub = $("#call-sub");
    const statusEl = $("#call-status");
    if (phase === "incoming") {
      statusEl.textContent = video ? "Incoming video call" : "Incoming call";
      if (sub) sub.textContent = "End-to-end encrypted";
      stopCallTimer();
    } else if (phase === "Calling…") {
      statusEl.textContent = "Calling…";
      if (sub) sub.textContent = "End-to-end encrypted";
      stopCallTimer();
    } else if (phase === "Connecting") {
      statusEl.textContent = "Exchanging encryption keys…";
      if (sub) sub.textContent = "End-to-end encrypted";
      stopCallTimer();
    } else {
      statusEl.textContent = phase;
      if (sub) sub.textContent = "End-to-end encrypted · In call";
    }
    const isIncoming = phase === "incoming";
    $("#call-accept").classList.toggle("hidden", !isIncoming);
    $("#call-mute").classList.toggle("hidden", !!isIncoming);
    $("#call-speaker").classList.toggle("hidden", !!isIncoming);
    // Показ экрана — только в видео-звонке, не на входящем.
    const shareBtn = $("#call-share");
    if (shareBtn) {
      shareBtn.classList.toggle("hidden", !!isIncoming || !video);
      shareBtn.classList.remove("on");
    }
    if (S.sharing) stopShare();
    const ml = $("#call-mute-label");
    if (ml) ml.textContent = isIncoming ? "Answer or decline" : "Hang up";
    const muteBtn = $("#call-mute");
    if (muteBtn) muteBtn.classList.remove("on");
    if (S.call && S.call.callId) updateCallCrypto(S.call.callId);
    if (!video) {
      $("#remote-video").style.display = "none";
      $("#local-video").style.display = "none";
    } else {
      $("#remote-video").style.display = "";
      $("#local-video").style.display = "";
    }
  }

  async function ensurePc(video) {
    if (S.pc) return S.pc;
    const pc = new RTCPeerConnection({ iceServers: await iceServers() });
    S.pc = pc;
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !S.call) return;
      wsSend("call", {
        kind: "ice",
        candidate: ev.candidate.candidate,
        sdpMid: ev.candidate.sdpMid,
        sdpMLineIndex: ev.candidate.sdpMLineIndex,
        chat_id: S.call.chatId,
        to: S.call.peerId,
        call_id: S.call.callId,
      });
    };
    pc.ontrack = (ev) => {
      const v = $("#remote-video");
      if (v) v.srcObject = ev.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        const sub = $("#call-sub");
        if (sub) sub.textContent = "End-to-end encrypted · In call";
        startCallTimer();
        if (S.call && S.call.callId) updateCallCrypto(S.call.callId);
      }
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") hangup();
    };
    try {
      if (window.UxaoroDesktop && typeof window.UxaoroDesktop.requestMediaAccess === "function") {
        await window.UxaoroDesktop.requestMediaAccess({ audio: true, video: !!video });
      }
    } catch (_) {}
    let stream = null;
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!video });
      } catch (err) {
        if (video) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const lvFallback = $("#local-video");
            if (lvFallback) lvFallback.style.display = "none";
          } catch (_) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            } catch (_) {}
          }
        }
        if (!stream) {
          const sub = $("#call-sub");
          if (sub) sub.textContent = "Microphone/camera unavailable (" + ((err && err.message) || "no input device") + ")";
        }
      }
    }
    if (stream) {
      S.localStream = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const lv = $("#local-video");
      if (lv) lv.srcObject = stream;
    } else {
      try { pc.addTransceiver("audio", { direction: "recvonly" }); } catch (_) {}
      if (video) {
        try { pc.addTransceiver("video", { direction: "recvonly" }); } catch (_) {}
      }
    }
    return pc;
  }

  async function startCall(chat, other, video) {
    const callId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    S.call = { chatId: chat.id, peerId: other.id, callId, video, name: nameOf(other) };
    showCall("Calling…", nameOf(other), video);
    wsSend("call", { kind: "invite", chat_id: chat.id, to: other.id, video, call_id: callId });
    const pc = await ensurePc(video);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    wsSend("call", { kind: "offer", sdp: offer.sdp, sdp_type: "offer", chat_id: chat.id, to: other.id, video, call_id: callId });
  }

  async function acceptCall() {
    if (!S.call) return;
    showCall("Connecting", S.call.name, S.call.video);
    const pc = await ensurePc(S.call.video);
    if (S.pendingOffer) {
      await pc.setRemoteDescription({ type: "offer", sdp: S.pendingOffer });
      S.pendingOffer = null;
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      wsSend("call", { kind: "answer", sdp: answer.sdp, chat_id: S.call.chatId, to: S.call.peerId, call_id: S.call.callId });
    }
    for (const c of S.iceBuf) {
      try { await pc.addIceCandidate(c); } catch (_) {}
    }
    S.iceBuf = [];
  }

  function hangup() {
    if (S.call) wsSend("call", { kind: "hangup", chat_id: S.call.chatId, to: S.call.peerId, call_id: S.call.callId });
    stopCallTimer();
    if (S.shareStream) { try { S.shareStream.getTracks().forEach((t) => t.stop()); } catch (_) {} }
    S.sharing = false; S.shareStream = null; S.shareTrack = null; S.camTrack = null;
    const shb = $("#call-share");
    if (shb) shb.classList.remove("on");
    if (S.localStream) S.localStream.getTracks().forEach((t) => t.stop());
    if (S.pc) try { S.pc.close(); } catch (_) {}
    S.pc = null; S.localStream = null; S.call = null; S.pendingOffer = null; S.iceBuf = [];
    S.muted = false;
    $("#call-layer").classList.add("hidden");
    $("#remote-video").srcObject = null;
    $("#local-video").srcObject = null;
  }

  function toggleMute() {
    S.muted = !S.muted;
    if (S.localStream) S.localStream.getAudioTracks().forEach((t) => { t.enabled = !S.muted; });
    const b = $("#call-mute");
    if (b) b.classList.toggle("on", !!S.muted);
    const ml = $("#call-mute-label");
    if (ml) ml.textContent = S.muted ? "Microphone off" : "Hang up";
  }

  function videoSender() {
    if (!S.pc) return null;
    try {
      return S.pc.getSenders().find((s) => s.track && s.track.kind === "video") || null;
    } catch (_) { return null; }
  }

  // Показ экрана: меняем видеотрек на лету (replaceTrack — без переподписки SDP).
  async function toggleShare() {
    const btn = $("#call-share");
    if (S.sharing) { stopShare(); return; }
    const sender = videoSender();
    if (!sender || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
    try {
      const dstream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const strack = dstream.getVideoTracks()[0];
      if (!strack) return;
      S.camTrack = sender.track;
      S.shareStream = dstream;
      S.shareTrack = strack;
      await sender.replaceTrack(strack);
      const lv = $("#local-video");
      if (lv) lv.srcObject = dstream;
      S.sharing = true;
      if (btn) btn.classList.add("on");
      const ml = $("#call-mute-label");
      if (ml) ml.textContent = "Sharing screen";
      strack.onended = () => stopShare();
    } catch (_) { /* пользователь отменил выбор экрана */ }
  }

  async function stopShare() {
    const btn = $("#call-share");
    try {
      if (S.shareTrack) { try { S.shareTrack.stop(); } catch (_) {} }
      const sender = (S.shareTrack && S.pc)
        ? (function () {
            try {
              return S.pc.getSenders().find((s) => s.track === S.shareTrack)
                || S.pc.getSenders().find((s) => s.track && s.track.kind === "video")
                || null;
            } catch (_) { return null; }
          })()
        : null;
      if (sender && S.camTrack && S.camTrack.readyState !== "ended") {
        try { await sender.replaceTrack(S.camTrack); } catch (_) {}
      }
      const lv = $("#local-video");
      if (lv && S.localStream) lv.srcObject = S.localStream;
    } finally {
      S.sharing = false; S.shareStream = null; S.shareTrack = null; S.camTrack = null;
      if (btn) btn.classList.remove("on");
      const ml = $("#call-mute-label");
      if (ml && S.call) ml.textContent = S.muted ? "Microphone off" : "Hang up";
    }
  }

  async function onCallSignal(d) {
    const kind = d.kind;
    const from = d.from_id;
    if (from && S.me && from === S.me.id) return;
    if (kind === "invite") {
      if (S.call) return;
      S.call = { chatId: d.chat_id, peerId: from, callId: d.call_id, video: !!d.video, name: d.from_name || "Incoming" };
      showCall("incoming", S.call.name, S.call.video);
    } else if (kind === "offer") {
      S.pendingOffer = d.sdp;
      if (S.pc) {
        await S.pc.setRemoteDescription({ type: "offer", sdp: d.sdp });
        const answer = await S.pc.createAnswer();
        await S.pc.setLocalDescription(answer);
        wsSend("call", { kind: "answer", sdp: answer.sdp, chat_id: S.call && S.call.chatId, to: from, call_id: S.call && S.call.callId });
      }
    } else if (kind === "answer" && S.pc) {
      await S.pc.setRemoteDescription({ type: "answer", sdp: d.sdp });
    } else if (kind === "ice") {
      const cand = { candidate: d.candidate, sdpMid: d.sdpMid, sdpMLineIndex: d.sdpMLineIndex };
      if (S.pc && S.pc.remoteDescription) {
        try { await S.pc.addIceCandidate(cand); } catch (_) {}
      } else S.iceBuf.push(cand);
    } else if (kind === "hangup" || kind === "reject") {
      const keep = S.call;
      S.call = null;
      if (keep) { S.call = keep; hangup(); }
    }
  }

  window.addEventListener("hashchange", () => { parseHash(); render(); });
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyAppearance);
  }
  document.getElementById("call-hang").onclick = hangup;
  document.getElementById("call-accept").onclick = acceptCall;
  const muteBtn = document.getElementById("call-mute");
  if (muteBtn) muteBtn.onclick = toggleMute;
  const spkBtn = document.getElementById("call-speaker");
  if (spkBtn) spkBtn.onclick = () => spkBtn.classList.toggle("on");
  const shareBtn = document.getElementById("call-share");
  if (shareBtn) shareBtn.onclick = toggleShare;

  async function checkQueryOAuthCallback() {
    try {
      const qs = new URLSearchParams(location.search || "");
      const code = qs.get("code") || "";
      const err = qs.get("error") || "";
      const state = qs.get("state") || "";
      if ((!code && !err) || !state || !state.includes(".")) return false;
      const b64 = state.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      const stObj = JSON.parse(decodeURIComponent(escape(atob(b64 + pad))));
      const prov = stObj && stObj.p;
      if (prov !== "google" && prov !== "github") return false;
      history.replaceState(null, "", location.pathname + (location.hash || "#/login"));
      if (err) {
        await handleOAuthLoginPayload({ error: `${prov} sign-in failed: ${err}` });
        return true;
      }
      const pair = await api(`/auth/${prov}`, {
        method: "POST",
        body: { code, state, redirect_uri: (stObj && stObj.cb) || location.origin },
      });
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: "uxaoro-oauth-login", payload: pair }, location.origin);
          setTimeout(() => window.close(), 150);
          return true;
        } catch (_) {}
      }
      await handleOAuthLoginPayload(pair);
      return true;
    } catch (e) {
      await handleOAuthLoginPayload({ error: (e && e.message) || "OAuth sign-in failed" });
      return false;
    }
  }

  /* Companion scripts (devices.js) need a few hooks on window — app.js is
     a closed IIFE, so expose the minimal surface they were written against. */
  window.S = S;
  window.api = api;
  window.render = render;
  window.toast = toast;
  window.connectWs = connectWs;

  applyAppearance();
  (async function boot() {
    const explicitAuthHash = /^#\/?(login|register|authsettings)\b/i.test(location.hash || "");
    parseHash();
    await loadOAuthStatus();
    await checkQueryOAuthCallback();
    if (S.token) {
      try { await afterLogin(); } catch (_) { S.me = cacheGet("me", null); }
    }
    if (!S.token && S.pendingEmail) S.view = "register";
    if ((!S.token || (S.preregistration && !isAdmin())) && !OPEN.includes(S.view)) {
      S.view = S.view === "register" ? "register" : "login";
    }
    if (S.token && (!S.preregistration || isAdmin()) && OPEN.includes(S.view) && !explicitAuthHash) {
      S.view = "feed";
      S.tab = "feed";
    }
    render();
    if (S.token && (!S.preregistration || isAdmin())) checkPopupNewsOnEnter();
  })();
})();
