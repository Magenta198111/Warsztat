(() => {
  Hub.register({
    id: "oczyszczacz",
    title: "Oczyszczacz Tekstu",
    icon: "📝",
    desc: "Usuwanie formatowania, zbędnych spacji i zmiana wielkości liter",

    async mount(container, signal) {
      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="o-back" style="width:auto; padding:10px 16px; border-radius:14px; margin:0;">Wróć</button>
        </div>

        <div class="card">
          <label>Tekst źródłowy (wklej tutaj)</label>
          <textarea id="o-input" rows="5" style="width:100%; padding:12px; border-radius:12px; border:1.5px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; resize:vertical; outline:none;" placeholder="Wklej tekst ze strony lub PDF-a..."></textarea>
          
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:14px;">
            <button id="o-clean" class="p" style="margin:0; flex:1; min-width:120px;">Wyczyść formatowanie</button>
            <button id="o-upper" style="margin:0; flex:1; min-width:80px; padding:10px;">WIELKIE</button>
            <button id="o-lower" style="margin:0; flex:1; min-width:80px; padding:10px;">małe</button>
            <button id="o-invert" style="margin:0; flex:1; min-width:80px; padding:10px;">Odwróć</button>
          </div>
        </div>

        <div class="card">
          <label>Wynik</label>
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

      $("o-back").addEventListener("click", () => history.back(), { signal });

      $("o-clean").addEventListener("click", () => {
        let text = inputEl.value;
        text = text.replace(/\r?\n|\r/g, " ");
        text = text.replace(/\s+/g, " ");
        text = text.trim();
        outputEl.value = text;
      }, { signal });

      $("o-upper").addEventListener("click", () => {
        outputEl.value = inputEl.value.toUpperCase();
      }, { signal });

      $("o-lower").addEventListener("click", () => {
        outputEl.value = inputEl.value.toLowerCase();
      }, { signal });

      $("o-invert").addEventListener("click", () => {
        outputEl.value = inputEl.value.split('').map(c => {
          return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
        }).join('');
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
      }, { signal });
    },

    unmount() {}
  });
})();