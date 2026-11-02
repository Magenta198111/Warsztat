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
    icon: "🖼️",
    desc: "Kompresja i zmiana formatu na WebP, JPEG lub PNG",

    async mount(container, signal) {
      let savedFmt = "image/jpeg";
      let savedQual = 85;
      
      try {
        savedFmt = await Hub.db.get("conv_fmt", "image/jpeg");
        savedQual = await Hub.db.get("conv_qual", 85);
      } catch (e) {}

      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <button id="c-back" style="width:auto; padding:10px 16px; border-radius:14px;">Wróć</button>
          <h2 style="margin:0; font-size:18px;">Konwerter Zdjęć</h2>
          <div style="width:68px;"></div>
        </div>

        <div class="card">
          <label>Zdjęcie źródłowe</label>
          <div style="display:flex; align-items:center; gap:10px; border:1.5px dashed var(--line); padding:10px; border-radius:14px; background:var(--bg);">
            <input type="file" id="c-file" accept="image/*" style="display:none;">
            <button id="c-file-btn" style="width:auto; padding:10px 16px; font-weight:600;">Wybierz plik</button>
            <span id="c-file-name" style="color:var(--muted); font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Nie wybrano pliku</span>
          </div>

          <label>Format docelowy</label>
          <select id="c-fmt">
            <option value="image/webp">WebP (najmniejszy rozmiar)</option>
            <option value="image/jpeg">JPEG (standard)</option>
            <option value="image/png">PNG (bezstratny)</option>
          </select>

          <label id="c-qual-label">Jakość (JPEG i WebP): ${savedQual}%</label>
          <input type="range" id="c-qual" min="10" max="100" value="${savedQual}">

          <button class="p" id="c-btn">Konwertuj zdjęcie</button>
          
          <div class="i hidden" id="c-stats" style="margin-top:14px;"></div>

          <div id="c-preview-container" class="hidden" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px;">
            <div>
              <div style="font-size:12px; color:var(--muted); margin-bottom:6px; text-align:center;">Przed</div>
              <img id="c-img-before" style="width:100%; border-radius:12px; border:1.5px solid var(--line); display:block; object-fit:cover;">
            </div>
            <div>
              <div style="font-size:12px; color:var(--muted); margin-bottom:6px; text-align:center;">Po</div>
              <img id="c-img-after" style="width:100%; border-radius:12px; border:1.5px solid var(--line); display:block; object-fit:cover;">
            </div>
          </div>

          <a class="btn-dl hidden" id="c-dl" style="display:block; text-align:center; margin-top:14px; text-decoration:none; background:var(--accent); border:1.5px solid var(--accent); padding:14px; border-radius:14px; color:var(--accent-ink); font-weight:600;">⬇️ Pobierz</a>
        </div>
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

      $("c-back").addEventListener("click", () => {
        history.back();
      }, { signal });

      fileBtn.addEventListener("click", () => fileInput.click(), { signal });

      fmtSelect.addEventListener("change", () => {
        Hub.db.set("conv_fmt", fmtSelect.value).catch(()=>{});
      }, { signal });

      qualInput.addEventListener("input", () => {
        qualLabel.textContent = `Jakość (JPEG i WebP): ${qualInput.value}%`;
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
            dlBtn.textContent = `⬇️ Pobierz ${outName}`;
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