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

  Hub.register({
    id: "generator-wifi-qr",
    title: "QR do Wi-Fi",
    desc: "Kod QR, którym goście połączą się z twoją siecią",

    async mount(container, signal) {
      let currentCanvasUrl = null;

      container.innerHTML = `
        <style>
          .wq-label { display: block; font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 8px; margin-top: 16px; }
          
          .wq-input {
            width: 100%; background: transparent; border: none; border-bottom: 2px solid var(--line);
            color: var(--ink); font-size: 18px; font-weight: 500; padding: 12px 0;
            outline: none; transition: border-color 0.2s; font-family: inherit;
          }
          .wq-input:focus { border-bottom-color: var(--accent); }
          .wq-input::placeholder { color: var(--muted); opacity: 0.75; font-size: 16px; }

          .wq-trigger { 
            display: flex; justify-content: space-between; align-items: center; 
            background: transparent; border: none; border-bottom: 1px solid var(--line); 
            padding: 14px 0; color: var(--ink); font-size: 15px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s; margin-bottom: 16px;
          }
          .wq-trigger:active { color: var(--accent); }
          .wq-trigger svg { color: var(--muted); flex-shrink: 0; width: 16px; height: 16px; }

          .wq-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); margin-bottom: 24px; }
          .wq-row-title { font-size: 15px; color: var(--ink); font-weight: 500; }

          .wq-canvas-box { 
            background: #ffffff; padding: 16px; border-radius: var(--r); 
            display: flex; justify-content: center; align-items: center; 
            margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            min-height: 200px;
          }
          .wq-canvas-box canvas { max-width: 100%; height: auto; display: none; }
          .wq-canvas-box.has-canvas canvas { display: block; }
          .wq-placeholder { color: var(--muted); font-size: 14px; font-weight: 600; }
          .wq-canvas-box.has-canvas .wq-placeholder { display: none; }

          .wq-actions { display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <label class="wq-label">Nazwa sieci (SSID)</label>
          <input type="text" id="wq-ssid" class="wq-input" placeholder="Np. MojaSieć_Domowa" autocomplete="off" spellcheck="false">

          <label class="wq-label">Hasło do Wi-Fi</label>
          <input type="text" id="wq-password" class="wq-input" placeholder="Wpisz hasło..." autocomplete="off" spellcheck="false">

          <label class="wq-label">Zabezpieczenia</label>
          <div id="wq-security-trigger" class="wq-trigger">
            <span id="wq-security-text">WPA / WPA2 / WPA3</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>

          <div class="wq-row">
            <div class="wq-row-title">Sieć ukryta</div>
            <label class="switch"><input type="checkbox" id="wq-hidden"><span class="switch-slider"></span></label>
          </div>

          <div id="wq-canvas-box" class="wq-canvas-box">
            <canvas id="wq-canvas"></canvas>
            <div class="wq-placeholder">Kod QR pojawi się tutaj</div>
          </div>

          <div class="wq-actions">
            <button id="wq-generate-btn" class="n-btn n-btn-outline" style="padding: 14px;">Wygeneruj kod QR</button>
            <button id="wq-download-btn" class="n-btn" style="padding: 14px;" disabled>Pobierz kod QR</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const ssidInput = $("wq-ssid");
      const passwordInput = $("wq-password");
      const securityTrigger = $("wq-security-trigger");
      const securityText = $("wq-security-text");
      const hiddenToggle = $("wq-hidden");
      const generateBtn = $("wq-generate-btn");
      const downloadBtn = $("wq-download-btn");
      const canvasContainer = $("wq-canvas-box");
      const canvas = $("wq-canvas");

      let currentSecurity = "WPA";
      let currentQrMatrix = null;

      function escapeWifiString(str) {
        if (!str) return "";
        return str.replace(/([\\;,":])/g, '\\$1');
      }

      function generateQR() {
        const ssid = ssidInput.value.trim();
        const password = passwordInput.value;

        if (!ssid) {
          showToast("Wpisz nazwę sieci (SSID).");
          return;
        }

        if (currentSecurity !== "nopass" && !password) {
          showToast("Wpisz hasło do sieci.");
          return;
        }

        const escapedSsid = escapeWifiString(ssid);
        const escapedPass = currentSecurity === "nopass" ? "" : escapeWifiString(password);
        const hiddenStr = hiddenToggle.checked ? "true" : "false";

        let wifiString = "";
        if (currentSecurity === "nopass") {
          wifiString = `WIFI:T:nopass;S:${escapedSsid};H:${hiddenStr};;`;
        } else {
          wifiString = `WIFI:T:${currentSecurity};S:${escapedSsid};P:${escapedPass};H:${hiddenStr};;`;
        }

        try {
          const mat = QR.encode(wifiString);
          currentQrMatrix = mat;
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
              if (mat[r][c]) {
                ctx.fillRect(margin + (c * scale), margin + (r * scale), scale, scale);
              }
            }
          }

          canvasContainer.classList.add("has-canvas");
          downloadBtn.disabled = false;
          Hub.haptic('success');

        } catch (err) {
          showToast("Błąd: Tekst jest za długi dla kodu QR.");
        }
      }

      securityTrigger.addEventListener("click", async () => {
        const opts = [
          { id: "WPA", label: "WPA / WPA2 / WPA3 (Najczęstsze)" },
          { id: "WEP", label: "WEP (Stare sieci)" },
          { id: "nopass", label: "Bez hasła (Otwarta sieć)" }
        ];
        const choice = await Hub.showSelect({ title: "Zabezpieczenia", options: opts, current: currentSecurity, anchor: securityTrigger, signal });
        
        if (choice) {
          currentSecurity = choice;
          securityText.textContent = opts.find(o => o.id === choice).label;
          
          if (currentSecurity === "nopass") {
            passwordInput.disabled = true;
            passwordInput.style.opacity = "0.3";
            passwordInput.value = "";
          } else {
            passwordInput.disabled = false;
            passwordInput.style.opacity = "1";
          }
        }
      }, { signal });

      generateBtn.onclick = generateQR;

      downloadBtn.addEventListener("click", () => {
        if (!currentQrMatrix) return;
        Hub.haptic('success');
        canvas.toBlob(blob => {
          Hub.download(blob, `wifi_qr_${ssidInput.value.trim().replace(/[^a-z0-9]/gi, '_')}.png`);
        }, "image/png");
      }, { signal });

      signal.addEventListener('abort', () => {
        if (currentCanvasUrl) URL.revokeObjectURL(currentCanvasUrl);
      });
    },

    unmount() {}
  });
})();