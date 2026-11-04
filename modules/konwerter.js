(() => {
  let activeUrls = [];

  function cleanupUrls() {
    activeUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch(e){} });
    activeUrls = [];
  }

  Hub.register({
    id: "konwerter",
    title: "Konwerter Zdjęć",
    desc: "Kompresja, zmiana formatu i rozmiaru zdjęć",

    async mount(container, signal) {
      let savedFmt = "image/jpeg";
      let savedQual = 85;
      let savedResizeMode = "orig";
      
      try {
        savedFmt = await Hub.db.get("conv_fmt", "image/jpeg");
        savedQual = await Hub.db.get("conv_qual", 85);
        savedResizeMode = await Hub.db.get("conv_resize", "orig");
      } catch (e) {}

      const formatNames = {
        "image/webp": "WebP (najmniejszy)",
        "image/jpeg": "JPEG (standard)",
        "image/png": "PNG (bezstratny)"
      };

      const resizeNames = {
        "orig": "Oryginalny rozmiar",
        "1080p": "Maks. 1920 px (Full HD)",
        "720p": "Maks. 1280 px (HD)",
        "50%": "50% szerokości",
        "25%": "25% szerokości"
      };

      container.innerHTML = `
        <style>
          .hidden { display: none !important; }
          .c-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; margin-top: 0; }
          .c-trigger { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 14px 16px; color: var(--ink); font-size: 15px; cursor: pointer; user-select: none; margin-bottom: 20px; }
          .c-trigger:active { background: var(--surface-hover); }
          .c-trigger svg { color: var(--muted); }
          
          .c-range { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; outline: none; margin: 20px 0 10px 0; width: 100%; background: linear-gradient(to right, var(--accent) var(--percent, 85%), var(--line) var(--percent, 85%)); touch-action: pan-y; }
          .c-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.4); margin-top: -2px; transition: transform 0.1s, box-shadow 0.1s; }
          .c-range:active::-webkit-slider-thumb { transform: scale(1.15); box-shadow: 0 6px 12px rgba(0,0,0,0.6); }
          
          .c-divider { width: 100%; height: 1px; background: var(--line); margin: 24px 0; }
          .c-file-name { font-size: 13px; color: var(--muted); margin-top: 8px; text-align: center; word-break: break-all; min-height: 18px; }
          .c-stats { font-family: monospace; text-align: center; font-size: 13px; line-height: 1.6; margin-bottom: 20px; color: var(--ink); }
          .c-stats span { color: var(--accent); font-weight: bold; }
          
          .c-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .c-preview-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px; text-align: center; }
          .c-preview-img { width: 100%; border-radius: 6px; border: 1px solid var(--line); display: block; object-fit: cover; max-height: 200px; background: var(--surface); cursor: zoom-in; transition: opacity 0.2s; }
          .c-preview-img:active { opacity: 0.8; }
          
          .c-drop-zone { border: 2px dashed var(--line); border-radius: 8px; padding: 30px 20px; text-align: center; color: var(--muted); cursor: pointer; transition: border-color 0.2s; margin-bottom: 16px; }
          .c-drop-zone:active { border-color: var(--accent); }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-bottom: 24px;">
          <label class="c-label">Plik źródłowy</label>
          <input type="file" id="c-file" accept="image/*" style="display:none;">
          <div id="c-drop-zone" class="c-drop-zone">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px; opacity:0.5;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <div style="font-size: 14px; font-weight: 500;">Kliknij, aby wybrać zdjęcie</div>
            <div style="font-size: 12px; margin-top: 4px; opacity: 0.7;">lub wklej ze schowka (Ctrl+V)</div>
          </div>
          <div id="c-file-name" class="c-file-name">Nie wybrano pliku</div>
        </div>

        <div class="c-divider"></div>

        <div>
          <label class="c-label">Format docelowy</label>
          <div id="c-fmt-trigger" class="c-trigger">
            <span id="c-fmt-text">${formatNames[savedFmt]}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>

          <label class="c-label">Rozmiar (wymiary)</label>
          <div id="c-resize-trigger" class="c-trigger">
            <span id="c-resize-text">${resizeNames[savedResizeMode]}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>

          <div id="c-qual-wrapper">
            <span id="c-qual-label" class="c-label" style="margin-bottom:0;">Jakość: ${savedQual}%</span>
            <input type="range" id="c-qual" min="10" max="100" value="${savedQual}" class="c-range">
          </div>
        </div>

        <button id="c-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px; font-size: 15px; margin-top: 16px; margin-bottom: 24px;">Konwertuj zdjęcie</button>
        
        <div id="c-result-section" class="hidden">
          <div class="c-divider"></div>
          <div id="c-stats" class="c-stats"></div>
          <div class="c-preview-grid">
            <div>
              <div class="c-preview-label">Przed</div>
              <img id="c-img-before" class="c-preview-img">
            </div>
            <div>
              <div class="c-preview-label">Po</div>
              <img id="c-img-after" class="c-preview-img">
            </div>
          </div>
          <a class="n-btn n-btn-outline" id="c-dl" style="text-decoration: none; display: flex; width: 100%; padding: 14px; font-size: 15px;">Pobierz plik</a>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("c-file"), dropZone = $("c-drop-zone"), fileName = $("c-file-name");
      const fmtTrigger = $("c-fmt-trigger"), fmtText = $("c-fmt-text");
      const resizeTrigger = $("c-resize-trigger"), resizeText = $("c-resize-text");
      const qualWrapper = $("c-qual-wrapper"), qualInput = $("c-qual"), qualLabel = $("c-qual-label");
      const btnProcess = $("c-btn");
      const resultSection = $("c-result-section"), statsDiv = $("c-stats"), dlBtn = $("c-dl");
      const imgBefore = $("c-img-before"), imgAfter = $("c-img-after");

      let currentFmt = savedFmt;
      let currentResize = savedResizeMode;
      let currentFile = null;
      let currentBitmap = null;
      let originalWidth = 0, originalHeight = 0;

      function updateSliderFill(el) {
        const percent = ((el.value - el.min) / (el.max - el.min)) * 100;
        el.style.setProperty('--percent', `${percent}%`);
      }

      updateSliderFill(qualInput);

      function updateQualVisibility() {
        if (currentFmt === "image/png") qualWrapper.classList.add("hidden");
        else qualWrapper.classList.remove("hidden");
      }
      updateQualVisibility();

      qualInput.addEventListener("input", () => {
        qualLabel.textContent = `Jakość: ${qualInput.value}%`;
        updateSliderFill(qualInput);
        Hub.db.set("conv_qual", Number(qualInput.value)).catch(()=>{});
      }, { signal });

      async function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return showToast("Wybierz prawidłowy plik graficzny.");
        
        currentFile = file;
        resultSection.classList.add("hidden");
        fileName.textContent = file.name;
        fileName.style.color = "var(--ink)";

        try {
          currentBitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
          originalWidth = currentBitmap.width;
          originalHeight = currentBitmap.height;
          fileName.textContent = `${file.name} (${originalWidth}x${originalHeight} px)`;

          cleanupUrls();
          const beforeUrl = URL.createObjectURL(file);
          activeUrls.push(beforeUrl);
          imgBefore.src = beforeUrl;

          if (originalWidth > 6000 || originalHeight > 6000) {
             showToast("Uwaga: Bardzo duże zdjęcie. Konwersja może chwilę potrwać.");
          }
        } catch (e) {
          showToast("Błąd podczas odczytu zdjęcia.");
          currentFile = null; currentBitmap = null;
          fileName.textContent = "Błąd odczytu";
        }
      }

      dropZone.addEventListener("click", () => fileInput.click(), { signal });
      fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]), { signal });

      document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
          const item = items[index];
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            handleFile(blob);
            break;
          }
        }
      }, { signal });

      fmtTrigger.addEventListener("click", async () => {
        const opts = Object.keys(formatNames).map(k => ({ id: k, label: formatNames[k] }));
        const choice = await Hub.showSelect({ title: "Format docelowy", options: opts, current: currentFmt, anchor: fmtTrigger, signal });
        if (choice) {
          currentFmt = choice;
          fmtText.textContent = formatNames[currentFmt];
          Hub.db.set("conv_fmt", currentFmt).catch(()=>{});
          updateQualVisibility();
        }
      }, { signal });

      resizeTrigger.addEventListener("click", async () => {
        const opts = Object.keys(resizeNames).map(k => ({ id: k, label: resizeNames[k] }));
        const choice = await Hub.showSelect({ title: "Rozmiar wyjściowy", options: opts, current: currentResize, anchor: resizeTrigger, signal });
        if (choice) {
          currentResize = choice;
          resizeText.textContent = resizeNames[currentResize];
          Hub.db.set("conv_resize", currentResize).catch(()=>{});
        }
      }, { signal });

      imgBefore.addEventListener("click", () => {
        if (imgBefore.src) {
          Hub.showModal({ content: `<img src="${imgBefore.src}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">` });
        }
      }, { signal });

      imgAfter.addEventListener("click", () => {
        if (imgAfter.src) {
          Hub.showModal({ content: `<img src="${imgAfter.src}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">` });
        }
      }, { signal });

      btnProcess.addEventListener("click", () => {
        if (!currentBitmap) return showToast("Najpierw wybierz zdjęcie!");
        
        btnProcess.disabled = true;
        btnProcess.textContent = "Przetwarzanie...";

        setTimeout(() => {
          try {
            let tWidth = originalWidth, tHeight = originalHeight;
            
            if (currentResize === "1080p" && originalWidth > 1920) {
              tWidth = 1920; tHeight = Math.round((tWidth / originalWidth) * originalHeight);
            } else if (currentResize === "720p" && originalWidth > 1280) {
              tWidth = 1280; tHeight = Math.round((tWidth / originalWidth) * originalHeight);
            } else if (currentResize === "50%") {
              tWidth = Math.round(originalWidth * 0.5); tHeight = Math.round(originalHeight * 0.5);
            } else if (currentResize === "25%") {
              tWidth = Math.round(originalWidth * 0.25); tHeight = Math.round(originalHeight * 0.25);
            }

            const canvas = document.createElement("canvas");
            canvas.width = tWidth; canvas.height = tHeight;
            const ctx = canvas.getContext("2d");

            if (currentFmt === "image/jpeg") { 
              ctx.fillStyle = "#ffffff"; 
              ctx.fillRect(0, 0, canvas.width, canvas.height); 
            }
            
            ctx.drawImage(currentBitmap, 0, 0, tWidth, tHeight);
            const quality = Number(qualInput.value) / 100;
            
            canvas.toBlob((blob) => {
              btnProcess.disabled = false;
              btnProcess.textContent = "Konwertuj zdjęcie";
              
              if (!blob) return showToast("Błąd: Nie udało się przetworzyć zdjęcia.");

              const outUrl = URL.createObjectURL(blob); 
              activeUrls.push(outUrl);
              
              const ext = currentFmt.split("/")[1];
              const outName = currentFile.name.replace(/\.[^.]+$/, "") + "_conv." + ext;
              
              const diff = ((blob.size - currentFile.size) / currentFile.size * 100).toFixed(1);
              const sign = diff > 0 ? "+" : "";
              
              statsDiv.innerHTML = `Wymiary: ${originalWidth}x${originalHeight} px &rarr; <span>${tWidth}x${tHeight} px</span><br>Rozmiar: ${(currentFile.size / 1024).toFixed(1)} KB &rarr; <span>${(blob.size / 1024).toFixed(1)} KB</span> (${sign}${diff}%)`;

              imgAfter.src = outUrl;
              resultSection.classList.remove("hidden");

              dlBtn.href = outUrl;
              dlBtn.download = outName;
              dlBtn.textContent = `Pobierz ${outName}`;

            }, currentFmt, quality);
          } catch (err) {
            btnProcess.disabled = false;
            btnProcess.textContent = "Konwertuj zdjęcie";
            showToast("Wystąpił błąd podczas konwersji.");
          }
        }, 50);
      }, { signal });
    },
    
    unmount() { 
      cleanupUrls(); 
    }
  });
})();