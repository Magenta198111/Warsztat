(() => {
  Hub.register({
    id: "jednostki",
    title: "Konwerter Jednostek",
    desc: "Błyskawiczne przeliczanie długości, masy, temperatury, objętości, prędkości, czasu i powierzchni",

    async mount(container, signal) {
      let savedPrecision = 2;
      let savedCat = "length";
      let savedUnits = {};
      try {
        savedPrecision = await Hub.db.get("unit_precision", 2);
        savedCat = await Hub.db.get("unit_last_cat", "length");
        savedUnits = await Hub.db.get("unit_last_units", {});
      } catch(e) {}

      const data = {
        length: {
          name: "Długość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"></line></svg>`,
          units: { m: [1n, 1n], cm: [1n, 100n], km: [1000n, 1n], in: [254n, 10000n], ft: [3048n, 10000n], mi: [1609344n, 1000n] },
          names: { m: 'Metry', cm: 'Centymetry', km: 'Kilometry', in: 'Cale', ft: 'Stopy', mi: 'Mile' }
        },
        mass: {
          name: "Masa",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><path d="M3 7h18"></path><path d="M6 7l-3 7h6l-3-7z"></path><path d="M18 7l-3 7h6l-3-7z"></path></svg>`,
          units: { kg: [1n, 1n], g: [1n, 1000n], t: [1000n, 1n], lb: [45359237n, 100000000n], oz: [45359237n, 1600000000n] },
          names: { kg: 'Kilogramy', g: 'Gramy', t: 'Tony', lb: 'Funty', oz: 'Uncje' }
        },
        temp: {
          name: "Temperatura",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>`,
          units: ['C', 'F', 'K'],
          names: { C: 'Celsjusz', F: 'Fahrenheit', K: 'Kelwin' }
        },
        volume: {
          name: "Objętość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12"></path><path d="M6 22h12"></path><path d="M6 2l1.5 18h9L18 2"></path><path d="M7 14h10"></path></svg>`,
          units: { l: [1n, 1n], ml: [1n, 1000n], gal: [3785411784n, 1000000000n], pt: [473176473n, 1000000000n] },
          names: { l: 'Litry', ml: 'Mililitry', gal: 'Galony (US)', pt: 'Pinty (US)' }
        },
        speed: {
          name: "Prędkość",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
          units: { ms: [1n, 1n], kmh: [5n, 18n], mph: [44704n, 100000n], knot: [463n, 900n] },
          names: { ms: 'Metry na sekundę', kmh: 'Kilometry na godzinę', mph: 'Mile na godzinę', knot: 'Węzły' }
        },
        time: {
          name: "Czas",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
          units: { s: [1n, 1n], min: [60n, 1n], h: [3600n, 1n], d: [86400n, 1n], w: [604800n, 1n], mo: [2629800n, 1n], y: [31557600n, 1n] },
          names: { s: 'Sekundy', min: 'Minuty', h: 'Godziny', d: 'Dni', w: 'Tygodnie', mo: 'Miesiące', y: 'Lata' }
        },
        area: {
          name: "Powierzchnia",
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`,
          units: { m2: [1n, 1n], km2: [1000000n, 1n], cm2: [1n, 10000n], ha: [10000n, 1n], a: [100n, 1n], ft2: [9290304n, 100000000n], in2: [64516n, 100000000n] },
          names: { m2: 'Metry kwadratowe', km2: 'Kilometry kwadratowe', cm2: 'Centymetry kwadratowe', ha: 'Hektary', a: 'Ary', ft2: 'Stopy kwadratowe', in2: 'Cale kwadratowe' }
        }
      };

      const unitsFor = (cat) => Array.isArray(data[cat].units) ? data[cat].units : Object.keys(data[cat].units);
      let currentCat = data[savedCat] ? savedCat : "length";
      let currentUnit = unitsFor(currentCat).includes(savedUnits[currentCat]) ? savedUnits[currentCat] : unitsFor(currentCat)[0];

      container.innerHTML = `
        <style>
          .uc-top-trigger { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--line); font-size: 14px; font-weight: 600; color: var(--ink); cursor: pointer; margin-bottom: 24px; }
          .uc-top-icon { width: 20px; height: 20px; color: var(--accent); }
          .uc-input-container { display: flex; flex-direction: column; align-items: center; padding: 20px 0 32px 0; border-bottom: 1px solid var(--line); margin-bottom: 24px; overflow: hidden; }
          .uc-big-input { width: 100%; background: transparent; border: none; color: var(--ink); font-size: 48px; font-weight: 700; text-align: center; outline: none; padding: 0; letter-spacing: -0.03em; overflow-x: auto; white-space: nowrap; }
          .uc-select-trigger { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--accent); font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px; padding: 4px 8px; border-radius: 4px; }
          .uc-list { display: flex; flex-direction: column; }
          .uc-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 15px; }
          .uc-row:last-child { border-bottom: none; }
          .uc-row-name { color: var(--muted); font-weight: 500; flex-shrink: 0; }
          .uc-row-val-container { display: flex; align-items: flex-start; justify-content: flex-end; gap: 8px; flex: 1; min-width: 0; }
          .uc-row-val { color: var(--ink); font-family: monospace; font-size: 16px; font-weight: 600; text-align: right; white-space: normal; word-break: break-all; }
          .uc-copy-btn { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 2px 0 0 0; flex-shrink: 0; }
          .uc-copy-btn svg { width: 16px; height: 16px; }
          .uc-clear { background: var(--surface); border: 1px solid var(--line); color: var(--muted); cursor: pointer; width: 26px; height: 26px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-family: monospace; }
          .uc-clear:active { background: var(--line); color: var(--ink); }
          .uc-precision-box { width: 40px; background: var(--surface); border: 1px solid var(--line); color: var(--ink); border-radius: 4px; text-align: center; padding: 4px 0; font-family: monospace; outline: none; }
        </style>

        ${Hub.backButtonHtml}

        <div id="u-cat-trigger" class="uc-top-trigger">
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="uc-top-icon" id="u-cat-icon">${data[currentCat].icon}</div>
            <span id="u-cat-name">${data[currentCat].name}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div class="uc-input-container">
          <input type="text" id="u-input" class="uc-big-input" placeholder="0" value="1" inputmode="decimal" autocomplete="off" spellcheck="false">
          <div id="u-unit-trigger" class="uc-select-trigger">
            <span id="u-unit-text">${data[currentCat].names[currentUnit]}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--muted); letter-spacing: 0.5px;">Przeliczenia</div>
            <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--muted);">
              Miejsca po przecinku:
              <input type="number" id="u-precision" value="${savedPrecision}" min="0" max="20" class="uc-precision-box">
              <button type="button" id="u-clear" class="uc-clear" title="Przywróć 1">×</button>
            </div>
          </div>
          <div id="u-all-list" class="uc-list"></div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("u-input"), precisionEl = $("u-precision"), allList = $("u-all-list");
      const unitText = $("u-unit-text"), unitTrigger = $("u-unit-trigger");
      const catTrigger = $("u-cat-trigger"), catName = $("u-cat-name"), catIcon = $("u-cat-icon");
      const clearBtn = $("u-clear");

      function parseStrToFrac(str) {
        str = str.replace(',', '.').replace(/\s/g, '');
        if (str === '' || str === '-' || str === '.') return { n: 0n, d: 1n };
        let neg = false;
        if (str.startsWith('-')) { neg = true; str = str.slice(1); }
        if (!/^\d*\.?\d*$/.test(str)) return { n: 0n, d: 1n };
        if (str.includes('.')) {
          let parts = str.split('.'), intP = parts[0] || '0', fracP = parts[1] || '';
          return { n: neg ? -BigInt((intP || '0') + fracP) : BigInt((intP || '0') + fracP), d: 10n ** BigInt(fracP.length) };
        }
        return { n: neg ? -BigInt(str) : BigInt(str), d: 1n };
      }

      function divideBigRounded(n, d, precision) {
        if (d === 0n || n === 0n) return "0";
        let neg = (n < 0n) !== (d < 0n);
        n = n < 0n ? -n : n; d = d < 0n ? -d : d;
        let scaledN = n * (10n ** BigInt(precision));
        let roundedN = scaledN / d, rem = scaledN % d;
        if (rem * 2n >= d) roundedN += 1n;
        let resStr = roundedN.toString();
        if (precision > 0) {
          if (resStr.length <= precision) resStr = "0".repeat(precision - resStr.length + 1) + resStr;
          let intPart = resStr.slice(0, -precision), fracPart = resStr.slice(-precision).replace(/0+$/, '');
          resStr = intPart + (fracPart ? "." + fracPart : "");
        }
        return (neg ? '-' : '') + resStr;
      }

      function formatToDisplay(str, raw = false) {
        let parts = str.split('.');
        let intP = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        let fullStr = intP + (parts[1] ? ',' + parts[1] : '');
        return raw ? fullStr : fullStr.replace(/,/g, '<span style="color: var(--accent);">,</span>');
      }

      function calculate() {
        let rawStr = inputEl.value.trim();
        if (rawStr === '' || rawStr === '-' || rawStr === '.') rawStr = '0';
        let precision = Math.min(20, Math.max(0, parseInt(precisionEl.value) || 0));
        allList.innerHTML = "";
        const catData = data[currentCat];
        const keys = unitsFor(currentCat);

        if (currentCat === 'temp') {
          let valFrac = parseStrToFrac(rawStr);
          let cNum = 0n, cDen = 1n;
          if (currentUnit === 'C') { cNum = valFrac.n; cDen = valFrac.d; }
          else if (currentUnit === 'F') { cNum = (valFrac.n - 32n * valFrac.d) * 5n; cDen = valFrac.d * 9n; }
          else if (currentUnit === 'K') { cNum = (valFrac.n * 100n) - (27315n * valFrac.d); cDen = valFrac.d * 100n; }
          
          keys.forEach(k => {
            if (k === currentUnit) return;
            let resNum = 0n, resDen = 1n;
            if (k === 'C') { resNum = cNum; resDen = cDen; }
            else if (k === 'F') { resNum = (cNum * 9n) + (160n * cDen); resDen = cDen * 5n; }
            else if (k === 'K') { resNum = cNum * 100n + 27315n * cDen; resDen = cDen * 100n; }

            let resStr = divideBigRounded(resNum, resDen, precision);
            allList.innerHTML += `
              <div class="uc-row">
                <span class="uc-row-name">${catData.names[k]}</span>
                <div class="uc-row-val-container">
                  <span class="uc-row-val">${formatToDisplay(resStr)}</span>
                  <button class="uc-copy-btn" data-copy="${formatToDisplay(resStr, true)}" onclick="Hub.copy(this.dataset.copy, this)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              </div>`;
          });
        } else {
          let valFrac = parseStrToFrac(rawStr), fromFrac = catData.units[currentUnit];
          keys.forEach(k => {
            if (k === currentUnit) return;
            let toFrac = catData.units[k];
            let resStr = divideBigRounded(valFrac.n * fromFrac[0] * toFrac[1], valFrac.d * fromFrac[1] * toFrac[0], precision);
            allList.innerHTML += `
              <div class="uc-row">
                <span class="uc-row-name">${catData.names[k]}</span>
                <div class="uc-row-val-container">
                  <span class="uc-row-val">${formatToDisplay(resStr)}</span>
                  <button class="uc-copy-btn" data-copy="${formatToDisplay(resStr, true)}" onclick="Hub.copy(this.dataset.copy, this)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              </div>`;
          });
        }
      }

      catTrigger.addEventListener("click", async () => {
        const opts = Object.keys(data).map(k => ({ id: k, label: data[k].name, icon: data[k].icon }));
        const choice = await Hub.showSelect({ title: "Kategoria", options: opts, current: currentCat, anchor: catTrigger, signal });
        if (choice && choice !== currentCat) {
          currentCat = choice;
          catName.textContent = data[currentCat].name;
          catIcon.innerHTML = data[currentCat].icon;
          Hub.db.set("unit_last_cat", currentCat);
          const ks = unitsFor(currentCat);
          currentUnit = (savedUnits[currentCat] && ks.includes(savedUnits[currentCat])) ? savedUnits[currentCat] : ks[0];
          unitText.textContent = data[currentCat].names[currentUnit];
          calculate();
        }
      }, { signal });

      unitTrigger.addEventListener("click", async () => {
        const catData = data[currentCat];
        const keys = unitsFor(currentCat);
        const opts = keys.map(k => ({ id: k, label: catData.names[k] }));
        const choice = await Hub.showSelect({ title: "Wybierz jednostkę", options: opts, current: currentUnit, anchor: unitTrigger, signal });
        if (choice && choice !== currentUnit) {
          currentUnit = choice;
          savedUnits[currentCat] = currentUnit;
          Hub.db.set("unit_last_units", savedUnits);
          unitText.textContent = catData.names[currentUnit];
          calculate();
        }
      }, { signal });

      precisionEl.addEventListener("input", () => {
        const p = parseInt(precisionEl.value);
        if (!isNaN(p)) Hub.db.set("unit_precision", Math.min(20, Math.max(0, p)));
        calculate();
      }, { signal });

      precisionEl.addEventListener("blur", () => {
        let p = parseInt(precisionEl.value);
        if (isNaN(p) || p < 0) p = 0;
        if (p > 20) p = 20;
        precisionEl.value = p;
        Hub.db.set("unit_precision", p);
        calculate();
      }, { signal });

      inputEl.addEventListener("input", () => {
        let v = inputEl.value;
        let cleaned = v.replace(/[^0-9,.\-]/g, '');
        cleaned = cleaned.replace(/(?!^)-/g, '');
        const dotIdx = cleaned.search(/[.,]/);
        if (dotIdx !== -1) cleaned = cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/[.,]/g, '');
        if (cleaned !== v) inputEl.value = cleaned;
        calculate();
      }, { signal });

      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        inputEl.value = "1";
        calculate();
        inputEl.focus();
      }, { signal });

      calculate();
    },
    unmount() {}
  });
})();