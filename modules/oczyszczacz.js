(() => {
  Hub.register({
    id: "oczyszczacz",
    title: "Oczyszczacz Tekstu",
    icon: "📝",
    desc: "Usuwanie formatowania, gwiazdek, myślników i zbędnych spacji",

    async mount(container, signal) {
      container.innerHTML = `
        <style>
          .o-toggle-wrap {
            display: flex; align-items: center; justify-content: center; gap: 12px;
            margin: 16px 0; font-size: 14px; color: var(--muted); font-weight: 600;
          }
          .o-switch {
            position: relative; display: inline-block; width: 52px; height: 28px;
          }
          .o-switch input { opacity: 0; width: 0; height: 0; }
          .o-slider {
            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
            background-color: var(--accent); border: 1.5px solid var(--accent);
            transition: .3s; border-radius: 28px;
          }
          .o-slider:before {
            position: absolute; content: ""; height: 20px; width: 20px;
            left: 2px; bottom: 2px; background-color: #ffffff;
            transition: .3s; border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .o-switch input:checked + .o-slider:before {
            transform: translateX(24px);
          }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="o-back" style="width:auto; padding:10px 16px; border-radius:14px; margin:0;">Wróć</button>
        </div>

        <div class="card">
          <label>Tekst źródłowy (wklej tutaj)</label>
          <textarea id="o-input" rows="5" style="width:100%; padding:12px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; resize:vertical; outline:none;" placeholder="Wklej tekst ze strony, PDF-a lub AI..."></textarea>
          
          <div class="o-toggle-wrap">
            <span>Usuwaj myślniki</span>
            <label class="o-switch">
              <input type="checkbox" id="o-dash-toggle" checked>
              <span class="o-slider"></span>
            </label>
            <span>Zostaw jeden</span>
          </div>

          <button id="o-sentence" style="width:100%; margin:0; padding:14px; background:var(--bg); transition: 0.2s;">Duże litery na początku zdań</button>
        </div>

        <div class="card">
          <label>Wynik (aktualizuje się na żywo)</label>
          <textarea id="o-output" rows="5" readonly style="width:100%; padding:12px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--accent); font:inherit; resize:vertical; outline:none;" placeholder="Tutaj pojawi się czysty tekst..."></textarea>
          
          <div style="display:flex; gap:10px; margin-top:14px;">
            <button id="o-copy" class="p" style="margin:0; flex:2;">📋 Kopiuj wynik</button>
            <button id="o-clear" style="margin:0; flex:1; background:var(--danger); color:#14171c; border-color:var(--danger);">Wyczyść</button>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const inputEl = $("o-input");
      const outputEl = $("o-output");
      const dashToggle = $("o-dash-toggle");
      const sentenceBtn = $("o-sentence");

      let isSentenceCase = false;

      $("o-back").addEventListener("click", () => history.back(), { signal });

      function processText() {
        let text = inputEl.value;
        if (!text) {
          outputEl.value = "";
          return;
        }

        text = text.replace(/\r?\n|\r/g, " ");
        text = text.replace(/\s+/g, " ");
        text = text.replace(/\*/g, "");

        if (dashToggle.checked) {
          text = text.replace(/-{2,}/g, "-");
        } else {
          text = text.replace(/-{2,}/g, "");
        }

        if (isSentenceCase) {
          text = text.replace(/(^\s*|[.!?]\s+)([a-ząćęłńóśźż])/g, (match, prefix, letter) => {
            return prefix + letter.toUpperCase();
          });
        }

        outputEl.value = text.trim();
      }

      inputEl.addEventListener("input", processText, { signal });
      dashToggle.addEventListener("change", processText, { signal });

      sentenceBtn.addEventListener("click", () => {
        isSentenceCase = !isSentenceCase;
        if (isSentenceCase) {
          sentenceBtn.classList.add("p");
          sentenceBtn.textContent = "Duże litery: WŁĄCZONE";
        } else {
          sentenceBtn.classList.remove("p");
          sentenceBtn.textContent = "Duże litery: WYŁĄCZONE";
        }
        processText();
      }, { signal });

      $("o-copy").addEventListener("click", async () => {
        if (!outputEl.value) return;
        try {
          await navigator.clipboard.writeText(outputEl.value);
          const btn = $("o-copy");
          const originalText = btn.textContent;
          btn.textContent = "✅ Skopiowano!";
          setTimeout(() => btn.textContent = originalText, 2000);
        } catch (err) {
          alert("Nie udało się skopiować tekstu.");
        }
      }, { signal });

      $("o-clear").addEventListener("click", () => {
        inputEl.value = "";
        outputEl.value = "";
        isSentenceCase = false;
        sentenceBtn.classList.remove("p");
        sentenceBtn.textContent = "Duże litery na początku zdań";
      }, { signal });
    },

    unmount() {}
  });
})();