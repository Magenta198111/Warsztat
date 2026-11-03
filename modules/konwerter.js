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

      container.innerHTML = `
        <style>
          .n-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; margin-top: 0; }
          .n-custom-select { display: flex; justify-content: space-between; align-items: center; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 14px 16px; color: var(--ink); font-size: 15px; cursor: pointer; }
          .n-custom-select svg { color: var(--muted); }
          
          .n-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
          .n-modal-overlay.open { opacity: 1; pointer-events: auto; }
          
          .n-modal-sheet { background: var(--surface); width: 100%; max-width: 600px; border: 1px solid var(--line); padding: 20px 16px 30px; }
          
          .n-modal-overlay.bottom-mode { align-items: flex-end; }
          .n-modal-overlay.bottom-mode .n-modal-sheet { border-top-left-radius: 16px; border-top-right-radius: 16px; border-bottom: none; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
          .n-modal-overlay.bottom-mode.open .n-modal-sheet { transform: translateY(0); }
          
          .n-modal-overlay.dropdown-mode { align-items: flex-start; }
          .n-modal-overlay.dropdown-mode .n-modal-sheet { margin-top: 200px; border-radius: 8px; transform: scale(0.95); opacity: 0; transition: transform 0.2s, opacity 0.2s; }
          .n-modal-overlay.dropdown-mode.open .n-modal-sheet { transform: scale(1); opacity: 1; }

          .n-modal-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; color: var(--ink); }
          .n-option { padding: 16px; border-radius: 8px; margin-bottom: 8px; background: var(--bg); border: 1px solid transparent; font-size: 15px; color: var(--ink); display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
          .n-option:active { background: var(--line); }
          .n-option.active { border-color: var(--accent); color: var(--accent); font-weight: 600; }
          .n-option .check { opacity: 0; color: var(--accent); }
          .n-option.active .check { opacity: 1; }
          
          .n-range { -webkit-appearance: none; appearance: none; height: 4px; background: var(--line); border-radius: 2px; outline: none; margin: 16px 0; width: 100%; }
          .n-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); cursor: pointer; }
          
          .n-btn-purple { width: 100%; padding: 14px; border-radius: 6px; background: var(--accent); color: var(--accent-ink); border: 1px solid var(--accent); font-weight: 600; font-size: 15px; cursor: pointer; text-align: center; text-decoration: none; display: block; }
          
          .n-block { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
          .n-file-name { font-size: 13px; color: var(--muted); margin-top: 12px; text-align: center; word-break: break-all; }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:20px;">
          <button id="c-back" style="width:auto; padding:10px 12px; border-radius:6px; margin:0; border:1px solid var(--line); background:var(--surface); color:var(--ink); display:flex; align-items:center; justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        <div class="n-block">
          <span class="n-label">Plik źródłowy</span>
          <input type="file" id="c-file" accept="image/*" style="display:none;">
          <button id="c-file-btn" class="n-btn-purple">Wybierz zdjęcie</button>
          <div id="c-file-name" class="n-file-name">Nie wybrano pliku</div>
        </div>

        <div class="n-block">
          <span class="n-label">Ustawienia konwersji</span>
          <div style="margin-bottom: 20px;">
            <div id="c-select-trigger" class="n-custom-select">
              <span id="c-select-text">${formatNames[savedFmt]}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div>
            <span id="c-qual-label" class="n-label" style="margin-bottom:0;">Jakość: ${savedQual}%</span>
            <input type="range" id="c-qual" min="10" max="100" value="${savedQual}" class="n-range">
          </div>
        </div>

        <button id="c-btn" class="n-btn-purple" style="margin-bottom: 24px;">Konwertuj zdjęcie</button>
        
        <div class="i hidden" id="c-stats" style="font-family:monospace; text-align:center; font-size:13px; line-height:1.6; margin-bottom: 24px;"></div>

        <div id="c-preview-container" class="hidden" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom: 20px;">
          <div>
            <div class="n-label" style="text-align:center; margin-bottom:6px;">Przed</div>
            <img id="c-img-before" style="width:100%; border-radius:6px; border:1px solid var(--line); display:block; object-fit:cover;">
          </div>
          <div>
            <div class="n-label" style="text-align:center; margin-bottom:6px;">Po</div>
            <img id="c-img-after" style="width:100%; border-radius:6px; border:1px solid var(--line); display:block; object-fit:cover;">
          </div>
        </div>

        <a class="n-btn-purple hidden" id="c-dl">Pobierz plik</a>

        <div id="c-modal" class="n-modal-overlay ${menuStyle === 'bottom' ? 'bottom-mode' : 'dropdown-mode'}">
          <div class="n-modal-sheet">
            <div class="n-modal-title">Wybierz format</div>
            <div class="n-option" data-value="image/webp"><span>WebP (najmniejszy rozmiar)</span><span class="check">✓</span></div>
            <div class="n-option" data-value="image/jpeg"><span>JPEG (standard)</span><span class="check">✓</span></div>
            <div class="n-option" data-value="image/png"><span>PNG (bezstratny)</span><span class="check">✓</span></div>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("c-file"), fileBtn = $("c-file-btn"), fileName = $("c-file-name");
      const selectTrigger = $("c-select-trigger"), selectText = $("c-select-text"), modal = $("c-modal");
      const options = container.querySelectorAll(".n-option");
      const qualInput = $("c-qual"), qualLabel = $("c-qual-label"), btnProcess = $("c-btn");
      const statsDiv = $("c-stats"), dlBtn = $("c-dl");
      const previewContainer = $("c-preview-container"), imgBefore = $("c-img-before"), imgAfter = $("c-img-after");

      let currentFmt = savedFmt, currentFile = null;

      function updateOptionStyles() {
        options.forEach(opt => { if (opt.dataset.value === currentFmt) opt.classList.add("active"); else opt.classList.remove("active"); });
        selectText.textContent = formatNames[currentFmt];
      }
      updateOptionStyles();

      $("c-back").addEventListener("click", () => history.back(), { signal });
      fileBtn.addEventListener("click", () => fileInput.click(), { signal });
      selectTrigger.addEventListener("click", () => modal.classList.add("open"), { signal });
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); }, { signal });

      options.forEach(opt => {
        opt.addEventListener("click", () => {
          currentFmt = opt.dataset.value; updateOptionStyles();
          Hub.db.set("conv_fmt", currentFmt).catch(()=>{});
          modal.classList.remove("open");
        }, { signal });
      });

      qualInput.addEventListener("input", () => {
        qualLabel.textContent = `Jakość: ${qualInput.value}%`;
        Hub.db.set("conv_qual", Number(qualInput.value)).catch(()=>{});
      }, { signal });

      fileInput.addEventListener("change", (e) => {
        currentFile = e.target.files[0] || null;
        dlBtn.classList.add("hidden"); previewContainer.classList.add("hidden"); statsDiv.classList.add("hidden"); imgAfter.src = "";
        
        if (currentFile) {
          fileName.textContent = currentFile.name; fileName.style.color = "var(--ink)";
          cleanupUrls();
          const beforeUrl = URL.createObjectURL(currentFile);
          activeUrls.push(beforeUrl);
          imgBefore.src = beforeUrl;
          previewContainer.classList.remove("hidden");
        } else {
          fileName.textContent = "Nie wybrano pliku"; fileName.style.color = "var(--muted)";
        }
      }, { signal });

      btnProcess.addEventListener("click", () => {
        if (!currentFile) return alert("Najpierw wybierz zdjęcie!");
        statsDiv.classList.remove("hidden"); statsDiv.textContent = "Przetwarzanie..."; btnProcess.disabled = true;

        const img = new Image(); const srcUrl = URL.createObjectURL(currentFile);

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");

          if (currentFmt === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
          
          ctx.drawImage(img, 0, 0);
          const quality = Number(qualInput.value) / 100;
          
          canvas.toBlob((blob) => {
            btnProcess.disabled = false;
            if (!blob) { statsDiv.textContent = "Błąd: Nie udało się przetworzyć zdjęcia."; return; }

            const outUrl = URL.createObjectURL(blob); activeUrls.push(outUrl);
            const ext = currentFmt.split("/")[1];
            const outName = currentFile.name.replace(/\.[^.]+$/, "") + "_conv." + ext;
            const diff = ((blob.size - currentFile.size) / currentFile.size * 100).toFixed(1);
            const sign = diff > 0 ? "+" : "";
            
            statsDiv.innerHTML = `<b>Gotowe!</b><br>Przed: ${(currentFile.size / 1024).toFixed(1)} KB<br>Po: <b>${(blob.size / 1024).toFixed(1)} KB</b> (${sign}${diff}%)`;

            imgAfter.src = outUrl; previewContainer.classList.remove("hidden");
            dlBtn.href = outUrl; dlBtn.download = outName; dlBtn.textContent = `Pobierz ${outName}`; dlBtn.classList.remove("hidden");

          }, currentFmt, quality);
        };

        img.onerror = () => { btnProcess.disabled = false; statsDiv.textContent = "Błąd: To nie jest prawidłowy plik graficzny."; };
        img.src = srcUrl;
      }, { signal });
    },
    unmount() { cleanupUrls(); }
  });
})();