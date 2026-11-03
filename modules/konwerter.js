(() => {
  let activeUrls = [];

  function cleanupUrls() {
    activeUrls.forEach(u => {
      try { URL.revokeObjectURL(u); } catch(e){}
    });
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

      container.innerHTML = `
        <style>
          .n-label {
            display: block;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--muted);
            margin-bottom: 8px;
            margin-top: 0;
          }
          .n-select {
            appearance: none;
            -webkit-appearance: none;
            background-color: var(--bg);
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238b8b93%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat;
            background-position: right 12px top 50%;
            background-size: 10px auto;
            border: 1px solid var(--line);
            border-radius: 6px;
            padding: 12px 36px 12px 12px;
            color: var(--ink);
            font: inherit;
            font-size: 15px;
            width: 100%;
            outline: none;
          }
          .n-select:focus { border-color: var(--muted); }
          
          .n-range {
            -webkit-appearance: none;
            appearance: none;
            height: 4px;
            background: var(--line);
            border-radius: 2px;
            outline: none;
            margin: 16px 0;
            width: 100%;
          }
          .n-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          
          .n-btn-purple {
            width: 100%;
            padding: 14px;
            border-radius: 6px;
            background: var(--accent);
            color: var(--accent-ink);
            border: 1px solid var(--accent);
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            display: block;
            transition: opacity 0.2s;
          }
          .n-btn-purple:active { opacity: 0.8; }
          
          .n-block {
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
          }
          
          .n-file-name {
            font-size: 13px;
            color: var(--muted);
            margin-top: 12px;
            text-align: center;
            word-break: break-all;
          }
        </style>

        <div style="display:flex; align-items:center; justify-content:flex-start; margin-bottom:20px;">
          <button id="c-back" style="width:auto; padding:10px 12px; border-radius:6px; margin:0; border:1px solid var(--line); background:var(--surface); color:var(--ink); display:flex; align-items:center; justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        <div class="n-block">
          <span class="n-label">Plik źródłowy</span>
          <input type="file" id="c-file" accept="image/*" style="display:none;">
          <button id="c-file-btn" class="n-btn-purple">
            Wybierz zdjęcie
          </button>
          <div id="c-file-name" class="n-file-name">Nie wybrano pliku</div>
        </div>

        <div class="n-block">
          <span class="n-label">Ustawienia konwersji</span>
          
          <div style="margin-bottom: 20px;">
            <select id="c-fmt" class="n-select">
              <option value="image/webp">WebP (najmniejszy rozmiar)</option>
              <option value="image/jpeg">JPEG (standard)</option>
              <option value="image/png">PNG (bezstratny)</option>
            </select>
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
      const fileInput = $("c-file");
      const fileBtn = $("c-file-btn");
      const fileName = $("c-file-name");
      const fmtSelect = $("c-fmt");
      const qualInput = $("c-qual");
      const qualLabel = $("c-qual-label");
      const btnProcess = $("c-btn");
      const statsDiv = $("c-stats");
      const dlBtn = $("c-dl");
      const previewContainer = $("c-preview-container");
      const imgBefore = $("c-img-before");
      const imgAfter = $("c-img-after");

      fmtSelect.value = savedFmt;
      let currentFile = null;

      $("c-back").addEventListener("click", () => history.back(), { signal });
      fileBtn.addEventListener("click", () => fileInput.click(), { signal });

      fmtSelect.addEventListener("change", () => {
        Hub.db.set("conv_fmt", fmtSelect.value).catch(()=>{});
      }, { signal });

      qualInput.addEventListener("input", () => {
        qualLabel.textContent = `Jakość: ${qualInput.value}%`;
        Hub.db.set("conv_qual", Number(qualInput.value)).catch(()=>{});
      }, { signal });

      fileInput.addEventListener("change", (e) => {
        currentFile = e.target.files[0] || null;
        
        dlBtn.classList.add("hidden");
        previewContainer.classList.add("hidden");
        statsDiv.classList.add("hidden");
        imgAfter.src = "";
        
        if (currentFile) {
          fileName.textContent = currentFile.name;
          fileName.style.color = "var(--ink)";
          
          cleanupUrls();
          const beforeUrl = URL.createObjectURL(currentFile);
          activeUrls.push(beforeUrl);
          imgBefore.src = beforeUrl;
          previewContainer.classList.remove("hidden");
        } else {
          fileName.textContent = "Nie wybrano pliku";
          fileName.style.color = "var(--muted)";
        }
      }, { signal });

      btnProcess.addEventListener("click", () => {
        if (!currentFile) return alert("Najpierw wybierz zdjęcie!");
        
        statsDiv.classList.remove("hidden");
        statsDiv.textContent = "Przetwarzanie...";
        btnProcess.disabled = true;

        const img = new Image();
        const srcUrl = URL.createObjectURL(currentFile);

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");

          if (fmtSelect.value === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          ctx.drawImage(img, 0, 0);
          const quality = Number(qualInput.value) / 100;
          
          canvas.toBlob((blob) => {
            btnProcess.disabled = false;
            if (!blob) {
              statsDiv.textContent = "Błąd: Nie udało się przetworzyć zdjęcia.";
              return;
            }

            const outUrl = URL.createObjectURL(blob);
            activeUrls.push(outUrl);

            const ext = fmtSelect.value.split("/")[1];
            const outName = currentFile.name.replace(/\.[^.]+$/, "") + "_conv." + ext;
            const diff = ((blob.size - currentFile.size) / currentFile.size * 100).toFixed(1);
            const sign = diff > 0 ? "+" : "";
            
            statsDiv.innerHTML = `
              <b>Gotowe!</b><br>
              Przed: ${(currentFile.size / 1024).toFixed(1)} KB<br>
              Po: <b>${(blob.size / 1024).toFixed(1)} KB</b> (${sign}${diff}%)
            `;

            imgAfter.src = outUrl;
            previewContainer.classList.remove("hidden");

            dlBtn.href = outUrl;
            dlBtn.download = outName;
            dlBtn.textContent = `Pobierz ${outName}`;
            dlBtn.classList.remove("hidden");

          }, fmtSelect.value, quality);
        };

        img.onerror = () => {
          btnProcess.disabled = false;
          statsDiv.textContent = "Błąd: To nie jest prawidłowy plik graficzny.";
        };

        img.src = srcUrl;
      }, { signal });
    },

    unmount() {
      cleanupUrls();
    }
  });
})();