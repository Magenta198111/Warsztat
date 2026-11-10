(() => {
  Hub.register({
    id: "kalkulator-prog",
    title: "Kalkulator programistyczny",
    desc: "Systemy liczbowe i operacje bitowe",

    async mount(container, signal) {
      container.innerHTML = `
        <style>
          .hidden { display: none !important; }
          
          .cp-label { display: block; font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
          
          .cp-inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; margin-top: 16px; }
          .cp-input-group { display: flex; flex-direction: column; }
          
          .cp-input-wrapper {
            display: flex; align-items: center;
            border-bottom: 1px solid var(--line);
            transition: border-color 0.2s;
          }
          .cp-input-wrapper:focus-within { border-bottom-color: var(--accent); }
          
          .cp-input { 
            width: 100%; background: transparent; border: none; 
            color: var(--ink); font-size: 18px; font-family: var(--font-mono); padding: 8px 0; 
            outline: none; border-radius: 0;
          }
          .cp-input::placeholder { color: var(--muted); opacity: 0.75; font-size: 14px; }
          
          .cp-copy-btn {
            background: transparent; border: none; padding: 8px; margin: 0;
            color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: color 0.2s, transform 0.1s; flex-shrink: 0; outline: none;
          }
          .cp-copy-btn:active { transform: scale(0.9); }
          .cp-copy-btn svg { width: 16px; height: 16px; }
          
          .cp-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          /* Modyfikacja siatki bitów: dodano gap i margines dla oktetów */
          .cp-bit-grid { 
            display: grid; 
            grid-template-columns: repeat(8, 1fr); 
            gap: 4px; 
            margin-bottom: 24px; 
          }
          .cp-bit-cell {
            aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
            border-radius: 4px; border: 1px solid var(--line); background: var(--surface);
            font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--muted);
            cursor: pointer; transition: all 0.1s; user-select: none;
          }
          .cp-bit-cell.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
          .cp-bit-cell:active { transform: scale(0.9); }
          /* Wizualne oddzielenie bajtów co 8 bitów */
          
          .cp-op-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .cp-op-inputs { display: flex; gap: 12px; margin-bottom: 16px; }
          .cp-op-inputs .cp-input-wrapper { flex: 1; }
          .cp-op-inputs .cp-input { text-align: center; }
          
          .cp-btn {
            width: 100%; padding: 12px; border-radius: var(--r); font-weight: 600; font-size: 14px;
            cursor: pointer; text-align: center; background: var(--surface); color: var(--ink);
            border: 1px solid var(--line); transition: background 0.2s, border-color 0.2s;
            outline: none; -webkit-tap-highlight-color: transparent; font-family: var(--font-mono);
          }
          .cp-btn:active { background: var(--surface-hover); }
          
          .cp-result-wrapper {
            display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 8px;
          }
          .cp-result { text-align: center; font-family: var(--font-mono); font-size: 24px; font-weight: 700; color: var(--accent); }
        </style>

        ${Hub.backButtonHtml}

        <div class="cp-inputs-grid">
          <div class="cp-input-group">
            <label class="cp-label">HEX</label>
            <div class="cp-input-wrapper">
              <input type="text" id="cp-in-hex" class="cp-input" autocomplete="off" autocorrect="off" spellcheck="false">
              <button class="cp-copy-btn" data-target="cp-in-hex" title="Kopiuj">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
          <div class="cp-input-group">
            <label class="cp-label">DEC</label>
            <div class="cp-input-wrapper">
              <input type="text" id="cp-in-dec" class="cp-input" inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocorrect="off" spellcheck="false">
              <button class="cp-copy-btn" data-target="cp-in-dec" title="Kopiuj">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
          <div class="cp-input-group">
            <label class="cp-label">OCT</label>
            <div class="cp-input-wrapper">
              <input type="text" id="cp-in-oct" class="cp-input" inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocorrect="off" spellcheck="false">
              <button class="cp-copy-btn" data-target="cp-in-oct" title="Kopiuj">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
          <div class="cp-input-group">
            <label class="cp-label">BIN</label>
            <div class="cp-input-wrapper">
              <input type="text" id="cp-in-bin" class="cp-input" inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocorrect="off" spellcheck="false">
              <button class="cp-copy-btn" data-target="cp-in-bin" title="Kopiuj">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="cp-divider"></div>

        <label class="cp-label">Siatka bitów (kliknij, aby przełączyć)</label>
        <div id="cp-bit-grid" class="cp-bit-grid"></div>

        <div class="cp-divider"></div>

        <label class="cp-label">Operacje bitowe</label>
        <div class="cp-op-inputs">
          <div class="cp-input-wrapper">
            <input type="text" id="cp-op-a" class="cp-input" inputmode="numeric" pattern="[0-9]*" placeholder="A" autocomplete="off" autocorrect="off" spellcheck="false">
          </div>
          <div class="cp-input-wrapper">
            <input type="text" id="cp-op-b" class="cp-input" inputmode="numeric" pattern="[0-9]*" placeholder="B" autocomplete="off" autocorrect="off" spellcheck="false">
          </div>
        </div>
        
        <div class="cp-op-grid">
          <button class="cp-btn" data-op="AND">A AND B</button>
          <button class="cp-btn" data-op="OR">A OR B</button>
          <button class="cp-btn" data-op="XOR">A XOR B</button>
          <button class="cp-btn" data-op="NOT">NOT A</button>
          <button class="cp-btn" data-op="SHL">A &lt;&lt; B</button>
          <button class="cp-btn" data-op="SHR">A &gt;&gt; B</button>
        </div>

        <div style="text-align: center; margin-top: 16px;">
          <div class="cp-label" style="margin-bottom: 4px;">Wynik operacji (DEC)</div>
          <div class="cp-result-wrapper">
            <div id="cp-op-result" class="cp-result">0</div>
            <button class="cp-copy-btn" id="cp-copy-op-result" title="Kopiuj">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inHex = $("cp-in-hex"), inDec = $("cp-in-dec"), inOct = $("cp-in-oct"), inBin = $("cp-in-bin");
      const bitGrid = $("cp-bit-grid");
      const opA = $("cp-op-a"), opB = $("cp-op-b"), opResult = $("cp-op-result");

      // Obsługa kopiowania
      container.querySelectorAll(".cp-copy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          let textToCopy = "";
          if (btn.id === "cp-copy-op-result") {
            textToCopy = opResult.textContent;
          } else {
            const targetInput = $(btn.dataset.target);
            if (targetInput) textToCopy = targetInput.value;
          }

          if (!textToCopy) return;

          Hub.haptic('light');
          navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => { btn.innerHTML = originalHTML; }, 1500);
          }).catch(() => showToast("Błąd kopiowania"));
        }, { signal });
      });

      let currentValue = 0n;

      function updateAll(val, skipInput = null) {
        currentValue = val & 0xFFFFFFFFn; // Zapewnia 32-bitowy unsigned
        
        if (skipInput !== 'hex') inHex.value = currentValue.toString(16).toUpperCase();
        if (skipInput !== 'dec') inDec.value = currentValue.toString(10);
        if (skipInput !== 'oct') inOct.value = currentValue.toString(8);
        if (skipInput !== 'bin') inBin.value = currentValue.toString(2);

        const bits = bitGrid.querySelectorAll('.cp-bit-cell');
        for (let i = 0; i < 32; i++) {
          const bitIndex = 31 - i;
          const isSet = (currentValue & (1n << BigInt(bitIndex))) !== 0n;
          
          if (isSet) {
            bits[i].classList.add("active");
            bits[i].textContent = "1";
          } else {
            bits[i].classList.remove("active");
            bits[i].textContent = "0";
          }
        }
      }

      for (let i = 0; i < 32; i++) {
        const bitIndex = 31 - i;
        const cell = document.createElement("div");
        cell.className = "cp-bit-cell";
        cell.textContent = "0";
        cell.addEventListener("click", () => {
          Hub.haptic('light');
          currentValue ^= (1n << BigInt(bitIndex));
          updateAll(currentValue);
        }, { signal });
        bitGrid.appendChild(cell);
      }

      inHex.addEventListener("input", (e) => {
        let raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
        e.target.value = raw;
        if (!raw) return updateAll(0n, 'hex');
        try { updateAll(BigInt("0x" + raw), 'hex'); } catch(err) {}
      }, { signal });

      inDec.addEventListener("input", (e) => {
        let raw = e.target.value.replace(/[^0-9]/g, "");
        e.target.value = raw;
        if (!raw) return updateAll(0n, 'dec');
        try { updateAll(BigInt(raw), 'dec'); } catch(err) {}
      }, { signal });

      inOct.addEventListener("input", (e) => {
        let raw = e.target.value.replace(/[^0-7]/g, "");
        e.target.value = raw;
        if (!raw) return updateAll(0n, 'oct');
        try { updateAll(BigInt("0o" + raw), 'oct'); } catch(err) {}
      }, { signal });

      inBin.addEventListener("input", (e) => {
        let raw = e.target.value.replace(/[^01]/g, "");
        e.target.value = raw;
        if (!raw) return updateAll(0n, 'bin');
        try { updateAll(BigInt("0b" + raw), 'bin'); } catch(err) {}
      }, { signal });

      container.querySelectorAll(".cp-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          Hub.haptic('medium');
          const op = btn.dataset.op;
          
          let valA = 0n, valB = 0n;
          try { valA = BigInt(opA.value || 0); } catch(e) { valA = 0n; }
          try { valB = BigInt(opB.value || 0); } catch(e) { valB = 0n; }
          
          let result = 0n;

          if (op === "AND") result = valA & valB;
          else if (op === "OR") result = valA | valB;
          else if (op === "XOR") result = valA ^ valB;
          else if (op === "NOT") result = ~valA & 0xFFFFFFFFn;
          else if (op === "SHL") {
            if (valB < 0n) return showToast("Przesunięcie nie może być ujemne");
            result = valA << valB;
          }
          else if (op === "SHR") {
            if (valB < 0n) return showToast("Przesunięcie nie może być ujemne");
            result = valA >> valB;
          }

          result = result & 0xFFFFFFFFn;
          opResult.textContent = result.toString(10);
          updateAll(result);
        }, { signal });
      });

      updateAll(255n);
    },

    unmount() {}
  });
})();