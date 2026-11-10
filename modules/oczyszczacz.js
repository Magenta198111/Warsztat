(() => {
  Hub.register({
    id: "oczyszczacz",
    title: "Oczyszczacz tekstu",
    desc: "Usuwa formatowanie, gwiazdki i zbędne spacje",

    async mount(container, signal) {
      let currentCaseMode = "sentence";
      let dashMode = "leave"; 

      const caseNames = {
        "sentence": "Zdania (Duża po kropce)",
        "upper": "Wszystko WIELKIMI literami",
        "lower": "wszystko małymi literami",
        "title": "Każde Słowo Z Dużej Litery"
      };

      container.innerHTML = `
        <style>
          .o-label { display: block; font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
          .o-flat-section { margin-bottom: 28px; }
          .o-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          .o-textarea {
            width: 100%; padding: 12px 0; background: transparent; border: none;
            border-bottom: 1px solid var(--line); color: var(--ink); font-size: 16px; 
            font-family: inherit; resize: vertical; outline: none; 
            min-height: 150px; max-height: 800px; overflow-y: auto; 
            transition: border-color 0.2s; line-height: 1.5; box-sizing: border-box; touch-action: pan-y;
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
          .o-trigger .icon { color: var(--muted); font-family: inherit; font-variant-numeric: tabular-nums; font-size: 20px; font-weight: 300; line-height: 1; }
          
          .o-accordion { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
          .o-accordion.open { max-height: 800px; }
          
          .o-option-group { border-bottom: 1px solid var(--line); padding-bottom: 4px; }
          .o-option-group:last-child { border-bottom: none; }
          
          .o-option-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
          .o-option-left { display: flex; align-items: flex-start; gap: 12px; }
          
          .o-option-text { display: flex; flex-direction: column; }
          .o-option-title { font-size: 15px; font-weight: 500; color: var(--ink); }
          .o-option-desc { font-size: 13px; color: var(--muted); margin-top: 4px; }
          
          .o-sub-arrow { 
            background: transparent; border: none; color: var(--muted); cursor: pointer; 
            padding: 2px 4px; display: flex; align-items: center; justify-content: center; 
            transition: transform 0.2s; outline: none; margin-top: 2px;
          }
          .o-sub-arrow.open { transform: rotate(180deg); }
          .o-sub-arrow svg { width: 16px; height: 16px; }

          .o-sub-options { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; padding-left: 32px; }
          .o-sub-options.open { max-height: 400px; margin-bottom: 12px; }
          .o-sub-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
          .o-sub-title { font-size: 13px; color: var(--muted); }

          .o-segmented-control { 
            display: flex; background: var(--bg); border: 1px solid var(--line); 
            border-radius: var(--r); overflow: hidden; width: 100%; margin-top: 8px; margin-bottom: 8px;
          }
          .o-segment { 
            flex: 1; padding: 10px; background: transparent; border: none; 
            color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer; 
            transition: background 0.2s, color 0.2s; outline: none;
          }
          .o-segment.active { background: var(--surface-hover); color: var(--accent); font-weight: 600; }

          .switch.partial .switch-slider { opacity: 0.6; }
          .switch.partial .switch-slider:before { opacity: 0.8; }

          .o-stats { display: flex; justify-content: space-between; font-family: inherit; font-variant-numeric: tabular-nums; font-size: 13px; color: var(--muted); padding: 16px 0 0 0; }
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
                  <div class="o-option-text">
                    <div class="o-option-title">Usuwaj linki</div>
                    <div class="o-option-desc">Usuwa adresy internetowe</div>
                  </div>
                </div>
                <label class="switch" id="sw-url-group"><input type="checkbox" id="o-clean-url" data-group="url"><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-url">
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj: https://</span><label class="switch"><input type="checkbox" class="sub-url-opt" data-parent="o-clean-url"><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj: www.</span><label class="switch"><input type="checkbox" class="sub-url-opt" data-parent="o-clean-url"><span class="switch-slider"></span></label></div>
              </div>
            </div>

            <!-- GRUPA 2: MARKDOWN -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-md"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div class="o-option-text">
                    <div class="o-option-title">Usuwaj znaki Markdown</div>
                    <div class="o-option-desc">Usuwa formatowanie tekstu</div>
                  </div>
                </div>
                <label class="switch" id="sw-md-group"><input type="checkbox" id="o-clean-md" data-group="md"><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-md">
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj: #</span><label class="switch"><input type="checkbox" class="sub-md-opt" data-parent="o-clean-md"><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj: * i _</span><label class="switch"><input type="checkbox" class="sub-md-opt" data-parent="o-clean-md"><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj: ></span><label class="switch"><input type="checkbox" class="sub-md-opt" data-parent="o-clean-md"><span class="switch-slider"></span></label></div>
              </div>
            </div>

            <!-- GRUPA 3: INTERPUNKCJA -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-space"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div class="o-option-text">
                    <div class="o-option-title">Popraw interpunkcję</div>
                    <div class="o-option-desc">Usuwa spacje przed znakami</div>
                  </div>
                </div>
                <label class="switch" id="sw-space-group"><input type="checkbox" id="o-clean-space" data-group="space" checked><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-space">
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj spację przed: . i ,</span><label class="switch"><input type="checkbox" class="sub-space-opt" data-parent="o-clean-space" checked><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj spację przed: ! i ?</span><label class="switch"><input type="checkbox" class="sub-space-opt" data-parent="o-clean-space" checked><span class="switch-slider"></span></label></div>
              </div>
            </div>

            <!-- GRUPA 4: NAWIASY I CUDZYSŁOWY -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-brackets"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div class="o-option-text">
                    <div class="o-option-title">Usuwaj nawiasy i cudzysłowy</div>
                    <div class="o-option-desc">Usuwa () [], {}, "", ''</div>
                  </div>
                </div>
                <label class="switch" id="sw-brackets-group"><input type="checkbox" id="o-clean-brackets" data-group="brackets"><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-brackets">
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj: () i []</span><label class="switch"><input type="checkbox" class="sub-brackets-opt" data-parent="o-clean-brackets"><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj: {}</span><label class="switch"><input type="checkbox" class="sub-brackets-opt" data-parent="o-clean-brackets"><span class="switch-slider"></span></label></div>
                <div class="o-sub-row"><span class="o-sub-title">Usuwaj: "" i ''</span><label class="switch"><input type="checkbox" class="sub-brackets-opt" data-parent="o-clean-brackets"><span class="switch-slider"></span></label></div>
              </div>
            </div>

            <!-- GRUPA 5: MYŚLNIKI -->
            <div class="o-option-group">
              <div class="o-option-row">
                <div class="o-option-left">
                  <button class="o-sub-arrow" data-target="sub-dash"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                  <div class="o-option-text">
                    <div class="o-option-title">Zamiana myślników</div>
                    <div class="o-option-desc">Wybierz co zrobić z "--"</div>
                  </div>
                </div>
                <label class="switch" id="sw-dash-group"><input type="checkbox" id="o-dash-toggle" data-group="dash" checked><span class="switch-slider"></span></label>
              </div>
              <div class="o-sub-options" id="sub-dash">
                <div class="o-segmented-control" id="dash-segmented">
                    <button class="o-segment active" data-val="leave">Zostaw jeden (-)</button>
                    <button class="o-segment" data-val="remove">Usuń całkowicie</button>
                </div>
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
          <button id="o-clear" class="n-btn" style="flex: 1; color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, transparent);">Wyczyść</button>
          <button id="o-copy" class="n-btn n-btn-outline" style="flex: 2;">Kopiuj wynik</button>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("o-input");
      const outputEl = $("o-output");
      const caseTrigger = $("o-case-trigger"), caseText = $("o-case-text");
      
      const cleanTrigger = $("o-clean-trigger"), cleanAccordion = $("o-clean-accordion"), cleanIcon = $("o-clean-icon");
      const statChars = $("o-stat-chars"), statWords = $("o-stat-words");

      // --- OBSŁUGA PRZYCISKU SEGMENTOWEGO (MYŚLNIKI) ---
      const segBtns = container.querySelectorAll('#dash-segmented .o-segment');
      segBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          Hub.haptic('light');
          segBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          dashMode = btn.dataset.val;
          processText();
        }, { signal });
      });

      // --- LOGIKA SYNCHRONIZACJI SWITCHY ---
      container.querySelectorAll(".o-sub-arrow").forEach(arrow => {
        arrow.addEventListener("click", () => {
          Hub.haptic('light');
          const targetId = arrow.dataset.target;
          const target = $(targetId);
          target.classList.toggle("open");
          arrow.classList.toggle("open");
        }, { signal });
      });

      function syncGroup(parentId) {
        const parentInput = $(parentId);
        const parentLabel = parentInput.closest('.switch');
        const group = parentInput.dataset.group;
        
        if (group === "dash") return;

        const subOpts = container.querySelectorAll(`.sub-${group}-opt`);
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

      container.querySelectorAll('input[type="checkbox"][class$="-opt"]').forEach(subOpt => {
        subOpt.addEventListener("change", () => {
          Hub.haptic('light');
          syncGroup(subOpt.dataset.parent);
        }, { signal });
      });

      ['o-clean-url', 'o-clean-md', 'o-clean-space', 'o-clean-brackets', 'o-dash-toggle'].forEach(id => {
        $(id).addEventListener("change", (e) => {
          Hub.haptic('medium');
          const isChecked = e.target.checked;
          const parentLabel = e.target.closest('.switch');
          parentLabel.classList.remove('partial');
          
          const group = e.target.dataset.group;
          if (group !== "dash") {
            const subOpts = container.querySelectorAll(`.sub-${group}-opt`);
            subOpts.forEach(opt => { opt.checked = isChecked; });
          }
          
          processText();
        }, { signal });
      });

      cleanTrigger.addEventListener("click", () => {
        Hub.haptic('light');
        cleanAccordion.classList.toggle("open");
        cleanIcon.textContent = cleanAccordion.classList.contains("open") ? "−" : "+";
      }, { signal });

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
          Hub.resizeTextarea(outputEl);
          return; 
        }

        let lines = text.split(/\r?\n/);

        lines = lines.map(line => {
          let l = line;
          
          if ($("o-clean-url").checked) {
            const isUrlChecked = container.querySelectorAll('.sub-url-opt')[0].checked;
            const isWwwChecked = container.querySelectorAll('.sub-url-opt')[1].checked;
            if (isUrlChecked) l = l.replace(/https?:\/\/[^\s]+/gi, "");
            if (isWwwChecked) l = l.replace(/www\.[^\s]+/gi, "");
          }

          if ($("o-clean-md").checked) {
            const subs = container.querySelectorAll('.sub-md-opt');
            if (subs[0].checked) l = l.replace(/#/g, "");
            if (subs[1].checked) l = l.replace(/[*_]/g, "");
            if (subs[2].checked) l = l.replace(/>/g, "");
          }

          if ($("o-clean-space").checked) {
            const subs = container.querySelectorAll('.sub-space-opt');
            if (subs[0].checked) l = l.replace(/\s+([.,])/g, "$1");
            if (subs[1].checked) l = l.replace(/\s+([!?])/g, "$1");
          }

          if ($("o-clean-brackets").checked) {
            const subs = container.querySelectorAll('.sub-brackets-opt');
            if (subs[0].checked) l = l.replace(/[\[\]()]/g, "");
            if (subs[1].checked) l = l.replace(/[{}]/g, "");
            if (subs[2].checked) l = l.replace(/["']/g, "");
          }

          if ($("o-dash-toggle").checked) {
            if (dashMode === "leave") {
              l = l.replace(/-{2,}/g, "-");
            } else {
              l = l.replace(/-{2,}/g, "");
            }
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
        Hub.resizeTextarea(outputEl);
      }

      inputEl.addEventListener("input", () => {
        processText();
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
        Hub.haptic('medium');
        inputEl.value = ""; outputEl.value = ""; updateStats(""); 
        Hub.resizeTextarea(inputEl); Hub.resizeTextarea(outputEl);
        inputEl.focus();
      }, { signal });

      processText();
    },
    unmount() {}
  });
})();