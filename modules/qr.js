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

    function encode(text) {
      const bytes = new TextEncoder().encode(text);
      let ver = 1;
      while (ver <= 10 && bytes.length > DATA_CAP[ver]) ver++;
      if (ver > 10) throw new Error("Tekst jest za długi.");

      const totalData = DATA_CAP[ver];
      const ecLen = EC_CAP[ver];
      const numBlocks = BLOCKS[ver];
      
      const bits = [];
      const push = (val, len) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
      };
      
      push(0b0100, 4);
      push(bytes.length, ver < 10 ? 8 : 16);
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

      const bLen = Math.floor(totalData / numBlocks);
      const dBlocks = [];
      const eBlocks = [];
      let offset = 0;
      for (let b = 0; b < numBlocks; b++) {
        const blk = dataCW.slice(offset, offset + bLen);
        offset += bLen;
        dBlocks.push(blk);
        eBlocks.push(rsEncode(blk, ecLen));
      }

      const finalCW = [];
      for (let i = 0; i < bLen; i++) for (let b = 0; b < numBlocks; b++) finalCW.push(dBlocks[b][i]);
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
            set(rr, cc, (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                        (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          }
        }
      };
      
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

      for (let i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }

      const al = ALIGN[ver];
      for (let i = 0; i < al.length; i++) {
        for (let j = 0; j < al.length; j++) {
          if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
          const R = al[i], C = al[j];
          for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) set(R + r, C + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
        }
      }

      set(size - 8, 8, 1);
      for (let i = 0; i < 9; i++) {
        if (i !== 6) { func[8][i] = 1; func[i][8] = 1; }
        if (i < 8) { func[8][size - 1 - i] = 1; func[size - 1 - i][8] = 1; }
      }

      let bitIdx = 0;
      const totalBits = finalCW.length * 8;
      for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
          for (let j = 0; j < 2; j++) {
            const c = right - j;
            const up = ((right + 1) & 2) === 0;
            const r = up ? size - 1 - vert : vert;
            if (!func[r][c]) {
              let bit = 0;
              if (bitIdx < totalBits) {
                bit = (finalCW[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
                bitIdx++;
              }
              if ((r + c) % 2 === 0) bit ^= 1;
              mat[r][c] = bit;
            }
          }
        }
      }

      const fmt = 0x77c4;
      for (let i = 0; i <= 5; i++) mat[8][i] = (fmt >> i) & 1;
      mat[8][7] = (fmt >> 6) & 1;
      mat[8][8] = (fmt >> 7) & 1;
      mat[7][8] = (fmt >> 8) & 1;
      for (let i = 9; i < 15; i++) mat[14 - i][8] = (fmt >> i) & 1;
      
      for (let i = 0; i < 8; i++) mat[size - 1 - i][8] = (fmt >> i) & 1;
      for (let i = 8; i < 15; i++) mat[8][size - 15 + i] = (fmt >> i) & 1;
      mat[size - 8][8] = 1;

      return mat;
    }
    return { encode };
  })();

  let stream = null;
  let scanInterval = null;
  let videoEl = null;

  function stopCamera() {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (videoEl) videoEl.srcObject = null;
  }

  Hub.register({
    id: "qr",
    title: "Generator & Skaner QR",
    icon: "📷",
    desc: "Tworzenie kodów QR oraz skanowanie aparatem i z plików",

    async mount(container, signal) {
      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <button id="q-back" style="width:auto; padding:10px 16px; border-radius:14px;">Wróć</button>
          <h2 style="margin:0; font-size:18px;">Generator & Skaner QR</h2>
          <div style="width:68px;"></div>
        </div>
        
        <div style="display:flex; gap:10px; margin-bottom:16px;">
          <button id="q-tab-gen" class="p" style="margin:0; flex:1;">Generator</button>
          <button id="q-tab-scan" style="margin:0; flex:1;">Skaner</button>
        </div>

        <div id="q-view-gen" class="card">
          <label>Tekst lub link do zakodowania</label>
          <input type="text" id="q-text" placeholder="Wpisz coś...">
          <button class="p" id="q-gen-btn">Wygeneruj kod QR</button>
          <div style="display:flex; justify-content:center; margin-top:16px;">
            <canvas id="q-canvas" style="display:none; max-width:100%; border-radius:14px;"></canvas>
          </div>
        </div>

        <div id="q-view-scan" class="card hidden">
          <div style="position:relative; width:100%; aspect-ratio:1; background:#000; border-radius:14px; overflow:hidden; margin-bottom:14px;">
            <video id="q-video" style="width:100%; height:100%; object-fit:cover;" autoplay playsinline muted></video>
            <div style="position:absolute; inset:15%; border:2px solid var(--accent); border-radius:20px; pointer-events:none;"></div>
          </div>
          <div class="i" id="q-scan-status" style="text-align:center; margin-bottom:14px;">Skieruj kamerę na kod QR</div>
          <button id="q-scan-toggle" class="p">Uruchom kamerę</button>
          <div style="text-align:center; margin-top:14px; color:var(--muted); font-size:14px;">lub</div>
          <label>Wgraj zdjęcie z kodem QR</label>
          <input type="file" id="q-scan-file" accept="image/*">
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const tabGen = $("q-tab-gen"), tabScan = $("q-tab-scan");
      const viewGen = $("q-view-gen"), viewScan = $("q-view-scan");
      
      $("q-back").addEventListener("click", () => history.back(), { signal });

      tabGen.addEventListener("click", () => {
        tabGen.classList.add("p"); tabScan.classList.remove("p");
        viewGen.classList.remove("hidden"); viewScan.classList.add("hidden");
        stopCamera();
      }, { signal });

      tabScan.addEventListener("click", () => {
        tabScan.classList.add("p"); tabGen.classList.remove("p");
        viewScan.classList.remove("hidden"); viewGen.classList.add("hidden");
      }, { signal });

      $("q-gen-btn").addEventListener("click", () => {
        const text = $("q-text").value.trim();
        if (!text) return alert("Wpisz tekst do wygenerowania!");
        try {
          const mat = QR.encode(text);
          const size = mat.length;
          const scale = 10;
          const canvas = $("q-canvas");
          canvas.width = size * scale;
          canvas.height = size * scale;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#000";
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              if (mat[r][c]) ctx.fillRect(c * scale, r * scale, scale, scale);
            }
          }
          canvas.style.display = "block";
        } catch (e) {
          alert(e.message);
        }
      }, { signal });

      videoEl = $("q-video");
      const status = $("q-scan-status");
      const toggleBtn = $("q-scan-toggle");

      toggleBtn.addEventListener("click", async () => {
        if (stream) {
          stopCamera();
          toggleBtn.textContent = "Uruchom kamerę";
          status.textContent = "Skieruj kamerę na kod QR";
          return;
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          videoEl.srcObject = stream;
          toggleBtn.textContent = "Zatrzymaj kamerę";
          status.textContent = "Skanowanie...";

          if ('BarcodeDetector' in window) {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            scanInterval = setInterval(async () => {
              try {
                const codes = await detector.detect(videoEl);
                if (codes.length > 0 && codes[0].rawValue) {
                  stopCamera();
                  toggleBtn.textContent = "Uruchom kamerę";
                  status.innerHTML = `<b>Znaleziono:</b><br>${codes[0].rawValue}`;
                  alert("Odczytano: " + codes[0].rawValue);
                }
              } catch (e) {}
            }, 500);
          } else {
            status.textContent = "Brak wsparcia. Użyj opcji wgrania zdjęcia.";
            stopCamera();
            toggleBtn.textContent = "Uruchom kamerę";
          }
        } catch (e) {
          status.textContent = "Błąd dostępu do kamery.";
          toggleBtn.textContent = "Uruchom kamerę";
        }
      }, { signal });

      $("q-scan-file").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
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