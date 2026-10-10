const CryptoApp = (() => {
  const LS_PRIV = "uxa_e2ee_priv";
  const LS_PUB = "uxa_e2ee_pub";

  function pemToBuf(pem) {
    const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }
  function bufToPem(buf, type) {
    const b = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    const b64 = btoa(s);
    const lines = b64.match(/.{1,64}/g).join("\n");
    return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
  }
  function b64enc(buf) {
    const b = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    let s = "";
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function b64dec(s) {
    const bin = atob(s);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  async function ensureKeys() {
    if (localStorage.getItem(LS_PRIV) && localStorage.getItem(LS_PUB)) {
      return localStorage.getItem(LS_PUB);
    }
    const kp = await crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["encrypt", "decrypt"],
    );
    const spki = await crypto.subtle.exportKey("spki", kp.publicKey);
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
    localStorage.setItem(LS_PUB, bufToPem(spki, "PUBLIC KEY"));
    localStorage.setItem(LS_PRIV, bufToPem(pkcs8, "PRIVATE KEY"));
    return localStorage.getItem(LS_PUB);
  }

  async function importPub(pem) {
    return crypto.subtle.importKey("spki", pemToBuf(pem), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  }
  async function importPriv(pem) {
    return crypto.subtle.importKey("pkcs8", pemToBuf(pem), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  }

  async function rawKey(keysJson, myId) {
    const keys = JSON.parse(keysJson || "{}");
    if (!keys[myId]) return null;
    const priv = await importPriv(localStorage.getItem(LS_PRIV));
    const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, priv, b64dec(keys[myId]));
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }

  // Hybrid bundle: one AES-256-GCM message key, wrapped per recipient.
  // `plain` (text/payload JSON) is encrypted with `nonce`; `fileBytes`
  // (chat media) is encrypted with the SAME key but its own fresh
  // `media_nonce` — never the same (key, nonce) pair twice.
  async function encryptBundle(plain, pubmap, fileBytes) {
    const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const raw = await crypto.subtle.exportKey("raw", aes);
    const keys = {};
    for (const [uid, pem] of Object.entries(pubmap || {})) {
      if (!pem) continue;
      try {
        const pub = await importPub(pem);
        keys[uid] = b64enc(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, raw));
      } catch (_) {}
    }
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aes, new TextEncoder().encode(plain));
    const out = { ciphertext: b64enc(ct), nonce: b64enc(nonce), keys_json: JSON.stringify(keys), media_nonce: "", media_ct: "" };
    if (fileBytes && fileBytes.length) {
      const mnonce = crypto.getRandomValues(new Uint8Array(12));
      const mct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: mnonce, tagLength: 128 }, aes, fileBytes);
      out.media_nonce = b64enc(mnonce);
      out.media_ct = b64enc(mct);
    }
    return out;
  }

  async function encrypt(plain, pubmap) {
    const enc = await encryptBundle(plain, pubmap, null);
    return { ciphertext: enc.ciphertext, nonce: enc.nonce, keys_json: enc.keys_json };
  }

  async function decrypt(ciphertext, nonce, keysJson, myId) {
    try {
      const aes = await rawKey(keysJson, myId);
      if (!aes) return null;
      const pt = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(b64dec(nonce)), tagLength: 128 },
        aes,
        b64dec(ciphertext),
      );
      return new TextDecoder().decode(pt);
    } catch (_) {
      return null;
    }
  }

  // Decrypt binary media (chat files). `ciphertext` is raw bytes (Uint8Array
  // or ArrayBuffer); nonce/keys come from the message row.
  async function decryptBytes(ciphertext, nonce, keysJson, myId) {
    try {
      const aes = await rawKey(keysJson, myId);
      if (!aes) return null;
      const buf = ciphertext instanceof Uint8Array ? ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) : ciphertext;
      return await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(b64dec(nonce)), tagLength: 128 },
        aes,
        buf,
      );
    } catch (_) {
      return null;
    }
  }

  function publicPem() { return localStorage.getItem(LS_PUB) || ""; }
  function privatePem() { return localStorage.getItem(LS_PRIV) || ""; }
  function importBackup(pem) { localStorage.setItem(LS_PRIV, pem.trim()); }

  /** Does this browser hold a keypair yet? */
  function hasKeys() {
    return !!(localStorage.getItem(LS_PRIV) && localStorage.getItem(LS_PUB));
  }

  /** Install a full keypair (used when restoring the server backup). */
  function importKeyPair(privatePemStr, publicPemStr) {
    const priv = String(privatePemStr || "").trim();
    if (!priv) throw new Error("No private key to import");
    localStorage.setItem(LS_PRIV, priv);
    const pub = String(publicPemStr || "").trim();
    if (pub) localStorage.setItem(LS_PUB, pub);
    return publicPem();
  }

  async function prepareKeyRotation({ userId, rotationId, oldPublicPem }) {
    if (!userId || !rotationId || !oldPublicPem) throw new Error("Incomplete key-rotation request");
    const kp = await crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["encrypt", "decrypt"],
    );
    const publicPemStr = bufToPem(await crypto.subtle.exportKey("spki", kp.publicKey), "PUBLIC KEY");
    const privatePemStr = bufToPem(await crypto.subtle.exportKey("pkcs8", kp.privateKey), "PRIVATE KEY");
    const bundle = JSON.stringify({
      version: 1,
      rotation_id: String(rotationId),
      user_id: String(userId),
      private_pem: privatePemStr,
      public_pem: publicPemStr,
    });
    const encrypted = await encrypt(bundle, { [userId]: oldPublicPem });
    return { privatePem: privatePemStr, publicPem: publicPemStr, ...encrypted };
  }

  async function importKeyRotation({ userId, rotationId, newPublicPem, ciphertext, nonce, keysJson }) {
    const plain = await decrypt(ciphertext, nonce, keysJson, userId);
    if (!plain) throw new Error("Could not decrypt the key-rotation bundle");
    const bundle = JSON.parse(plain);
    if (String(bundle.user_id) !== String(userId) || String(bundle.rotation_id) !== String(rotationId)) {
      throw new Error("Key-rotation bundle belongs to another account or reset");
    }
    const expected = new Uint8Array(pemToBuf(newPublicPem));
    const bundled = new Uint8Array(pemToBuf(bundle.public_pem));
    if (expected.length !== bundled.length || expected.some((b, i) => b !== bundled[i])) {
      throw new Error("Key-rotation bundle does not match the published public key");
    }
    const test = crypto.getRandomValues(new Uint8Array(32));
    const encryptedTest = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, await importPub(newPublicPem), test);
    const decryptedTest = new Uint8Array(await crypto.subtle.decrypt({ name: "RSA-OAEP" }, await importPriv(bundle.private_pem), encryptedTest));
    if (test.some((b, i) => b !== decryptedTest[i])) throw new Error("Replacement keypair is invalid");
    importKeyPair(bundle.private_pem, bundle.public_pem);
    return publicPem();
  }

  // ---------- Device-to-device E2EE key transfer (ECDH P-256 + AES-GCM) ----------
  // Mirrors the Android DeviceTransfer.kt protocol.

  function bufToHex(buf) {
    const b = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
    return s;
  }
  async function hkdfSha256(ikm, salt, info, len = 32) {
    const keyH = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const saltKey = await crypto.subtle.importKey(
      "raw", (salt && salt.byteLength) ? salt : new Uint8Array(32),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const prk = await crypto.subtle.sign("HMAC", saltKey, ikm);
    let t = new Uint8Array(0);
    const okm = new Uint8Array(len);
    let off = 0;
    let ctr = 1;
    const infoArr = typeof info === "string" ? new TextEncoder().encode(info) : new Uint8Array(info);
    while (off < len) {
      const hmacKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const inp = new Uint8Array(t.length + infoArr.length + 1);
      inp.set(t, 0);
      inp.set(infoArr, t.length);
      inp[t.length + infoArr.length] = ctr;
      t = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, inp));
      const take = Math.min(t.length, len - off);
      okm.set(t.subarray(0, take), off);
      off += take;
      ctr++;
    }
    return okm.buffer;
  }

  async function ecGenerate() {
    const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
    const spki = await crypto.subtle.exportKey("spki", kp.publicKey);
    return { keyPair: kp, publicKeyPem: bufToPem(spki, "PUBLIC KEY") };
  }

  async function ecPubFromPem(pem) {
    return crypto.subtle.importKey("spki", pemToBuf(pem), { name: "ECDH", namedCurve: "P-256" }, false, []);
  }

  async function ecdhDerive(privKey, pubKey) {
    const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: pubKey }, privKey, 256);
    return bits;
  }

  async function sasCode(sharedSecret) {
    const key = await crypto.subtle.importKey("raw", sharedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const out = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("sas")));
    let n = 0;
    for (let i = 0; i < 4; i++) n = (n * 256 + out[i]) >>> 0;
    return String(n % 1000000).padStart(6, "0");
  }

  async function transferSeal(privatePem, publicPem, theirEphemeralPubPem, pairingCode) {
    const me = await ecGenerate();
    const theirPub = await ecPubFromPem(theirEphemeralPubPem);
    const shared = await ecdhDerive(me.keyPair.privateKey, theirPub);
    const aesRaw = await hkdfSha256(shared, new TextEncoder().encode(pairingCode), new TextEncoder().encode("uxaoro/device-transfer/v1"));
    const aes = await crypto.subtle.importKey("raw", aesRaw, { name: "AES-GCM" }, false, ["encrypt"]);
    const bundle = JSON.stringify({ v: 1, private_pem: privatePem, public_pem: publicPem });
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aes, new TextEncoder().encode(bundle));
    const sas = await sasCode(shared);
    return {
      approverEphemeralPubkey: me.publicKeyPem,
      ciphertextB64: b64enc(ct),
      nonceB64: b64enc(nonce),
      sasCode: sas,
      _keyPair: me, // keep a reference so caller can hold private key (we don't export it)
    };
  }

  async function transferUnseal(ourKeyPair, approverEphemeralPubPem, pairingCode, ciphertextB64, nonceB64) {
    const theirPub = await ecPubFromPem(approverEphemeralPubPem);
    const shared = await ecdhDerive(ourKeyPair.privateKey, theirPub);
    const aesRaw = await hkdfSha256(shared, new TextEncoder().encode(pairingCode), new TextEncoder().encode("uxaoro/device-transfer/v1"));
    const aes = await crypto.subtle.importKey("raw", aesRaw, { name: "AES-GCM" }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(b64dec(nonceB64)), tagLength: 128 }, aes, b64dec(ciphertextB64));
    const obj = JSON.parse(new TextDecoder().decode(pt));
    const sas = await sasCode(shared);
    return { bundle: { privateKeyPem: obj.private_pem, publicKeyPem: obj.public_pem }, sasCode: sas };
  }

  // ---------- Server-side key backup (password-derived, AES-256-GCM) ----------
  //
  // The private key is sealed with a key derived from the account password, so a
  // new device can restore it after an ordinary sign-in instead of a device
  // pairing ceremony. The password itself never leaves the client and the
  // server only ever holds this envelope.
  //
  // Envelope (identical on Android - keep the two in sync):
  //   {version:1, kdf:"PBKDF2-HMAC-SHA256", iterations:600000,
  //    salt:b64(16 bytes), nonce:b64(12 bytes), ciphertext:b64(GCM),
  //    pubkey_fingerprint:hex(sha256(public_pem))[0:32]}
  // key  = PBKDF2-HMAC-SHA256(password_utf8, salt, iterations, 32 bytes)
  // aad  = "uxaoro-e2ee-backup:v1:<user_id>"      <- binds the blob to the account
  // plain = JSON {private_pem, public_pem, user_id, created_at}

  const BACKUP_VERSION = 1;
  const BACKUP_KDF = "PBKDF2-HMAC-SHA256";
  const BACKUP_ITERATIONS = 600000;
  const BACKUP_SALT_BYTES = 16;
  const BACKUP_NONCE_BYTES = 12;

  function backupAad(userId) {
    return `uxaoro-e2ee-backup:v${BACKUP_VERSION}:${userId}`;
  }

  async function deriveBackupKey(password, salt, iterations) {
    const material = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(String(password)), "PBKDF2", false, ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  /** SHA-256 of the public PEM, first 32 hex chars - tells clients whether a
   *  backup still matches the key the account publishes. */
  async function pubkeyFingerprint(publicPem) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(publicPem || "").trim()));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  }

  /** Seal the device's private key for upload. Returns the wire envelope. */
  async function sealBackup({ password, userId, privatePem, publicPem, iterations = BACKUP_ITERATIONS }) {
    if (!password) throw new Error("A password is required to back up your keys");
    if (!userId) throw new Error("Missing account id");
    if (!privatePem) throw new Error("No private key to back up");
    const salt = crypto.getRandomValues(new Uint8Array(BACKUP_SALT_BYTES));
    const nonce = crypto.getRandomValues(new Uint8Array(BACKUP_NONCE_BYTES));
    const key = await deriveBackupKey(password, salt, iterations);
    const plain = JSON.stringify({
      private_pem: String(privatePem).trim(),
      public_pem: String(publicPem || "").trim(),
      user_id: String(userId),
      created_at: new Date().toISOString(),
    });
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: new TextEncoder().encode(backupAad(userId)) },
      key,
      new TextEncoder().encode(plain),
    );
    return {
      version: BACKUP_VERSION,
      kdf: BACKUP_KDF,
      iterations,
      salt: b64enc(salt),
      nonce: b64enc(nonce),
      ciphertext: b64enc(ct),
      pubkey_fingerprint: await pubkeyFingerprint(publicPem),
    };
  }

  /** Open a stored envelope. Throws "wrong password" when the tag fails. */
  async function openBackup({ password, userId, envelope }) {
    if (!password) throw new Error("Enter your account password");
    if (!envelope || !envelope.ciphertext) throw new Error("This account has no key backup");
    const iterations = Number(envelope.iterations) || BACKUP_ITERATIONS;
    const salt = new Uint8Array(b64dec(envelope.salt));
    const key = await deriveBackupKey(password, salt, iterations);
    let plain;
    try {
      plain = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(b64dec(envelope.nonce)),
          additionalData: new TextEncoder().encode(backupAad(userId)),
        },
        key,
        b64dec(envelope.ciphertext),
      );
    } catch (_) {
      // GCM tag mismatch: either the password is wrong or the blob was tampered
      // with. Both mean "do not import this".
      throw new Error("Could not decrypt the backup - wrong password?");
    }
    const obj = JSON.parse(new TextDecoder().decode(plain));
    if (obj.user_id && userId && String(obj.user_id) !== String(userId)) {
      throw new Error("That backup belongs to another account");
    }
    if (!obj.private_pem) throw new Error("The backup is missing the private key");
    return obj;
  }

  return {
    ensureKeys, encrypt, encryptBundle, decrypt, decryptBytes,
    publicPem, privatePem, importBackup, hasKeys, importKeyPair,
    prepareKeyRotation, importKeyRotation,
    // Server-side key backup
    sealBackup, openBackup, pubkeyFingerprint, backupAad,
    BACKUP_ITERATIONS, BACKUP_KDF, BACKUP_VERSION,
    // Device key transfer
    ecGenerate, transferSeal, transferUnseal,
  };
})();
