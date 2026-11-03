(() => {
  Hub.register({
    id: "kalkulator-prog",
    title: "Kalkulator Programistyczny",
    icon: "💻",
    desc: "Konwersja systemów, operacje bitowe i siatka 32-bitowa",

    async mount(container, signal) {
      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="cp-back" style="width:auto; padding:10px 16px; border-radius:6px; margin:0; border:1px solid var(--line); background:var(--surface); color:var(--ink); font-weight:500;">Wróć</button>
        </div>

        <div class="card" style="padding:16px;">
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="margin-top:0; font-size:12px;">HEX (szesnastkowy)</label>
              <input type="text" id="cp-in-hex" style="font-family:monospace; font-size:18px; padding:12px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px; width:100%; text-transform:uppercase;">
            </div>
            <div>
              <label style="margin-top:0; font-size:12px;">DEC (dziesiętny)</label>
              <input type="text" id="cp-in-dec" style="font-family:monospace; font-size:18px; padding:12px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px; width:100%;">
            </div>
            <div>
              <label style="margin-top:0; font-size:12px;">OCT (ósemkowy)</label>
              <input type="text" id="cp-in-oct" style="font-family:monospace; font-size:18px; padding:12px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px; width:100%;">
            </div>
            <div>
              <label style="margin-top:0; font-size:12px;">BIN (binarny)</label>
              <input type="text" id="cp-in-bin" style="font-family:monospace; font-size:13px; padding:12px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px; width:100%; overflow-x:auto; white-space:nowrap;">
            </div>
          </div>
        </div>

        <div class="card" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <label style="margin:0; font-size:12px;">Siatka bitów</label>
            <span style="font-size:11px; color:var(--muted); font-family:monospace;">Bajty: 31-24 | 23-16 | 15-8 | 7-0</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(8, 1fr); gap:6px; justify-items:center;" id="cp-bit-grid"></div>
        </div>

        <div class="card" style="padding:16px;">
          <label style="margin-top:0; font-size:12px;">Operacje bitowe (wpisz liczby dziesiętne)</label>
          <div style="display:flex; gap:8px; margin-bottom:12px;">
            <div style="flex:1;">
              <span style="font-size:11px; color:var(--muted); margin-bottom:4px; display:block;">Wartość A</span>
              <input type="number" id="cp-op-a" value="10" style="width:100%; font-family:monospace; padding:12px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px; text-align:center;">
            </div>
            <div style="flex:1;">
              <span style="font-size:11px; color:var(--muted); margin-bottom:4px; display:block;">Wartość B</span>
              <input type="number" id="cp-op-b" value="3" style="width:100%; font-family:monospace; padding:12px; background:#000; border:1px solid var(--line); color:var(--ink); border-radius:6px; text-align:center;">
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:12px;">
            <button class="cp-op-btn" data-op="AND" style="padding:12px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">A AND B</button>
            <button class="cp-op-btn" data-op="OR" style="padding:12px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">A OR B</button>
            <button class="cp-op-btn" data-op="XOR" style="padding:12px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">A XOR B</button>
            <button class="cp-op-btn" data-op="NOT" style="padding:12px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">NOT A</button>
            <button class="cp-op-btn" data-op="SHL" style="padding:12px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">A << B</button>
            <button class="cp-op-btn" data-op="SHR" style="padding:12px; margin:0; font-family:monospace; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--ink);">A >> B</button>
          </div>

          <div style="text-align:center; background:var(--bg); padding:12px; border-radius:6px; border:1px solid var(--line);">
            <span style="font-size:12px; color:var(--muted); display:block; margin-bottom:4px;">Wynik (DEC)</span>
            <span id="cp-op-result" style="font-family:monospace; font-size:20px; font-weight:bold; color:var(--accent);">0</span>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inHex = $("cp-in-hex");
      const inDec = $("cp-in-dec");
      const inOct = $("cp-in-oct");
      const inBin = $("cp-in-bin");
      const bitGrid = $("cp-bit-grid");
      const opA = $("cp-op-a");
      const opB = $("cp-op-b");
      const opResult = $("cp-op-result");

      let currentValue = 0n;

      function updateAll(val, skipInput = null) {
        currentValue = val & 0xFFFFFFFFn;
        
        if (skipInput !== 'hex') inHex.value = currentValue.toString(16).toUpperCase();
        if (skipInput !== 'dec') inDec.value = currentValue.toString(10);
        if (skipInput !== 'oct') inOct.value = currentValue.toString(8);
        if (skipInput !== 'bin') inBin.value = currentValue.toString(2);

        const bits = bitGrid.querySelectorAll('.cp-bit');
        for (let i = 0; i < 32; i++) {
          const bitIndex = 31 - i;
          const isSet = (currentValue & (1n << BigInt(bitIndex))) !== 0n;
          
          if (isSet) {
            bits[i].textContent = "1";
            bits[i].style.background = "var(--accent)";
            bits[i].style.color = "var(--accent-ink)";
            bits[i].style.borderColor = "var(--accent)";
          } else {
            bits[i].textContent = "0";
            bits[i].style.background = "var(--bg)";
            bits[i].style.color = "var(--muted)";
            bits[i].style.borderColor = "var(--line)";
          }
        }
      }

      for (let i = 0; i < 32; i++) {
        const bitIndex = 31 - i;
        
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "4px";

        const span = document.createElement("span");
        span.className = "cp-bit";
        span.style.display = "flex";
        span.style.alignItems = "center";
        span.style.justifyContent = "center";
        span.style.width = "100%";
        span.style.aspectRatio = "1";
        span.style.borderRadius = "6px";
        span.style.border = "1px solid var(--line)";
        span.style.fontSize = "16px";
        span.style.fontFamily = "monospace";
        span.style.cursor = "pointer";
        span.style.transition = "all 0.1s";
        span.style.userSelect = "none";
        
        span.addEventListener("click", () => {
          currentValue ^= (1n << BigInt(bitIndex));
          updateAll(currentValue);
        }, { signal });

        const label = document.createElement("span");
        label.textContent = bitIndex;
        label.style.fontSize = "10px";
        label.style.color = "var(--muted)";
        label.style.fontFamily = "monospace";
        
        wrapper.appendChild(span);
        wrapper.appendChild(label);
        bitGrid.appendChild(wrapper);
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

      container.querySelectorAll(".cp-op-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const op = btn.dataset.op;
          
          let valA = BigInt(parseInt(opA.value) || 0);
          let valB = BigInt(parseInt(opB.value) || 0);

          let result = 0n;

          if (op === "AND") result = valA & valB;
          else if (op === "OR") result = valA | valB;
          else if (op === "XOR") result = valA ^ valB;
          else if (op === "NOT") result = ~valA & 0xFFFFFFFFn;
          else if (op === "SHL") result = valA << valB;
          else if (op === "SHR") result = valA >> valB;

          opResult.textContent = result.toString(10);
          updateAll(result);
        }, { signal });
      });

      $("cp-back").addEventListener("click", () => history.back(), { signal });

      updateAll(255n);
    },

    unmount() {}
  });
})();