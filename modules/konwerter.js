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
      
      try {
        savedFmt = await Hub.db.get("conv_fmt", "image/jpeg");
        savedQual = await Hub.db.get("conv_qual", 85);
      } catch (e) {}

      const formatNames = {
        "image/webp": "WebP (najmniejszy rozmiar)",
        "image/jpeg": "JPEG (standard)",
        "image/png": "PNG (bezstratny)"
      };

      container.innerHTML = `
        <style>
          .n-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; margin-top: 0; }
          
          .n-select-wrapper {
            position: relative;
            width: 100%;
            margin-bottom: 20px;
          }
          
          .n-custom-select {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg);
            border: 1px solid var(--line);
            border-radius: 6px;
            padding: 14px 16px;
            color: var(--ink);
            font-size: 15px;
            cursor: pointer;
            user-select: none;
          }
          .n-custom-select:active { background: var(--surface-hover); }
          .n-custom-select svg { color: var(--muted); transition: transform 0.2s; }
          .n-custom-select.open svg { transform: rotate(180deg); }
          
          .n-dropdown {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            width: 100%;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 6px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            z-index: 100;
            overflow: hidden;
            opacity: 0;
            transform: translateY(-10px) scaleY(0.95);
            transform-origin: top center;
            pointer-events: none;
            transition: opacity 0.2s ease, transform 0.2s ease;
          }
          .n-dropdown.open {
            opacity: 1;
            transform: translateY(0) scaleY(1);
            pointer-events: auto;
          }
          
          .n-dropdown-item {
            padding: 14px 16px;
            font-size: 15px;
            color: var(--ink);
            cursor: pointer;
            border-bottom: 1px solid var(--line);
            transition: background 0.15s;
          }
          .n-dropdown-item:last-child { border-bottom: none; }
          .n-dropdown-item:active { background: var(--surface-hover); }
          .n-dropdown-item.active { color: var(--accent); font-weight: 600; }

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

        <div class="n-block" style="overflow: visible;">
          <span class="n-label">Ustawienia konwersji</span>
          
          <div class="n-select-wrapper">
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
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("c-file"), fileBtn = $("c-file-btn"), fileName = $("c-file-name");
      
      const selectTrigger = $("c-select-trigger"), selectText = $("c-select-text"), dropdown = $("c-dropdown");
      const options = container.querySelectorAll(".n-dropdown-item");
      
      const qualInput = $("c-qual"), qualLabel = $("c-qual-label"), btnProcess = $("c-btn");
      const statsDiv = $("c-stats"), dlBtn = $("c-dl");
      const previewContainer = $("c-preview-container"), imgBefore = $("c-img-before"), imgAfter = $("c-img-after");

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