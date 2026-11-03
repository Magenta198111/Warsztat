(() => {
  let activeUrls = [];

  function cleanupUrls() {
    activeUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch(e){} });
    activeUrls = [];
  }

  Hub.register({
    id: "konwerter",
    title: "Konwerter Zdjęć",
    desc: "Kompresja i zmiana formatu na WebP, JPEG lub PNG",

    async mount(container, signal) {
      let savedFmt = "image/jpeg";
      let savedQual = 85;
      let menuStyle = "bottom";
      
      try {
        savedFmt = await Hub.db.get("conv_fmt", "image/jpeg");
        savedQual = await Hub.db.get("conv_qual", 85);
        menuStyle = await Hub.db.get("menu_style", "bottom");
      } catch (e) {}

      const formatNames = {
        "image/webp": "WebP (najmniejszy rozmiar)",
        "image/jpeg": "JPEG (standard)",
        "image/png": "PNG (bezstratny)"
      };

      let selectorHtml = "";
      if (menuStyle === "bottom") {
        selectorHtml = `
          <div id="c-select-trigger" class="n-custom-select">
            <span id="c-select-text">${formatNames[savedFmt]}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div id="c-modal" class="n-modal-overlay bottom-mode">
            <div class="n-modal-sheet">
              <div class="n-modal-title">Wybierz format</div>
              <div class="n-option" data-value="image/webp"><span>WebP (najmniejszy rozmiar)</span><span class="check">✓</span></div>
              <div class="n-option" data-value="image/jpeg"><span>JPEG (standard)</span><span class="check">✓</span></div>
              <div class="n-option" data-value="image/png"><span>PNG (bezstratny)</span><span class="check">✓</span></div>
            </div>
          </div>
        `;
      } else {
        selectorHtml = `
          <div style="position: relative;">
            <div id="c-select-trigger" class="n-custom-select">
              <span id="c-select-text">${formatNames[savedFmt]}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div id="c-dropdown" class="n-dropdown">
              <div class="n-dropdown-item" data-value="image/webp">WebP (najmniejszy rozmiar)</div>
              <div class="n-dropdown-item" data-value="image/jpeg">JPEG (standard)</div>
              <div class="n-dropdown-item" data-value="image/png">PNG (bezstratny)</div>
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <style>
          .hidden { display: none !important; }
          
          .n-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; margin-top: 0; }
          
          .n-custom-select { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 14px 16px; color: var(--ink); font-size: 15px; cursor: pointer; user-select: none; }
          .n-custom-select:active { background: var(--surface-hover); }
          .n-custom-select svg { color: var(--muted); transition: transform 0.2s; }
          .n-custom-select.open svg { transform: rotate(180deg); }
          
          .n-dropdown { position: absolute; top: calc(100% + 4px); left: 0; width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); z-index: 100; overflow: hidden; opacity: 0; transform: translateY(-5px); pointer-events: none; transition: opacity 0.15s, transform 0.15s; }
          .n-dropdown.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
          .n-dropdown-item { padding: 14px 16px; font-size: 14px; color: var(--ink); display: flex; align-items: center; cursor: pointer; border-bottom: 1px solid var(--line); }
          .n-dropdown-item:last-child { border-bottom: none; }
          .n-dropdown-item:active { background: var(--surface-hover); }
          .n-dropdown-item.active { color: var(--accent); font-weight: 600; background: rgba(129, 140, 248, 0.05); }
          
          .n-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
          .n-modal-overlay.open { opacity: 1; pointer-events: auto; }
          .n-modal-sheet { background: var(--surface); width: 100%; max-width: 600px; border: 1px solid var(--line); padding: 24px 16px; }
          .n-modal-overlay.bottom-mode { align-items: flex-end; }
          .n-modal-overlay.bottom-mode .n-modal-sheet { border-top-left-radius: 16px; border-top-right-radius: 16px; border-bottom: none; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); max-height: 80vh; overflow-y: auto; }
          .n-modal-overlay.bottom-mode.open .n-modal-sheet { transform: translateY(0); }
          .n-modal-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--muted); text-align: center; margin-bottom: 16px; letter-spacing: 0.5px; }
          .n-option { padding: 16px; border-radius: 6px; margin-bottom: 4px; font-size: 15px; color: var(--ink); display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: var(--bg); }
          .n-option:active { background: var(--line); }
          .n-option.active { color: var(--accent); font-weight: 600; }
          .n-option .check { opacity: 0; color: var(--accent); }
          .n-option.active .check { opacity: 1; }

          .n-range { -webkit-appearance: none; appearance: none; height: 4px; background: var(--line); border-radius: 2px; outline: none; margin: 16px 0; width: 100%; }
          .n-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); cursor: pointer; }
          
          .n-btn { width: 100%; padding: 14px; border-radius: 8px; font-weight: 500; font-size: 15px; cursor: pointer; text-align: center; display: block; margin-top: 16px; background: var(--surface); color: var(--ink); border: 1px solid var(--line); transition: background 0.2s; outline: none; -webkit-tap-highlight-color: transparent; }
          .n-btn:active { background: var(--surface-hover); }
          .n-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          
          .n-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          
          .n-file-name { font-size: 13px; color: var(--muted); margin-top: 8px; text-align: center; word-break: break-all; }
          .n-stats { font-family: monospace; text-align: center; font-size: 13px; line-height: 1.6; margin-bottom: 24px; }
          .n-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .n-preview-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px; text-align: center; }
          .n-preview-img { width: 100%; border-radius: 6px; border: 1px solid var(--line); display: block; object-fit: cover; }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:16px;">
          <button id="c-back" style="width:auto; padding:8px 12px 8px 0; border:none; background:transparent; color:var(--muted); display:flex; align-items:center; justify-content:center; outline: none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        <div style="margin-bottom: 24px;">
          <label class="n-label">Plik źródłowy</label>
          <input type="file" id="c-file" accept="image/*" style="display:none;">
          <button id="c-file-btn" class="n-btn" style="margin-top: 0;">Wybierz zdjęcie</button>
          <div id="c-file-name" class="n-file-name">Nie wybrano pliku</div>
        </div>

        <div class="n-divider"></div>

        <div style="margin-bottom: 24px;">
          <label class="n-label">Ustawienia konwersji</label>
          <div style="margin-bottom: 20px;">
            ${selectorHtml}
          </div>
          <div>
            <span id="c-qual-label" class="n-label" style="margin-bottom:0;">Jakość: ${savedQual}%</span>
            <input type="range" id="c-qual" min="10" max="100" value="${savedQual}" class="n-range">
          </div>
        </div>

        <button id="c-btn" class="n-btn" style="margin-bottom: 24px;">Konwertuj zdjęcie</button>
        
        <div id="c-result-section" class="hidden">
          <div class="n-divider"></div>
          <div id="c-stats" class="n-stats"></div>
          <div class="n-preview-grid">
            <div>
              <div class="n-preview-label">Przed</div>
              <img id="c-img-before" class="n-preview-img">
            </div>
            <div>
              <div class="n-preview-label">Po</div>
              <img id="c-img-after" class="n-preview-img">
            </div>
          </div>
          <a class="n-btn" id="c-dl" style="text-decoration: none;">Pobierz plik</a>
        </div>
      `;
      const $ = id => container.querySelector("#" + id);
      const fileInput = $("c-file"), fileBtn = $("c-file-btn"), fileName = $("c-file-name");
      const selectTrigger = $("c-select-trigger"), selectText = $("c-select-text");
      const options = container.querySelectorAll(".n-option, .n-dropdown-item");
      const qualInput = $("c-qual"), qualLabel = $("c-qual-label"), btnProcess = $("c-btn");
      const resultSection = $("c-result-section"), statsDiv = $("c-stats"), dlBtn = $("c-dl");
      const imgBefore = $("c-img-before"), imgAfter = $("c-img-after");

      let currentFmt = savedFmt, currentFile = null;

      function updateOptionStyles() {
        options.forEach(opt => { 
          if (opt.dataset.value === currentFmt) opt.classList.add("active"); 
          else opt.classList.remove("active"); 
        });
        selectText.textContent = formatNames[currentFmt];
      }
      updateOptionStyles();

      $("c-back").addEventListener("click", () => history.back(), { signal });
      fileBtn.addEventListener("click", () => fileInput.click(), { signal });

      if (menuStyle === "bottom") {
        const modal = $("c-modal");
        selectTrigger.addEventListener("click", () => modal.classList.add("open"), { signal });
        modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); }, { signal });
        
        options.forEach(opt => {
          opt.addEventListener("click", () => {
            currentFmt = opt.dataset.value; 
            updateOptionStyles();
            Hub.db.set("conv_fmt", currentFmt).catch(()=>{});
            modal.classList.remove("open");
          }, { signal });
        });
      } else {
        const dropdown = $("c-dropdown");
        selectTrigger.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.classList.toggle("open");
          selectTrigger.classList.toggle("open");
        }, { signal });

        document.addEventListener("click", (e) => {
          if (!selectTrigger.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove("open");
            selectTrigger.classList.remove("open");
          }
        }, { signal });

        options.forEach(opt => {
          opt.addEventListener("click", () => {
            currentFmt = opt.dataset.value; 
            updateOptionStyles();
            Hub.db.set("conv_fmt", currentFmt).catch(()=>{});
            dropdown.classList.remove("open");
            selectTrigger.classList.remove("open");
          }, { signal });
        });
      }

      qualInput.addEventListener("input", () => {
        qualLabel.textContent = `Jakość: ${qualInput.value}%`;
        Hub.db.set("conv_qual", Number(qualInput.value)).catch(()=>{});
      }, { signal });

      fileInput.addEventListener("change", (e) => {
        currentFile = e.target.files[0] || null;
        resultSection.classList.add("hidden");
        
        if (currentFile) {
          fileName.textContent = currentFile.name;
          fileName.style.color = "var(--ink)";
          cleanupUrls();
          const beforeUrl = URL.createObjectURL(currentFile);
          activeUrls.push(beforeUrl);
          imgBefore.src = beforeUrl;
        } else {
          fileName.textContent = "Nie wybrano pliku";
          fileName.style.color = "var(--muted)";
        }
      }, { signal });

      btnProcess.addEventListener("click", () => {
        if (!currentFile) return showToast("Najpierw wybierz zdjęcie!");
        
        btnProcess.disabled = true;
        btnProcess.textContent = "Przetwarzanie...";

        const img = new Image();
        const srcUrl = URL.createObjectURL(currentFile);

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");

          if (currentFmt === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
          
          ctx.drawImage(img, 0, 0);
          const quality = Number(qualInput.value) / 100;
          
          canvas.toBlob((blob) => {
            btnProcess.disabled = false;
            btnProcess.textContent = "Konwertuj zdjęcie";
            if (!blob) { showToast("Błąd: Nie udało się przetworzyć zdjęcia."); return; }

            const outUrl = URL.createObjectURL(blob); activeUrls.push(outUrl);
            const ext = currentFmt.split("/")[1];
            const outName = currentFile.name.replace(/\.[^.]+$/, "") + "_conv." + ext;
            const diff = ((blob.size - currentFile.size) / currentFile.size * 100).toFixed(1);
            const sign = diff > 0 ? "+" : "";
            
            statsDiv.innerHTML = `<b>Gotowe!</b><br>Przed: ${(currentFile.size / 1024).toFixed(1)} KB<br>Po: <b>${(blob.size / 1024).toFixed(1)} KB</b> (${sign}${diff}%)`;

            imgAfter.src = outUrl;
            resultSection.classList.remove("hidden");

            dlBtn.href = outUrl;
            dlBtn.download = outName;
            dlBtn.textContent = `Pobierz ${outName}`;

          }, currentFmt, quality);
        };

        img.onerror = () => { btnProcess.disabled = false; btnProcess.textContent = "Konwertuj zdjęcie"; showToast("Błąd: To nie jest prawidłowy plik graficzny."); };
        img.src = srcUrl;
      }, { signal });
    },
    unmount() { cleanupUrls(); }
  });
})();