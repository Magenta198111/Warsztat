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
      container.innerHTML = `
        <style>
          /* Wymuszamy ukrywanie bezpośrednio w module, żeby uniknąć błędów */
          .hidden { display: none !important; }

          .qr-tabs { display: flex; gap: 24px; border-bottom: 1px solid var(--line); margin-bottom: 24px; }
          .qr-tab { 
            padding: 12px 0; font-size: 14px; font-weight: 600; color: var(--muted); 
            cursor: pointer; position: relative; transition: color 0.2s;
          }
          .qr-tab.active { color: var(--ink); }
          .qr-tab.active::after { 
            content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; 
            background: var(--accent); border-radius: 2px 2px 0 0;
          }
          
          .qr-input-wrapper { margin-bottom: 24px; }
          .qr-input-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          .qr-input { 
            width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--line); 
            color: var(--ink); font-size: 20px; padding: 12px 0; outline: none; 
            text-align: center; transition: border-color 0.2s;
          }
          .qr-input:focus { border-bottom-color: var(--accent); }
          .qr-input::placeholder { color: var(--line); font-size: 16px; }
          
          .qr-btn { 
            width: 100%; padding: 14px; border-radius: 6px; font-weight: 600; font-size: 15px; 
            cursor: pointer; text-align: center; display: block; margin-top: 16px;
            background: var(--accent); color: var(--accent-ink); border: 1px solid var(--accent);
            transition: opacity 0.2s;
          }
          .qr-btn:active { opacity: 0.8; }
          .qr-btn-dark {
            background: transparent; color: var(--ink); border: 1px solid var(--line);
          }
          
          .qr-canvas-box {
            display: flex; justify-content: center; margin-top: 24px;
            background: #ffffff; padding: 16px; border-radius: 8px; display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .qr-canvas-box canvas { max-width: 100%; display: block; }
          
          .qr-cam-wrapper {
            width: 100%; aspect-ratio: 1; background: var(--surface); 
            border-radius: 8px; overflow: hidden; border: 1px solid var(--line);
            display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;
            margin-top: 8px; position: relative;
          }
          .qr-cam-icon { color: var(--line); }
          .qr-cam-text { color: var(--muted); font-size: 13px; font-weight: 500; }
          
          .qr-cam-wrapper video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: none; }
          .qr-cam-wrapper video.active { display: block; }
          
          .qr-cam-overlay {
            position: absolute; inset: 15%; border: 2px solid var(--accent); border-radius: 12px; pointer-events: none; display: none;
          }
          .qr-cam-overlay.active { display: block; }
          
          .qr-status { 
            text-align: center; color: var(--muted); font-size: 12px; font-family: monospace; 
            margin-top: 16px; min-height: 18px; word-break: break-all; line-height: 1.4;
          }
          
          .qr-divider { text-align: center; color: var(--line); font-size: 11px; font-weight: 600; margin: 24px 0; letter-spacing: 1px; }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="q-back" style="width:auto; padding:8px 12px 8px 0; border:none; background:transparent; color:var(--muted); display:flex; align-items:center; justify-content:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        <div class="qr-tabs">
          <div id="tab-gen" class="qr-tab active">Generator</div>
          <div id="tab-scan" class="qr-tab">Skaner</div>
        </div>

        <div id="view-gen">
          <div class="qr-input-wrapper">
            <label class="qr-input-label">Tekst lub link do zakodowania</label>
            <input type="text" id="q-text" class="qr-input" placeholder="Wpisz coś...">
          </div>
          
          <button id="q-gen-btn" class="qr-btn">Wygeneruj kod QR</button>
          
          <div id="q-canvas-container" class="qr-canvas-box">
            <canvas id="q-canvas"></canvas>
          </div>
          <button id="q-dl" class="qr-btn hidden" style="margin-top: 20px;">Pobierz kod QR</button>
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
          
          <button id="q-scan-toggle" class="qr-btn">Uruchom kamerę</button>
          
          <div class="qr-divider">LUB</div>
          
          <input type="file" id="q-scan-file" accept="image/*" style="display:none;">
          <button id="q-scan-file-btn" class="qr-btn qr-btn-dark">Wybierz zdjęcie z kodem QR</button>
          <div id="q-scan-file-name" style="font-size:12px; color:var(--muted); margin-top:12px; text-align:center; word-break:break-all;"></div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const tabGen = $("tab-gen"), tabScan = $("tab-scan");
      const viewGen = $("view-gen"), viewScan = $("view-scan");
      const canvasContainer = $("q-canvas-container"), canvas = $("q-canvas");
      const dlBtn = $("q-dl");
      const camContainer = $("q-cam-container"), camPlaceholder = $("q-cam-placeholder"), camOverlay = $("q-cam-overlay");
      const scanFileBtn = $("q-scan-file-btn"), scanFileInput = $("q-scan-file"), scanFileName = $("q-scan-file-name");
      
      $("q-back").addEventListener("click", () => history.back(), { signal });

      tabGen.addEventListener("click", () => {
        tabGen.classList.add("active"); tabScan.classList.remove("active");
        viewGen.classList.remove("hidden"); viewScan.classList.add("hidden");
        stopCamera();
        camContainer.classList.remove("active");
        camOverlay.classList.remove("active");
        $("q-video").classList.remove("active");
        camPlaceholder.style.display = "flex";
      }, { signal });

      tabScan.addEventListener("click", () => {
        tabScan.classList.add("active"); tabGen.classList.remove("active");
        viewScan.classList.remove("hidden"); viewGen.classList.add("hidden");
      }, { signal });

      $("q-gen-btn").addEventListener("click", () => {
        const text = $("q-text").value.trim();
        if (!text) return alert("Wpisz tekst do wygenerowania!");
        
        dlBtn.classList.add("hidden");
        canvasContainer.style.display = "none";

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
          
          canvasContainer.style.display = "flex";
          dlBtn.classList.remove("hidden");

        } catch (e) {
          alert(e.message);
        }
      }, { signal });

      dlBtn.addEventListener("click", () => {
        const link = document.createElement('a');
        link.download = 'kod-qr.png';
        link.href = canvas.toDataURL("image/png");
        link.click();
      }, { signal });

      videoEl = $("q-video");
      const status = $("q-scan-status");
      const toggleBtn = $("q-scan-toggle");

      toggleBtn.addEventListener("click", async () => {
        if (stream) {
          stopCamera();
          toggleBtn.textContent = "Uruchom kamerę";
          status.textContent = "Kamera zatrzymana";
          camContainer.classList.remove("active");
          camOverlay.classList.remove("active");
          videoEl.classList.remove("active");
          camPlaceholder.style.display = "flex";
          return;
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          videoEl.srcObject = stream;
          toggleBtn.textContent = "Zatrzymaj kamerę";
          status.textContent = "Skanowanie...";
          
          camContainer.classList.add("active");
          camOverlay.classList.add("active");
          videoEl.classList.add("active");
          camPlaceholder.style.display = "none";

          if ('BarcodeDetector' in window) {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            scanInterval = setInterval(async () => {
              try {
                const codes = await detector.detect(videoEl);
                if (codes.length > 0 && codes[0].rawValue) {
                  stopCamera();
                  toggleBtn.textContent = "Uruchom kamerę";
                  status.innerHTML = `<b>Znaleziono:</b><br>${codes[0].rawValue}`;
                  
                  camContainer.classList.remove("active");
                  camOverlay.classList.remove("active");
                  videoEl.classList.remove("active");
                  camPlaceholder.style.display = "flex";
                  
                  alert("Odczytano: " + codes[0].rawValue);
                }
              } catch (e) {}
            }, 500);
          } else {
            status.textContent = "Brak wsparcia. Użyj opcji wgrania zdjęcia.";
            stopCamera();
            toggleBtn.textContent = "Uruchom kamerę";
            camContainer.classList.remove("active");
            camOverlay.classList.remove("active");
            videoEl.classList.remove("active");
            camPlaceholder.style.display = "flex";
          }
        } catch (e) {
          status.textContent = "Błąd dostępu do kamery.";
          toggleBtn.textContent = "Uruchom kamerę";
        }
      }, { signal });

      scanFileBtn.addEventListener("click", () => scanFileInput.click(), { signal });

      scanFileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        scanFileName.textContent = file.name;

        if (!('BarcodeDetector' in window)) {
          return alert("Twoja przeglądarka nie obsługuje odczytu kodów ze zdjęć.");
        }

        try {
          const bitmap = await createImageBitmap(file);
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          const codes = await detector.detect(bitmap);
          if (codes.length > 0 && codes[0].rawValue) {
            status.innerHTML = `<b>Znaleziono:</b><br>${codes[0].rawValue}`;
            alert("Odczytano: " + codes[0].rawValue);
          } else {
            status.textContent = "Nie znaleziono kodu QR na zdjęciu.";
          }
        } catch (err) {
          status.textContent = "Błąd odczytu zdjęcia.";
        }
      }, { signal });
    },

    unmount() {
      stopCamera();
    }
  });
})();