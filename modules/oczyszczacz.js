(() => {
  Hub.register({
    id: "oczyszczacz",
    title: "Oczyszczacz Tekstu",
    desc: "Usuwanie formatowania, gwiazdek, myślników i zbędnych spacji",

    async mount(container, signal) {
      container.innerHTML = `
        <style>
          .o-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .o-textarea {
            width: 100%; padding: 14px; background: var(--surface); border: 1px solid var(--line);
            border-radius: 8px; color: var(--ink); font-size: 15px; font-family: inherit;
            resize: vertical; outline: none; min-height: 120px; transition: border-color 0.2s;
            line-height: 1.5;
          }
          .o-textarea:focus { border-color: var(--accent); }
          .o-textarea::placeholder { color: var(--muted); }
          
          .o-output-textarea {
            color: var(--accent); font-weight: 500;
          }

          .o-options-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 0; border-bottom: 1px solid var(--line);
          }
          .o-options-row:first-of-type { border-top: 1px solid var(--line); margin-top: 24px; }
          
          .o-action-row { display: flex; gap: 12px; margin-top: 16px; }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <label class="o-label">Tekst źródłowy</label>
          <textarea id="o-input" class="o-textarea" placeholder="Wklej tekst ze strony, PDF-a lub AI..."></textarea>
          
          <div class="o-options-row">
            <div>
              <div class="settings-label" style="font-size: 14px;">Zostaw jeden myślnik</div>
              <div class="settings-desc">Zamienia -- na -, wyłącz by usunąć całkowicie</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="o-dash-toggle" checked>
              <span class="switch-slider"></span>
            </label>
          </div>

          <div class="o-options-row" style="border-top: none; margin-top: 0;">
            <div>
              <div class="settings-label" style="font-size: 14px;">Wielkie litery po kropce</div>
              <div class="settings-desc">Poprawia zdania rozpoczynające się z małej litery</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="o-sentence-toggle">
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>

        <div style="margin-top: 8px;">
          <label class="o-label">Wynik (aktualizuje się na żywo)</label>
          <textarea id="o-output" class="o-textarea o-output-textarea" readonly placeholder="Tutaj pojawi się czysty tekst..."></textarea>
          
          <div class="o-action-row">
            <button id="o-clear" class="n-btn" style="flex: 1; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">Wyczyść</button>
            <button id="o-copy" class="n-btn n-btn-outline" style="flex: 2;">Kopiuj wynik</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("o-input");
      const outputEl = $("o-output");
      const dashToggle = $("o-dash-toggle");
      const sentenceToggle = $("o-sentence-toggle");

      function processText() {
        let text = inputEl.value;
        if (!text) {
          outputEl.value = "";
          return;
        }

        // Usuwanie enterów i wielokrotnych spacji
        text = text.replace(/\r?\n|\r/g, " ");
        text = text.replace(/\s+/g, " ");
        
        // Usuwanie gwiazdek
        text = text.replace(/\*/g, "");

        // Obsługa myślników
        if (dashToggle.checked) {
          text = text.replace(/-{2,}/g, "-");
        } else {
          text = text.replace(/-{2,}/g, "");
        }

        // Obsługa wielkich liter
        if (sentenceToggle.checked) {
          text = text.replace(/(^\s*|[.!?]\s+)([a-ząćęłńóśźż])/g, (match, prefix, letter) => {
            return prefix + letter.toUpperCase();
          });
        }

        outputEl.value = text.trim();
      }

      inputEl.addEventListener("input", processText, { signal });
      
      dashToggle.addEventListener("change", () => {
        Hub.haptic('light');
        processText();
      }, { signal });

      sentenceToggle.addEventListener("change", () => {
        Hub.haptic('light');
        processText();
      }, { signal });

      $("o-copy").addEventListener("click", () => {
        if (!outputEl.value) return showToast("Brak tekstu do skopiowania");
        Hub.copy(outputEl.value, $("o-copy"));
      }, { signal });

      $("o-clear").addEventListener("click", () => {
        Hub.haptic('medium');
        inputEl.value = "";
        outputEl.value = "";
        dashToggle.checked = true;
        sentenceToggle.checked = false;
        inputEl.focus();
      }, { signal });
    },
    unmount() {}
  });
})();