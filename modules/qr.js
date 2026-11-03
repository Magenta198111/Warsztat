(() => {
  const QR = (() => {
    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i; x = (x << 1) ^ (x & 128 ? 0x11d : 0);
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    
    function mul(p, q) {
      const r = new Uint8Array(p.length + q.length - 1);
      for (let i = 0; i < p.length; i++)
        for (let j = 0; j < q.length; j++)
          if (p[i] && q[j]) r[i + j] ^= EXP[LOG[p[i]] + LOG[q[j]]];
      return r;
    }
    
    function rsEncode(data, ecLen) {
      let g = new Uint8Array([1]);
      for (let i = 0; i < ecLen; i++) g = mul(g, new Uint8Array([1, EXP[i]]));
      const msg = new Uint8Array(data.length + ecLen);
      msg.set(data);
      for (let i = 0; i < data.length; i++) {
        const coef = msg[i];
        if (coef !== 0) {
          for (let j = 0; j < g.length; j++) msg[i + j] ^= EXP[LOG[g[j]] + LOG[coef]];
        }
      }
      return msg.slice(data.length);
    }

    const DATA_CAP = [0, 19, 34, 55, 80, 108, 136, 156, 194, 232, 274];
    const EC_CAP = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18];
    const BLOCKS = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4];
    const ALIGN = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

    function getBCHDigit(data) {
      let digit = 0;
      while (data !== 0) { digit += 1; data >>>= 1; }
      return digit;
    }

    function getBCHTypeInfo(data) {
      let d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(0x537) >= 0) {
        d ^= (0x537 << (getBCHDigit(d) - getBCHDigit(0x537)));
      }
      return ((data << 10) | d) ^ 0x5412;
    }

    function getBCHTypeNumber(data) {
      let d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(0x1F25) >= 0) {
        d ^= (0x1F25 << (getBCHDigit(d) - getBCHDigit(0x1F25)));
      }
      return (data << 12) | d;
    }

    function encode(text) {
      const bytes = new TextEncoder().encode(text);
      let ver = 1;
      while (ver <= 10) {
        const lenBits = ver < 10 ? 8 : 16;
        const requiredBits = 4 + lenBits + bytes.length * 8;
        if (Math.ceil(requiredBits / 8) <= DATA_CAP[ver]) break;
        ver++;
      }
      if (ver > 10) throw new Error("Tekst jest za długi.");

      const totalData = DATA_CAP[ver], ecLen = EC_CAP[ver], numBlocks = BLOCKS[ver];
      const bits = [];
      const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
      
      push(0b0100, 4); push(bytes.length, ver < 10 ? 8 : 16);
      for (const b of bytes) push(b, 8);
      for (let i = 0; i < 4 && bits.length < totalData * 8; i++) bits.push(0);
      while (bits.length % 8 !== 0) bits.push(0);

      const dataCW = new Uint8Array(totalData);
      for (let i = 0; i < bits.length / 8; i++) {
        let v = 0;
        for (let b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b];
        dataCW[i] = v;
      }
      
      const pads = [0xec, 0x11];
      for (let i = bits.length / 8, p = 0; i < totalData; i++, p ^= 1) dataCW[i] = pads[p];

      const bLen = Math.floor(totalData / numBlocks), extra = totalData % numBlocks;
      const dBlocks = [], eBlocks = [];
      let offset = 0;
      
      for (let b = 0; b < numBlocks; b++) {
        const size = bLen + (b >= numBlocks - extra ? 1 : 0);
        const blk = dataCW.slice(offset, offset + size);
        offset += size;
        dBlocks.push(blk); eBlocks.push(rsEncode(blk, ecLen));
      }

      const finalCW = [];
      const maxDataLen = Math.max(...dBlocks.map(b => b.length));
      
      for (let i = 0; i < maxDataLen; i++) for (let b = 0; b < numBlocks; b++) if (i < dBlocks[b].length) finalCW.push(dBlocks[b][i]);
      for (let i = 0; i < ecLen; i++) for (let b = 0; b < numBlocks; b++) finalCW.push(eBlocks[b][i]);

      const size = ver * 4 + 17;
      const mat = Array.from({ length: size }, () => new Uint8Array(size));
      const func = Array.from({ length: size }, () => new Uint8Array(size));
      const set = (r, c, v) => { mat[r][c] = v ? 1 : 0; func[r][c] = 1; };
      
      const finder = (R, C) => {
        for (let r = -1; r <= 7; r++) {
          for (let c = -1; c <= 7; c++) {
            const rr = R + r, cc = C + c;
            if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
            set(rr, cc, (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          }
        }
      };
      
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

      for (let i = 8; i < size - 8; i++) { 
        if (!func[i][6]) set(i, 6, i % 2 === 0); 
        if (!func[6][i]) set(6, i, i % 2 === 0); 
      }

      const al = ALIGN[ver];
      for (let i = 0; i < al.length; i++) {
        for (let j = 0; j < al.length; j++) {
          const R = al[i], C = al[j];
          if (func[R][C]) continue;
          for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) set(R + r, C + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
        }
      }

      const data = 1 << 3 | 0;
      const fmt = getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = (fmt >> i) & 1;
        if (i < 6) set(i, 8, mod); else if (i < 8) set(i + 1, 8, mod); else set(size - 15 + i, 8, mod);
        if (i < 8) set(8, size - 1 - i, mod); else if (i < 9) set(8, 15 - i - 1 + 1, mod); else set(8, 15 - i - 1, mod);
      }
      set(size - 8, 8, 1);

      if (ver >= 7) {
        const verBits = getBCHTypeNumber(ver);
        for (let i = 0; i < 18; i++) {
          const mod = (verBits >> i) & 1;
          set(Math.floor(i / 3), i % 3 + size - 8 - 3, mod);
          set(i % 3 + size - 8 - 3, Math.floor(i / 3), mod);
        }
      }

      let byteIndex = 0, bitIndex = 7, upward = true;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        for (let vert = 0; vert < size; vert++) {
          const row = upward ? size - 1 - vert : vert;
          for (let c = 0; c < 2; c++) {
            const cc = col - c;
            if (!func[row][cc]) {
              let dark = false;
              if (byteIndex < finalCW.length) dark = ((finalCW[byteIndex] >> bitIndex) & 1) === 1;
              if ((row + cc) % 2 === 0) dark = !dark;
              mat[row][cc] = dark ? 1 : 0;
              bitIndex--;
              if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
            }
          }
        }
        upward = !upward;
      }
      return mat;
    }
    return { encode };
  })();

  let stream = null;
  let scanInterval = null;
  let videoEl = null;

  function stopCamera() {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (videoEl) videoEl.srcObject = null;
  }

  Hub.register({
    id: "qr",
    title: "Generator & Skaner QR",
    desc: "Tworzenie kodów QR oraz skanowanie aparatem i z plików",

    async mount(container, signal) {
      let menuStyle = "bottom";
      try { menuStyle = await Hub.db.get("menu_style", "bottom"); } catch(e) {}

      let selectorHtml = "";
      if (menuStyle === "bottom") {
        selectorHtml = `
          <div id="qr-mode-trigger" class="uc-top-trigger">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="uc-top-icon" id="qr-mode-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </div>
              <span id="qr-mode-text">Generator</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div id="qr-mode-modal" class="uc-modal-overlay bottom-mode">
            <div class="uc-modal-sheet">
              <div class="uc-modal-title">Tryb pracy</div>
              <div class="uc-modal-item active" data-mode="gen">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:18px;height:18px;opacity:0.7;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></div>
                  <span>Generator</span>
                </div>
                <span class="check">✓</span>
              </div>
              <div class="uc-modal-item" data-mode="scan">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:18px;height:18px;opacity:0.7;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                  <span>Skaner</span>
                </div>
                <span class="check">✓</span>
              </div>
            </div>
          </div>
        `;
      } else {
        selectorHtml = `
          <div style="position: relative;">
            <div id="qr-mode-trigger" class="uc-top-trigger">
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="uc-top-icon" id="qr-mode-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </div>
                <span id="qr-mode-text">Generator</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div id="qr-mode-dropdown" class="uc-dropdown">
              <div class="uc-dropdown-item active" data-mode="gen">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:18px;height:18px;opacity:0.7;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></div>
                  <span>Generator</span>
                </div>
              </div>
              <div class="uc-dropdown-item" data-mode="scan">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:18px;height:18px;opacity:0.7;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                  <span>Skaner</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      container.innerHTML = `
        <style>
          .hidden { display: none !important; }
          
          .uc-top-trigger { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--line); font-size: 14px; font-weight: 600; color: var(--ink); cursor: pointer; margin-bottom: 24px; }
          .uc-top-icon { width: 20px; height: 20px; color: var(--accent); display: flex; align-items: center; justify-content: center; }
          .uc-dropdown { position: absolute; top: calc(100% + 4px); left: 0; width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); z-index: 100; overflow: hidden; opacity: 0; transform: translateY(-5px); pointer-events: none; transition: opacity 0.15s, transform 0.15s; }
          .uc-dropdown.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
          .uc-dropdown-item { padding: 14px 16px; font-size: 14px; color: var(--ink); display: flex; align-items: center; cursor: pointer; border-bottom: 1px solid var(--line); }
          .uc-dropdown-item:last-child { border-bottom: none; }
          .uc-dropdown-item.active { color: var(--accent); font-weight: 600; background: rgba(129, 140, 248, 0.05); }
          
          .uc-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
          .uc-modal-overlay.open { opacity: 1; pointer-events: auto; }
          .uc-modal-sheet { background: var(--surface); width: 100%; max-width: 600px; border: 1px solid var(--line); padding: 24px 16px; }
          .uc-modal-overlay.bottom-mode { align-items: flex-end; }
          .uc-modal-overlay.bottom-mode .uc-modal-sheet { border-top-left-radius: 16px; border-top-right-radius: 16px; border-bottom: none; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); max-height: 80vh; overflow-y: auto; }
          .uc-modal-overlay.bottom-mode.open .uc-modal-sheet { transform: translateY(0); }
          .uc-modal-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--muted); text-align: center; margin-bottom: 16px; letter-spacing: 0.5px; }
          .uc-modal-item { padding: 16px; border-radius: 6px; margin-bottom: 4px; font-size: 15px; color: var(--ink); display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: var(--bg); }
          .uc-modal-item:active { background: var(--line); }
          .uc-modal-item.active { color: var(--accent); font-weight: 600; }
          .uc-modal-item .check { opacity: 0; color: var(--accent); }
          .uc-modal-item.active .check { opacity: 1; }

          .qr-input-wrapper { margin-bottom: 24px; }
          .qr-input-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .qr-input { 
            width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--line); 
            color: var(--ink); font-size: 20px; padding: 12px 0; text-align: center; 
            transition: border-color 0.2s;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            outline: none !important;
            box-shadow: none !important;
          }
          .qr-input:focus { 
            border-bottom-color: var(--accent); 
            outline: none !important; 
            box-shadow: none !important; 
          }
          .qr-input::placeholder { color: var(--line); font-size: 16px; }
          
          .qr-btn { width: 100%; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; text-align: center; display: block; margin-top: 16px; background: var(--surface); color: var(--ink); border: 1px solid var(--line); transition: background 0.2s, border-color 0.2s, opacity 0.2s; outline: none; -webkit-tap-highlight-color: transparent; }
          .qr-btn:active { background: var(--surface-hover); }
          .qr-btn-primary { background: rgba(129, 140, 248, 0.1); color: var(--accent); border: 1px solid rgba(129, 140, 248, 0.3); }
          .qr-btn-primary:active { background: rgba(129, 140, 248, 0.2); }
          .qr-btn:disabled { cursor: not-allowed; }
          
          .qr-divider-line { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          .qr-canvas-box { display: flex; justify-content: center; align-items: center; min-height: 150px; transition: all 0.3s ease; position: relative; }
          .qr-canvas-box.has-canvas { 
            background: #ffffff; 
            padding: 8px; 
            border-radius: 8px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); 
            min-height: auto; 
            width: 40%; 
            margin: 0 auto; 
            cursor: pointer; 
          }
          .qr-canvas-box.fullscreen {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100vh; max-height: 100vh;
            background: #ffffff; z-index: 9999;
            padding: 24px; margin: 0; border-radius: 0;
            display: flex; align-items: center; justify-content: center;
            box-shadow: none;
          }
          .qr-canvas-box.fullscreen canvas {
            max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;
          }
          .qr-placeholder { color: var(--line); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; text-align: center; }
          .qr-canvas-box.has-canvas .qr-placeholder { display: none; }
          .qr-canvas-box canvas { display: none; max-width: 100%; height: auto; }
          .qr-canvas-box.has-canvas canvas { display: block; }
          
          .qr-close-fullscreen-btn {
            display: none; position: absolute; top: 20px; right: 20px;
            background: rgba(0,0,0,0.1); border: none; border-radius: 50%;
            width: 48px; height: 48px; align-items: center; justify-content: center;
            color: #333; cursor: pointer; z-index: 10000;
          }
          .qr-canvas-box.fullscreen .qr-close-fullscreen-btn { display: flex; }
          
          .qr-cam-wrapper { width: 100%; aspect-ratio: 1; background: var(--surface); border-radius: 8px; overflow: hidden; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; margin-top: 8px; position: relative; }
          .qr-cam-icon { color: var(--line); }
          .qr-cam-text { color: var(--muted); font-size: 13px; font-weight: 500; }
          .qr-cam-wrapper video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: none; }
          .qr-cam-wrapper video.active { display: block; }
          .qr-cam-overlay { position: absolute; inset: 15%; border: 2px solid var(--accent); border-radius: 12px; pointer-events: none; display: none; }
          .qr-cam-overlay.active { display: block; }
          
          .qr-result-box { background: var(--surface); border: 1px solid var(--accent); border-radius: 8px; padding: 16px; margin-top: 16px; }
          .qr-result-header { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; letter-spacing: 0.5px; }
          .qr-result-body { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
          .qr-result-text { font-family: monospace; font-size: 14px; color: var(--ink); word-break: break-all; line-height: 1.5; flex: 1; }
          .qr-copy-btn { background: transparent; border: none; padding: 4px; color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.2s; outline: none; }
          .qr-copy-btn:active { transform: scale(0.9); }
          .qr-copy-btn svg { width: 18px; height: 18px; }

          .qr-status { text-align: center; color: var(--muted); font-size: 12px; font-family: monospace; margin-top: 16px; min-height: 18px; word-break: break-all; line-height: 1.4; }
          .qr-divider { text-align: center; color: var(--line); font-size: 11px; font-weight: 600; margin: 24px 0; letter-spacing: 1px; }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="q-back" style="width:auto; padding:8px 12px 8px 0; border:none; background:transparent; color:var(--muted); display:flex; align-items:center; justify-content:center; outline: none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        ${selectorHtml}

        <div id="view-gen">
          <div class="qr-input-wrapper">
            <label class="qr-input-label">Tekst lub link do zakodowania</label>
            <input type="text" id="q-text" class="qr-input" placeholder="Wpisz coś..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          </div>
          
          <button id="q-gen-btn" class="qr-btn qr-btn-primary">Wygeneruj kod QR</button>
          
          <div class="qr-divider-line"></div>
          
          <div id="q-canvas-container" class="qr-canvas-box">
            <canvas id="q-canvas"></canvas>
            <div id="q-placeholder" class="qr-placeholder">Miejsce na kod QR</div>
            <button id="q-close-fullscreen-btn" class="qr-close-fullscreen-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div class="qr-divider-line"></div>
          
          <button id="q-dl" class="qr-btn" disabled style="opacity: 0.5;">Pobierz kod QR</button>
        </div>

        <div id="view-scan" class="hidden">
          <div id="q-cam-container" class="qr-cam-wrapper">
            <video id="q-video" autoplay playsinline muted></video>
            <div id="q-cam-overlay" class="qr-cam-overlay"></div>
            
            <div id="q-cam-placeholder" style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
              <svg class="qr-cam-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <span class="qr-cam-text">Kamera jest wyłączona</span>
            </div>
          </div>
          
          <div id="q-scan-status" class="qr-status">Gotowy do skanowania</div>
          
          <div id="q-scan-result" class="qr-result-box hidden">
            <div class="qr-result-header">Znaleziono kod QR</div>
            <div class="qr-result-body">
              <span id="q-scan-result-text" class="qr-result-text"></span>
              <button id="q-scan-copy-btn" class="qr-copy-btn" title="Kopiuj">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
          
          <button id="q-scan-toggle" class="qr-btn qr-btn-primary">Uruchom kamerę</button>
          
          <div class="qr-divider">LUB</div>
          
          <input type="file" id="q-scan-file" accept="image/*" style="display:none;">
          <button id="q-scan-file-btn" class="qr-btn">Wybierz zdjęcie z kodem QR</button>
          <div id="q-scan-file-name" style="font-size:12px; color:var(--muted); margin-top:12px; text-align:center; word-break:break-all;"></div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const modeTrigger = $("qr-mode-trigger");
      const modeText = $("qr-mode-text");
      const modeIcon = $("qr-mode-icon");
      const viewGen = $("view-gen"), viewScan = $("view-scan");
      const canvasContainer = $("q-canvas-container"), canvas = $("q-canvas");
      const dlBtn = $("q-dl");
      const camContainer = $("q-cam-container"), camPlaceholder = $("q-cam-placeholder"), camOverlay = $("q-cam-overlay");
      const scanFileBtn = $("q-scan-file-btn"), scanFileInput = $("q-scan-file"), scanFileName = $("q-scan-file-name");
      const modeOptions = container.querySelectorAll(".uc-modal-item, .uc-dropdown-item");
      const status = $("q-scan-status");
      const resultBox = $("q-scan-result");
      const resultText = $("q-scan-result-text");
      const copyBtn = $("q-scan-copy-btn");
      const closeFullscreenBtn = $("q-close-fullscreen-btn");
      
      $("q-back").addEventListener("click", () => history.back(), { signal });

      canvasContainer.addEventListener("click", (e) => {
        if (canvasContainer.classList.contains("has-canvas") && !e.target.closest('.qr-close-fullscreen-btn')) {
          canvasContainer.classList.toggle("fullscreen");
        }
      }, { signal });

      closeFullscreenBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        canvasContainer.classList.remove("fullscreen");
      }, { signal });

      function resetScanUI() {
        camContainer.classList.remove("active");
        camOverlay.classList.remove("active");
        $("q-video").classList.remove("active");
        camPlaceholder.style.display = "flex";
        resultBox.classList.add("hidden");
        status.classList.remove("hidden");
        status.textContent = "Gotowy do skanowania";
      }

      function showResult(text) {
        stopCamera();
        $("q-scan-toggle").textContent = "Uruchom kamerę";
        camContainer.classList.remove("active");
        camOverlay.classList.remove("active");
        $("q-video").classList.remove("active");
        camPlaceholder.style.display = "flex";
        
        status.classList.add("hidden");
        resultBox.classList.remove("hidden");
        resultText.textContent = text;
      }

      copyBtn.addEventListener("click", () => {
        const textToCopy = resultText.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 1500);
        }).catch(() => showToast("Błąd kopiowania"));
      }, { signal });

      if (menuStyle === "bottom") {
        const modal = $("qr-mode-modal");
        modeTrigger.addEventListener("click", () => modal.classList.add("open"), { signal });
        modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); }, { signal });
      } else {
        const dropdown = $("qr-mode-dropdown");
        modeTrigger.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.classList.toggle("open");
        }, { signal });
        document.addEventListener("click", (e) => {
          if (!modeTrigger.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove("open");
        }, { signal });
      }

      modeOptions.forEach(opt => {
        opt.addEventListener("click", () => {
          const mode = opt.dataset.mode;
          modeOptions.forEach(o => o.classList.remove("active"));
          opt.classList.add("active");
          
          if (menuStyle === "bottom") $("qr-mode-modal").classList.remove("open");
          else $("qr-mode-dropdown").classList.remove("open");

          if (mode === "gen") {
            modeText.textContent = "Generator";
            modeIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
            viewGen.classList.remove("hidden"); viewScan.classList.add("hidden");
            resetScanUI();
          } else {
            modeText.textContent = "Skaner";
            modeIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`;
            viewScan.classList.remove("hidden"); viewGen.classList.add("hidden");
            resetScanUI();
          }
        }, { signal });
      });

      $("q-gen-btn").addEventListener("click", () => {
        const text = $("q-text").value.trim();
        if (!text) return showToast("Wpisz tekst do wygenerowania!");
        
        canvasContainer.classList.remove("has-canvas");
        canvasContainer.classList.remove("fullscreen");
        dlBtn.disabled = true;
        dlBtn.style.opacity = "0.5";

        try {
          const mat = QR.encode(text);
          const size = mat.length;
          const scale = 8; 
          const margin = 4 * scale; 
          
          canvas.width = (size * scale) + (margin * 2);
          canvas.height = (size * scale) + (margin * 2);
          
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff"; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.fillStyle = "#000000";
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              if (mat[r][c]) ctx.fillRect(margin + (c * scale), margin + (r * scale), scale, scale);
            }
          }
          
          canvasContainer.classList.add("has-canvas");
          dlBtn.disabled = false;
          dlBtn.style.opacity = "1";

        } catch (e) {
          showToast("Błąd generowania kodu QR");
        }
      }, { signal });

      dlBtn.addEventListener("click", () => {
        if (dlBtn.disabled) return;
        const link = document.createElement('a');
        link.download = 'kod-qr.png';
        link.href = canvas.toDataURL("image/png");
        link.click();
      }, { signal });

      videoEl = $("q-video");
      const toggleBtn = $("q-scan-toggle");

      toggleBtn.addEventListener("click", async () => {
        if (stream) {
          stopCamera();
          toggleBtn.textContent = "Uruchom kamerę";
          resetScanUI();
          return;
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          videoEl.srcObject = stream;
          toggleBtn.textContent = "Zatrzymaj kamerę";
          resultBox.classList.add("hidden");
          status.classList.remove("hidden");
          status.textContent = "Skanowanie...";
          
          camContainer.classList.add("active");
          camOverlay.classList.add("active");
          videoEl.classList.add("active");
          camPlaceholder.style.display = "none";

          if (!('BarcodeDetector' in window)) {
          return showToast("Twoja przeglądarka nie obsługuje odczytu kodów ze zdjęć.");
        }

        try {
          const bitmap = await createImageBitmap(file);
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          const codes = await detector.detect(bitmap);
          if (codes.length > 0 && codes[0].rawValue) {
            showResult(codes[0].rawValue);
          } else {
            resultBox.classList.add("hidden");
            status.classList.remove("hidden");
            status.textContent = "Nie znaleziono kodu QR na zdjęciu.";
          }
        } catch (err) {
          resultBox.classList.add("hidden");
          status.classList.remove("hidden");
          status.textContent = "Błąd odczytu zdjęcia.";
        }
      }, { signal });
    },

    unmount() {
      stopCamera();
    }
  });
})();