(() => {
  Hub.register({
    id: "oczyszczacz",
    title: "Oczyszczacz Tekstu",
    desc: "Usuwanie formatowania, gwiazdek, myślników i zbędnych spacji",

    async mount(container, signal) {
      let currentCaseMode = "sentence";

      const caseNames = {
        "sentence": "Zdania (Duża po kropce)",
        "upper": "Wszystko WIELKIMI literami",
        "lower": "wszystko małymi literami",
        "title": "Każde Słowo Z Dużej Litery"
      };

      container.innerHTML = `
        <style>
          .o-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          .o-card { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
          .o-textarea { width: 100%; padding: 14px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); font-size: 15px; font-family: inherit; resize: vertical; outline: none; min-height: 120px; transition: border-color 0.2s; line-height: 1.5; margin-bottom: 16px; }
          .o-textarea:focus { border-color: var(--accent); }
          .o-textarea::placeholder { color: var(--muted); }
          .o-output-textarea { color: var(--accent); font-weight: 500; margin-bottom: 0; }
          .o-trigger { display: flex; justify-content: space-between; align-items: center; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 14px 16px; color: var(--ink); font-size: 15px; cursor: pointer; user-select: none; margin-bottom: 16px; }
          .o-trigger:active { background: var(--surface-hover); }
          .o-trigger svg { color: var(--muted); }
          .o-tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
          .o-tool-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 12px; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; color: var(--ink); font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
          .o-tool-btn:active { background: var(--surface-hover); }
          .o-tool-btn svg { width: 20px; height: 20px; stroke: var(--muted); }
          .o-stats { display: flex; justify-content: space-between; font-family: monospace; font-size: 12px; color: var(--muted); padding: 12px 0; border-top: 1px solid var(--line); margin-top: 16px; }
          .o-action-row { display: flex; gap: 8px; margin-top: 16px; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <label class="o-label">Tekst źródłowy</label>
          <textarea id="o-input" class="o-textarea" placeholder="Wklej tekst ze strony, PDF-a lub AI..."></textarea>
        </div>

        <div class="o-card">
          <label class="o-label" style="margin-bottom: 12px;">Wielkość liter</label>
          <div id="o-case-trigger" class="o-trigger" style="margin-bottom: 0;">
            <span id="o-case-text">${caseNames[currentCaseMode]}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        <div class="o-card">
          <label class="o-label" style="margin-bottom: 12px;">Inteligentne czyszczenie</label>
          <div class="settings-row" style="padding: 12px 0; border-bottom: 1px solid var(--line);"><div style="flex: 1; padding-right: 12px;"><div class="settings-label" style="font-size: 14px;">Usuwaj linki (URL)</div></div><label class="switch"><input type="checkbox" id="o-clean-url"><span class="switch-slider"></span></label></div>
          <div class="settings-row" style="padding: 12px 0; border-bottom: 1px solid var(--line);"><div style="flex: 1; padding-right: 12px;"><div class="settings-label" style="font-size: 14px;">Usuwaj znaki Markdown</div><div class="settings-desc">np. #, **, _, ></div></div><label class="switch"><input type="checkbox" id="o-clean-md"><span class="switch-slider"></span></label></div>
          <div class="settings-row" style="padding: 12px 0; border-bottom: 1px solid var(--line);"><div style="flex: 1; padding-right: 12px;"><div class="settings-label" style="font-size: 14px;">Popraw spacje i interpunkcję</div><div class="settings-desc">Usuwa spacje przed . , ! ?</div></div><label class="switch"><input type="checkbox" id="o-clean-space" checked><span class="switch-slider"></span></label></div>
          <div class="settings-row" style="padding: 12px 0; border-bottom: 1px solid var(--line);"><div style="flex: 1; padding-right: 12px;"><div class="settings-label" style="font-size: 14px;">Usuwaj nawiasy i cudzysłowy</div><div class="settings-desc">Usuwa [], {}, "", ''</div></div><label class="switch"><input type="checkbox" id="o-clean-brackets"><span class="switch-slider"></span></label></div>
          <div class="settings-row" style="padding: 12px 0; border-bottom: none;"><div style="flex: 1; padding-right: 12px;"><div class="settings-label" style="font-size: 14px;">Zostaw jeden myślnik</div><div class="settings-desc">Zamienia -- na -, wyłącz by usunąć</div></div><label class="switch"><input type="checkbox" id="o-dash-toggle" checked><span class="switch-slider"></span></label></div>
        </div>

        <div class="o-card">
          <label class="o-label" style="margin-bottom: 12px;">Narzędzia listy (modyfikują tekst źródłowy)</label>
          <div class="o-tools-grid">
            <button id="o-sort-btn" class="o-tool-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>Sortuj A-Z</button>
            <button id="o-dedupe-btn" class="o-tool-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Usuń duplikaty</button>
          </div>
        </div>

        <div style="margin-top: 24px;">
          <label class="o-label">Wynik (na żywo)</label>
          <textarea id="o-output" class="o-textarea o-output-textarea" readonly placeholder="Tutaj pojawi się czysty tekst..."></textarea>
          <div class="o-stats"><span id="o-stat-chars">Znaki: 0</span><span id="o-stat-words">Słowa: 0</span></div>
          <div class="o-action-row">
            <button id="o-undo" class="n-btn" style="flex: 1; opacity: 0.5;" disabled>Cofnij</button>
            <button id="o-clear" class="n-btn" style="flex: 1; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">Wyczyść</button>
            <button id="o-copy" class="n-btn n-btn-outline" style="flex: 2;">Kopiuj wynik</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("o-input");
      const outputEl = $("o-output");
      const caseTrigger = $("o-case-trigger"), caseText = $("o-case-text");
      const cleanUrl = $("o-clean-url"), cleanMd = $("o-clean-md"), cleanSpace = $("o-clean-space"), cleanBrackets = $("o-clean-brackets"), dashToggle = $("o-dash-toggle");
      const statChars = $("o-stat-chars"), statWords = $("o-stat-words");
      const undoBtn = $("o-undo");

      let history = [];
      const newLineChar = String.fromCharCode(10);

      function saveHistory() {
        if (inputEl.value !== history[history.length - 1]) {
          history.push(inputEl.value);
          if (history.length > 20) history.shift();
          undoBtn.disabled = false;
          undoBtn.style.opacity = "1";
        }
      }

      function updateStats(text) {
        if (!text) { statChars.textContent = "Znaki: 0"; statWords.textContent = "Słowa: 0"; return; }
        const chars = text.length;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        statChars.textContent = `Znaki: ${chars}`;
        statWords.textContent = `Słowa: ${words}`;
      }

      function processText() {
        let text = inputEl.value;
        if (!text) { outputEl.value = ""; updateStats(""); return; }

        text = text.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ");
        if (cleanUrl.checked) text = text.replace(/https?:\/\/[^\s]+/g, "");
        if (cleanMd.checked) text = text.replace(/[#*_>]/g, "");
        if (cleanBrackets.checked) text = text.replace(/[\[\]{}""'']/g, "");
        if (cleanSpace.checked) text = text.replace(/\s+([.,!?;:])/g, "$1");
        if (dashToggle.checked) text = text.replace(/-{2,}/g, "-");
        else text = text.replace(/-{2,}/g, "");

        if (currentCaseMode === "sentence") text = text.replace(/(^\s*|[.!?]\s+)([a-ząćęłńóśźż])/g, (m, p, l) => p + l.toUpperCase());
        else if (currentCaseMode === "upper") text = text.toUpperCase();
        else if (currentCaseMode === "lower") text = text.toLowerCase();
        else if (currentCaseMode === "title") text = text.replace(/\b\w/g, l => l.toUpperCase());

        outputEl.value = text.trim();
        updateStats(outputEl.value);
      }

      inputEl.addEventListener("input", () => {
        processText();
        clearTimeout(inputEl._historyTimer);
        inputEl._historyTimer = setTimeout(saveHistory, 1000);
      }, { signal });

      [cleanUrl, cleanMd, cleanSpace, cleanBrackets, dashToggle].forEach(toggle => {
        toggle.addEventListener("change", () => { Hub.haptic('light'); processText(); }, { signal });
      });

      caseTrigger.addEventListener("click", async () => {
        const opts = Object.keys(caseNames).map(k => ({ id: k, label: caseNames[k] }));
        const choice = await Hub.showSelect({ title: "Wielkość liter", options: opts, current: currentCaseMode, anchor: caseTrigger, signal });
        if (choice && choice !== currentCaseMode) {
          currentCaseMode = choice;
          caseText.textContent = caseNames[currentCaseMode];
          processText();
        }
      }, { signal });

      $("o-sort-btn").addEventListener("click", () => {
        if (!inputEl.value) return;
        Hub.haptic('light'); saveHistory();
        const lines = inputEl.value.split(/\r?\n/).filter(l => l.trim().length > 0);
        lines.sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' }));
        inputEl.value = lines.join(newLineChar);
        processText();
      }, { signal });

      $("o-dedupe-btn").addEventListener("click", () => {
        if (!inputEl.value) return;
        Hub.haptic('light'); saveHistory();
        const lines = inputEl.value.split(/\r?\n/);
        const uniqueLines = [...new Set(lines.map(l => l.trim()))].filter(l => l.length > 0);
        inputEl.value = uniqueLines.join(newLineChar);
        processText();
      }, { signal });

      undoBtn.addEventListener("click", () => {
        if (history.length > 1) {
          history.pop();
          inputEl.value = history[history.length - 1];
          processText();
          Hub.haptic('light');
          if (history.length <= 1) { undoBtn.disabled = true; undoBtn.style.opacity = "0.5"; }
        }
      }, { signal });

      $("o-copy").addEventListener("click", () => {
        if (!outputEl.value) return showToast("Brak tekstu do skopiowania");
        Hub.copy(outputEl.value, $("o-copy"));
      }, { signal });

      $("o-clear").addEventListener("click", () => {
        Hub.haptic('medium'); saveHistory();
        inputEl.value = ""; outputEl.value = ""; updateStats(""); inputEl.focus();
      }, { signal });

      processText();
    },
    unmount() {}
  });
})();