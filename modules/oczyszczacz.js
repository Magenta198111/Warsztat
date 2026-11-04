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
          .o-flat-section { margin-bottom: 28px; }
          .o-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          .o-textarea {
            width: 100%; padding: 12px 0; background: transparent; border: none;
            border-bottom: 1px solid var(--line); color: var(--ink); font-size: 16px; 
            font-family: inherit; resize: vertical; outline: none; 
            min-height: 100px; overflow-y: hidden; transition: border-color 0.2s, height 0.1s ease-out; 
            line-height: 1.5; box-sizing: border-box; touch-action: pan-y;
          }
          .o-textarea:focus { border-bottom-color: var(--accent); }
          .o-textarea::placeholder { color: var(--muted); font-size: 15px; }
          .o-output-textarea { color: var(--accent); font-weight: 500; }

          .o-trigger { 
            display: flex; justify-content: space-between; align-items: center; 
            background: transparent; border: none; border-bottom: 1px solid var(--line); 
            padding: 16px 0; color: var(--ink); font-size: 16px; font-weight: 500;
            cursor: pointer; user-select: none; transition: color 0.2s;
          }
          .o-trigger:active { color: var(--accent); }
          .o-trigger .icon { color: var(--muted); font-family: monospace; font-size: 20px; font-weight: 300; line-height: 1; }
          
          .o-accordion { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
          .o-accordion.open { max-height: 800px; } /* Zwiększone dla pod-opcji */
          
          /* Style dla grupy opcji */
          .o-option-group { border-bottom: 1px solid var(--line); }
          .o-option-group:last-child { border-bottom: none; }
          
          .o-option-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
          
          .o-option-left { display: flex; align-items: center; gap: 8px; }
          .o-option-title { font-size: 15px; font-weight: 500; color: var(--ink); }
          .o-option-desc { font-size: 12px; color: var(--muted); margin-top: 4px; }
          
          /* Mała strzałka do rozwijania pod-opcji */
          .o-sub-arrow { 
            background: transparent; border: none; color: var(--muted); cursor: pointer; 
            padding: 4px; display: flex; align-items: center; justify-content: center; 
            transition: transform 0.2s; outline: none;
          }
          .o-sub-arrow.open { transform: rotate(180deg); }
          .o-sub-arrow svg { width: 16px; height: 16px; }

          /* Kontener na pod-opcje */
          .o-sub-options { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; padding-left: 16px; border-left: 1px solid var(--line); margin-left: 8px; }
          .o-sub-options.open { max-height: 200px; margin-bottom: 12px; }
          .o-sub-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
          .o-sub-title { font-size: 13px; color: var(--muted); }

          /* Stan częściowy dla głównego switcha */
          .switch.partial .switch-slider { opacity: 0.6; }
          .switch.partial .switch-slider:before { opacity: 0.8; }

          .o-stats { display: flex; justify-content: space-between; font-family: monospace; font-size: 13px; color: var(--muted); padding: 16px 0 0 0; }
          .o-action-row { display: flex; gap: 12px; margin-top: 16px; }
        </style>

        ${Hub.backButtonHtml}

        <div class="o-flat-section" style="margin-top: 16px;">
          <label class="o-label">Tekst źródłowy</label>
          <textarea id="o-input" class="o-textarea" placeholder="Wklej tekst..."></textarea>
        </div>

        <div class="o-flat-section">
          <label class="o-label">Wielkość liter</label>
          <div id="o-case-trigger" class="o-trigger">
            <span id="o-case-text">${caseNames[currentCaseMode]}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--muted);"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        <div class="o-flat-section">
          <div id="o-clean-trigger" class="o-trigger">
            <span>Inteligentne czyszczenie</span>
            <span id="o-clean-icon" class="icon">+</span>
          </div>
          
          <div id="o-clean-accordion" class="o-accordion">
            
            <!-- GRUPA 1: LINKI -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-url"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div><div class="o-option-title">Usuwaj linki</div></div>
                </div>
                <label class="switch" id="sw-url-group"><input type="checkbox" id="o-clean-url"><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-url">
                <div class="o-sub-row"><span class="o-sub-title">Adresy URL (https://)</span><label class="switch"><input type="checkbox" class="sub-url-opt" data-parent="o-clean-url" checked><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Adresy WWW (www.)</span><label class="switch"><input type="checkbox" class="sub-url-opt" data-parent="o-clean-url" checked><span class="switch-slider"></span></label></div>
              </div>
            </div>

            <!-- GRUPA 2: MARKDOWN -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-md"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div><div class="o-option-title">Znaki Markdown</div></div>
                </div>
                <label class="switch" id="sw-md-group"><input type="checkbox" id="o-clean-md"><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-md">
                <div class="o-sub-row"><span class="o-sub-title">Nagłówki (#)</span><label class="switch"><input type="checkbox" class="sub-md-opt" data-parent="o-clean-md" checked><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Pogrubienie (*, _)</span><label class="switch"><input type="checkbox" class="sub-md-opt" data-parent="o-clean-md" checked><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Cytaty (>)</span><label class="switch"><input type="checkbox" class="sub-md-opt" data-parent="o-clean-md" checked><span class="switch-slider"></span></label></div>
              </div>
            </div>

            <!-- GRUPA 3: INTERPUNKCJA -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-space"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div><div class="o-option-title">Popraw interpunkcję</div></div>
                </div>
                <label class="switch" id="sw-space-group"><input type="checkbox" id="o-clean-space" checked><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-space">
                <div class="o-sub-row"><span class="o-sub-title">Kropki i przecinki (. ,)</span><label class="switch"><input type="checkbox" class="sub-space-opt" data-parent="o-clean-space" checked><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Wykrzykniki i pytajniki (! ?)</span><label class="switch"><input type="checkbox" class="sub-space-opt" data-parent="o-clean-space" checked><span class="switch-slider"></span></label></div>
              </div>
            </div>

            <!-- GRUPA 4: NAWIASY -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-brackets"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div><div class="o-option-title">Usuwaj nawiasy</div></div>
                </div>
                <label class="switch" id="sw-brackets-group"><input type="checkbox" id="o-clean-brackets"><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-brackets">
                <div class="o-sub-row"><span class="o-sub-title">Kwadratowe []</span><label class="switch"><input type="checkbox" class="sub-brackets-opt" data-parent="o-clean-brackets" checked><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Klamrowe {}</span><label class="switch"><input type="checkbox" class="sub-brackets-opt" data-parent="o-clean-brackets" checked><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Cudzysłowy "" ''</span><label class="switch"><input type="checkbox" class="sub-brackets-opt" data-parent="o-clean-brackets" checked><span class="switch-slider"></span></label></div>
              </div>
            </div>

            <!-- GRUPA 5: MYŚLNIKI -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-dash"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div><div class="o-option-title">Zostaw jeden myślnik</div></div>
                </div>
                <label class="switch" id="sw-dash-group"><input type="checkbox" id="o-dash-toggle" checked><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-dash">
                <div class="o-sub-row"><span class="o-sub-title">Zamień (-- na -)</span><label class="switch"><input type="checkbox" class="sub-dash-opt" data-parent="o-dash-toggle" checked><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj (-- całkiem)</span><label class="switch"><input type="checkbox" class="sub-dash-opt" data-parent="o-dash-toggle"><span class="switch-slider"></span></label></div>
              </div>
            </div>

          </div>
        </div>

        <div class="o-divider"></div>

        <div class="o-flat-section">
          <label class="o-label">Wynik (na żywo)</label>
          <textarea id="o-output" class="o-textarea o-output-textarea" readonly placeholder="Tutaj pojawi się czysty tekst..."></textarea>
          <div class="o-stats"><span id="o-stat-chars">Znaki: 0</span><span id="o-stat-words">Słowa: 0</span></div>
        </div>

        <div class="o-action-row">
          <button id="o-undo" class="n-btn n-btn-outline" style="flex: 1; opacity: 0.4;" disabled>Cofnij</button>
          <button id="o-clear" class="n-btn" style="flex: 1; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">Wyczyść</button>
          <button id="o-copy" class="n-btn n-btn-outline" style="flex: 2;">Kopiuj wynik</button>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("o-input");
      const outputEl = $("o-output");
      const caseTrigger = $("o-case-trigger"), caseText = $("o-case-text");
      
      const cleanTrigger = $("o-clean-trigger"), cleanAccordion = $("o-clean-accordion"), cleanIcon = $("o-clean-icon");
      const statChars = $("o-stat-chars"), statWords = $("o-stat-words");
      const undoBtn = $("o-undo");

      let history = [];

      // --- LOGIKA SYNCHRONIZACJI SWITCHY ---
      
      // 1. Obsługa strzałek (rozwijanie pod-opcji)
      container.querySelectorAll(".o-sub-arrow").forEach(arrow => {
        arrow.addEventListener("click", () => {
          Hub.haptic('light');
          const targetId = arrow.dataset.target;
          const target = $(targetId);
          target.classList.toggle("open");
          arrow.classList.toggle("open");
        }, { signal });
      });

      // 2. Funkcja synchronizująca stan głównego switcha na podstawie pod-opcji
      function syncGroup(parentId) {
        const parentInput = $(parentId);
        const parentLabel = parentInput.closest('.switch');
        const subOpts = container.querySelectorAll(`.sub-${parentId.split('-')[1]}-opt`); // np. o-clean-url -> sub-url-opt
        
        if (!subOpts || subOpts.length === 0) return;

        let checkedCount = 0;
        subOpts.forEach(opt => { if (opt.checked) checkedCount++; });

        if (checkedCount === 0) {
          parentInput.checked = false;
          parentLabel.classList.remove('partial');
        } else if (checkedCount === subOpts.length) {
          parentInput.checked = true;
          parentLabel.classList.remove('partial');
        } else {
          parentInput.checked = true;
          parentLabel.classList.add('partial');
        }
        processText();
      }

      // 3. Podpięcie zdarzeń do pod-opcji
      container.querySelectorAll('input[type="checkbox"][class$="-opt"]').forEach(subOpt => {
        subOpt.addEventListener("change", () => {
          Hub.haptic('light');
          syncGroup(subOpt.dataset.parent);
        }, { signal });
      });

      // 4. Podpięcie zdarzeń do głównych switchy
      ['o-clean-url', 'o-clean-md', 'o-clean-space', 'o-clean-brackets', 'o-dash-toggle'].forEach(id => {
        $(id).addEventListener("change", (e) => {
          Hub.haptic('medium');
          const isChecked = e.target.checked;
          const parentLabel = e.target.closest('.switch');
          parentLabel.classList.remove('partial');
          
          // Zaznacz/odznacz wszystkie pod-opcje
          const prefix = id.split('-')[1]; // np. url, md, space, brackets, dash
          const subOpts = container.querySelectorAll(`.sub-${prefix}-opt`);
          subOpts.forEach(opt => { opt.checked = isChecked; });
          
          processText();
        }, { signal });
      });

      // --- AUTOMATYCZNE DOPASOWANIE WYSOKOŚCI ---
      function autoResize(el) {
        if (!el) return;
        const maxHeight = 1248; 
        el.style.height = 'auto'; 
        if (el.scrollHeight > maxHeight) {
          el.style.height = maxHeight + 'px';
          el.style.overflowY = 'auto';
        } else {
          el.style.height = (el.scrollHeight + 24) + 'px';
          el.style.overflowY = 'hidden';
        }
      }

      setTimeout(() => { autoResize(inputEl); autoResize(outputEl); }, 50);

      cleanTrigger.addEventListener("click", () => {
        Hub.haptic('light');
        cleanAccordion.classList.toggle("open");
        cleanIcon.textContent = cleanAccordion.classList.contains("open") ? "−" : "+";
      }, { signal });

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

      // --- GŁÓWNA LOGIKA PRZETWARZANIA ---
      function processText() {
        let text = inputEl.value;
        if (!text) { 
          outputEl.value = ""; 
          updateStats(""); 
          autoResize(outputEl);
          return; 
        }

        let lines = text.split(/\r?\n/);

        lines = lines.map(line => {
          let l = line;
          
          // Linki
          if ($("o-clean-url").checked) {
            const subUrl1 = container.querySelector('.sub-url-opt:nth-child(1)'); // nie działa tak prosto, użyjmy querySelector z klasą
            const isUrlChecked = container.querySelectorAll('.sub-url-opt')[0].checked;
            const isWwwChecked = container.querySelectorAll('.sub-url-opt')[1].checked;
            if (isUrlChecked) l = l.replace(/https?:\/\/[^\s]+/gi, "");
            if (isWwwChecked) l = l.replace(/www\.[^\s]+/gi, "");
          }

          // Markdown
          if ($("o-clean-md").checked) {
            const subs = container.querySelectorAll('.sub-md-opt');
            if (subs[0].checked) l = l.replace(/#/g, "");
            if (subs[1].checked) l = l.replace(/[*_]/g, "");
            if (subs[2].checked) l = l.replace(/>/g, "");
          }

          // Interpunkcja
          if ($("o-clean-space").checked) {
            const subs = container.querySelectorAll('.sub-space-opt');
            if (subs[0].checked) l = l.replace(/\s+([.,])/g, "$1");
            if (subs[1].checked) l = l.replace(/\s+([!?])/g, "$1");
          }

          // Nawiasy
          if ($("o-clean-brackets").checked) {
            const subs = container.querySelectorAll('.sub-brackets-opt');
            if (subs[0].checked) l = l.replace(/[\[\]]/g, "");
            if (subs[1].checked) l = l.replace(/[{}]/g, "");
            if (subs[2].checked) l = l.replace(/["']/g, "");
          }

          // Myślniki
          if ($("o-dash-toggle").checked) {
            const subs = container.querySelectorAll('.sub-dash-opt');
            if (subs[0].checked) l = l.replace(/-{2,}/g, "-");
            if (subs[1].checked) l = l.replace(/-{2,}/g, "");
          } else {
            l = l.replace(/-{2,}/g, "");
          }
          
          l = l.replace(/\s+/g, " ").trim();
          return l;
        });

        text = lines.join("\n");
        text = text.replace(/\n{3,}/g, "\n\n").trim();

        if (currentCaseMode === "sentence") {
          text = text.replace(/(^\s*|[.!?]\s+)([a-ząćęłńóśźż])/gm, (m, p, letter) => p + letter.toUpperCase());
        } else if (currentCaseMode === "upper") {
          text = text.toUpperCase();
        } else if (currentCaseMode === "lower") {
          text = text.toLowerCase();
        } else if (currentCaseMode === "title") {
          text = text.replace(/\b\w/g, l => l.toUpperCase());
        }

        outputEl.value = text;
        updateStats(outputEl.value);
        autoResize(outputEl);
      }

      inputEl.addEventListener("input", () => {
        processText();
        autoResize(inputEl);
        clearTimeout(inputEl._historyTimer);
        inputEl._historyTimer = setTimeout(saveHistory, 1000);
      }, { signal });

      caseTrigger.addEventListener("click", async () => {
        const opts = Object.keys(caseNames).map(k => ({ id: k, label: caseNames[k] }));
        const choice = await Hub.showSelect({ title: "Wielkość liter", options: opts, current: currentCaseMode, anchor: caseTrigger, signal });
        if (choice && choice !== currentCaseMode) {
          currentCaseMode = choice;
          caseText.textContent = caseNames[currentCaseMode];
          processText();
        }
      }, { signal });

      undoBtn.addEventListener("click", () => {
        if (history.length > 1) {
          history.pop();
          inputEl.value = history[history.length - 1];
          processText();
          autoResize(inputEl);
          Hub.haptic('light');
          if (history.length <= 1) { undoBtn.disabled = true; undoBtn.style.opacity = "0.4"; }
        }
      }, { signal });

      $("o-copy").addEventListener("click", () => {
        if (!outputEl.value) return showToast("Brak tekstu do skopiowania");
        const textToCopy = outputEl.value;
        const btn = $("o-copy");

        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        
        let success = false;
        try { success = document.execCommand('copy'); } catch(e) {}

        document.body.removeChild(ta);

        if (success) {
          Hub.haptic('success');
          const orig = btn.innerHTML;
          btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => { btn.innerHTML = orig; }, 1500);
        } else {
          Hub.copy(textToCopy, btn);
        }
      }, { signal });

      $("o-clear").addEventListener("click", () => {
        Hub.haptic('medium'); saveHistory();
        inputEl.value = ""; outputEl.value = ""; updateStats(""); 
        autoResize(inputEl); autoResize(outputEl);
        inputEl.focus();
      }, { signal });

      // Inicjalizacja
      processText();
    },
    unmount() {}
  });
})();