(() => {
  Hub.register({
    id: "kalkulator-prog",
    title: "Kalkulator Pro",
    icon: "💻",
    desc: "Konwersja systemów, operacje bitowe i siatka 32-bitowa",

    async mount(container, signal) {
      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="cp-back" style="width:auto; padding:10px 16px; border-radius:6px; margin:0; border:1px solid var(--line); background:var(--surface); color:var(--ink); font-weight:500;">Wróć</button>
        </div>

        <div class="card" style="padding:16px;">
          <label style="margin-top:0;">Wartość główna</label>
          <input type="text" id="cp-main-input" value="255" style="font-family:monospace; font-size:20px; text-align:center; letter-spacing:1px; padding:16px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px; width:100%;">
          
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
            <div style="display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg); border:1px solid var(--line); border-radius:6px; font-family:monospace; font-size:14px;">
              <span style="color:var(--muted);">HEX</span>
              <span id="cp-val-hex" style="color:var(--ink);">FF</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg); border:1px solid var(--line); border-radius:6px; font-family:monospace; font-size:14px;">
              <span style="color:var(--muted);">DEC</span>
              <span id="cp-val-dec" style="color:var(--ink);">255</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg); border:1px solid var(--line); border-radius:6px; font-family:monospace; font-size:14px;">
              <span style="color:var(--muted);">OCT</span>
              <span id="cp-val-oct" style="color:var(--ink);">377</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg); border:1px solid var(--line); border-radius:6px; font-family:monospace; font-size:14px;">
              <span style="color:var(--muted);">BIN</span>
              <span id="cp-val-bin" style="color:var(--ink); font-size:12px; word-break:break-all; text-align:right; max-width:70%;">11111111</span>
            </div>
          </div>
        </div>

        <div class="card" style="padding:16px;">
          <label style="margin-top:0;">Siatka bitów (kliknij, aby przełączyć)</label>
          <div id="cp-bit-grid" style="display:grid; grid-template-columns:repeat(8, 1fr); gap:4px; margin-top:8px;"></div>
        </div>

        <div class="card" style="padding:16px;">
          <label style="margin-top:0;">Operacje bitowe</label>
          <div style="display:flex; gap:8px; margin-bottom:12px;">
            <input type="text" id="cp-op-a" placeholder="A (HEX)" style="flex:1; font-family:monospace; padding:12px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px;">
            <input type="text" id="cp-op-b" placeholder="B (HEX)" style="flex:1; font-family:monospace; padding:12px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px;">
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
            <button class="cp-op-btn" data-op="AND" style="padding:10px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">AND</button>
            <button class="cp-op-btn" data-op="OR" style="padding:10px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">OR</button>
            <button class="cp-op-btn" data-op="XOR" style="padding:10px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">XOR</button>
            <button class="cp-op-btn" data-op="NOT" style="padding:10px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">NOT A</button>
            <button class="cp-op-btn" data-op="SHL" style="padding:10px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">A << 1</button>
            <button class="cp-op-btn" data-op="SHR" style="padding:10px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">A >> 1</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const mainInput = $("cp-main-input");
      const valHex = $("cp-val-hex");
      const valDec = $("cp-val-dec");
      const valOct = $("cp-val-oct");
      const valBin = $("cp-val-bin");
      const bitGrid = $("cp-bit-grid");
      const opA = $("cp-op-a");
      const opB = $("cp-op-b");

      let currentValue = 255n;

      function updateUI() {
        let v = currentValue & 0xFFFFFFFFn;
        
        valHex.textContent = v.toString(16).toUpperCase();
        valDec.textContent = v.toString(10);
        valOct.textContent = v.toString(8);
        
        let binStr = v.toString(2);
        valBin.textContent = binStr;

        const bits = bitGrid.children;
        for (let i = 0; i < 32; i++) {
          const bitIndex = 31 - i;
          const isSet = (v & (1n << BigInt(bitIndex))) !== 0n;
          
          if (isSet) {
            bits[i].style.background = "var(--accent)";
            bits[i].style.color = "var(--accent-ink)";
            bits[i].style.borderColor = "var(--accent)";
          } else {
            bits[i].style.background = "var(--bg)";
            bits[i].style.color = "var(--muted)";
            bits[i].style.borderColor = "var(--line)";
          }
        }
      }

      function setValue(val) {
        currentValue = val & 0xFFFFFFFFn;
        mainInput.value = currentValue.toString(16).toUpperCase();
        updateUI();
      }

      for (let i = 0; i < 32; i++) {
        const span = document.createElement("span");
        span.textContent = i.toString();
        span.style.display = "flex";
        span.style.alignItems = "center";
        span.style.justifyContent = "center";
        span.style.height = "32px";
        span.style.borderRadius = "4px";
        span.style.border = "1px solid var(--line)";
        span.style.fontSize = "10px";
        span.style.fontFamily = "monospace";
        span.style.cursor = "pointer";
        span.style.transition = "all 0.15s";
        span.style.userSelect = "none";
        
        span.addEventListener("click", () => {
          const bitIndex = 31 - i;
          currentValue ^= (1n << BigInt(bitIndex));
          mainInput.value = currentValue.toString(16).toUpperCase();
          updateUI();
        }, { signal });
        
        bitGrid.appendChild(span);
      }

      mainInput.addEventListener("input", (e) => {
        let raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
        e.target.value = raw;
        if (!raw) {
          currentValue = 0n;
          updateUI();
          return;
        }
        try {
          currentValue = BigInt("0x" + raw) & 0xFFFFFFFFn;
          updateUI();
        } catch(err) {}
      }, { signal });

      container.querySelectorAll(".cp-op-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const op = btn.dataset.op;
          
          let valA = 0n;
          let valB = 0n;
          try { valA = BigInt("0x" + (opA.value || mainInput.value)); } catch(e) {}
          try { valB = BigInt("0x" + (opB.value || "0")); } catch(e) {}

          let result = 0n;

          if (op === "AND") result = valA & valB;
          else if (op === "OR") result = valA | valB;
          else if (op === "XOR") result = valA ^ valB;
          else if (op === "NOT") result = ~valA;
          else if (op === "SHL") result = valA << 1n;
          else if (op === "SHR") result = valA >> 1n;

          setValue(result);
        }, { signal });
      });

      $("cp-back").addEventListener("click", () => history.back(), { signal });

      setValue(255n);
    },

    unmount() {}
  });
})();