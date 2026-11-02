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
        <div class="card">
          <h2>Konwerter i Kompresor</h2>
          <label>Zdjęcie źródłowe</label>
          <input type="file" id="c-file" accept="image/*">
          
          <label>Format docelowy</label>
          <select id="c-fmt">
            <option value="image/webp">WebP (najmniejszy rozmiar)</option>
            <option value="image/jpeg">JPEG (standard)</option>
            <option value="image/png">PNG (bezstratny)</option>
          </select>
          
          <label id="c-qual-label">Jakość (JPEG i WebP): ${savedQual}%</label>
          <input type="range" id="c-qual" min="10" max="100" value="${savedQual}">
          
          <button class="p" id="c-btn">Przetwórz zdjęcie</button>
          
          <div class="i" id="c-stats" style="margin-top:14px;">Wybierz zdjęcie, aby rozpocząć.</div>
          
          <a class="btn-dl hidden" id="c-dl" style="display:block; text-align:center; margin-top:14px; text-decoration:none; background:var(--surface); border:1.5px solid var(--line); padding:14px; border-radius:14px; color:var(--ink); font-weight:600;">⬇️ Pobierz</a>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("c-file");
      const fmtSelect = $("c-fmt");
      const qualInput = $("c-qual");
      const qualLabel = $("c-qual-label");
      const btnProcess = $("c-btn");
      const statsDiv = $("c-stats");
      const dlBtn = $("c-dl");

      fmtSelect.value = savedFmt;
      let currentFile = null;

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
        if (currentFile) {
          statsDiv.innerHTML = `Wybrano: <b>${currentFile.name}</b><br>Rozmiar: ${(currentFile.size / 1024).toFixed(1)} KB`;
        }
      }, { signal });

      btnProcess.addEventListener("click", () => {
        if (!currentFile) return alert("Najpierw wybierz zdjęcie!");
        
        cleanupUrls();
        statsDiv.textContent = "Przetwarzanie...";
        btnProcess.disabled = true;

        const img = new Image();
        const srcUrl = URL.createObjectURL(currentFile);
        activeUrls.push(srcUrl);

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