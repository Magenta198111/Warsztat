(() => {
  Hub.register({
    id: "exif",
    title: "Inspektor & Usuwacz EXIF",
    icon: "🧭",
    desc: "Odczyt danych aparatu/GPS i bezstratne czyszczenie",

    async mount(container, signal) {
      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <button id="e-back" style="width:auto; padding:10px 16px; border-radius:14px;">Wróć</button>
          <h2 style="margin:0; font-size:18px;">Inspektor EXIF</h2>
          <div style="width:68px;"></div>
        </div>

        <div class="card">
          <label>Wybierz zdjęcie z telefonu</label>
          <input type="file" id="e-file" accept="image/jpeg">
          
          <div id="e-info" class="i hidden" style="margin-top:14px; background:var(--bg); padding:12px; border-radius:12px; border:1.5px solid var(--line);">
            <div style="margin-bottom:8px; font-weight:bold; color:var(--ink);" id="e-status">Analizowanie...</div>
            <table class="meta-table" id="e-table" style="width:100%; font-size:13.5px; text-align:left; border-collapse:collapse;"></table>
          </div>

          <button class="p hidden" id="e-clean-btn" style="background:var(--danger); border-color:var(--danger); color:#14171c; margin-top:14px;">Wyczyść dane (Usuń EXIF)</button>
          
          <div id="e-result" class="hidden" style="margin-top:14px; text-align:center;">
            <div style="color:var(--ok); font-weight:bold; margin-bottom:10px;">Dane zostały usunięte!</div>
            <a class="btn-dl" id="e-dl" style="display:block; text-decoration:none; background:var(--accent); border:1.5px solid var(--accent); padding:14px; border-radius:14px; color:var(--accent-ink); font-weight:600;">⬇️ Pobierz czyste zdjęcie</a>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("e-file");
      const infoBox = $("e-info");
      const statusText = $("e-status");
      const table = $("e-table");
      const cleanBtn = $("e-clean-btn");
      const resultBox = $("e-result");
      const dlBtn = $("e-dl");

      let currentBuffer = null;
      let currentName = "";

      $("e-back").addEventListener("click", () => history.back(), { signal });

      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentName = file.name;
        infoBox.classList.remove("hidden");
        cleanBtn.classList.add("hidden");
        resultBox.classList.add("hidden");
        table.innerHTML = "";
        statusText.textContent = "Analizowanie...";
        statusText.style.color = "var(--muted)";

        currentBuffer = await file.arrayBuffer();
        const view = new DataView(currentBuffer);

        if (view.getUint16(0) !== 0xFFD8) {
          statusText.textContent = "To nie jest plik JPEG. EXIF działa tylko dla JPEG.";
          statusText.style.color = "var(--danger)";
          return;
        }

        let offset = 2;
        let hasExif = false;
        let exifData = {};

        while (offset < view.byteLength) {
          if (view.getUint8(offset) !== 0xFF) break;
          const marker = view.getUint8(offset + 1);
          
          if (marker === 0xDA) break; 
          
          if (marker === 0xE1) {
            const length = view.getUint16(offset + 2);
            const exifString = String.fromCharCode.apply(null, new Uint8Array(currentBuffer, offset + 4, 4));
            
            if (exifString === "Exif") {
              hasExif = true;
              const start = offset + 10;
              try {
                const tiffOffset = start;
                const isLittleEndian = view.getUint16(tiffOffset) === 0x4949;
                const ifdOffset = view.getUint32(tiffOffset + 4, isLittleEndian);
                let dirOffset = tiffOffset + ifdOffset;
                const entries = view.getUint16(dirOffset, isLittleEndian);
                
                for (let i = 0; i < entries; i++) {
                  const entry = dirOffset + 2 + (i * 12);
                  const tag = view.getUint16(entry, isLittleEndian);
                  const type = view.getUint16(entry + 2, isLittleEndian);
                  const count = view.getUint32(entry + 4, isLittleEndian);
                  let valOffset = entry + 8;
                  
                  if (count * (type === 2 ? 1 : type === 3 ? 2 : 4) > 4) {
                    valOffset = tiffOffset + view.getUint32(entry + 8, isLittleEndian);
                  }

                  if (type === 2 && count > 0) {
                    let str = "";
                    for (let j = 0; j < count - 1; j++) {
                      str += String.fromCharCode(view.getUint8(valOffset + j));
                    }
                    if (tag === 0x010F) exifData["Producent"] = str;
                    if (tag === 0x0110) exifData["Model"] = str;
                    if (tag === 0x0132) exifData["Data"] = str;
                    if (tag === 0x9003) exifData["Data wykonania"] = str;
                  }
                }
              } catch (err) {
                console.warn("Błąd parsowania EXIF", err);
              }
            }
          }
          offset += 2 + view.getUint16(offset + 2);
        }

        statusText.textContent = "Wynik analizy:";
        statusText.style.color = "var(--ink)";
        
        if (hasExif) {
          for (const [key, val] of Object.entries(exifData)) {
            table.innerHTML += `<tr><td style="padding:8px 4px; border-bottom:1px solid var(--line); color:var(--muted); width:40%;">${key}</td><td style="padding:8px 4px; border-bottom:1px solid var(--line); word-break:break-word;">${val}</td></tr>`;
          }
          if (Object.keys(exifData).length === 0) {
            table.innerHTML = `<tr><td colspan="2" style="padding:8px 4px; color:var(--muted);">Znaleziono blok EXIF, ale brak czytelnych danych tekstowych.</td></tr>`;
          }
          cleanBtn.classList.remove("hidden");
        } else {
          table.innerHTML = `<tr><td colspan="2" style="padding:8px 4px; color:var(--ok); font-weight:bold;">Brak danych EXIF. Zdjęcie jest czyste.</td></tr>`;
        }
      }, { signal });

      cleanBtn.addEventListener("click", () => {
        if (!currentBuffer) return;
        
        const view = new DataView(currentBuffer);
        const chunks = [];
        let offset = 2;
        let lastOffset = 0;

        chunks.push(currentBuffer.slice(0, 2));

        while (offset < view.byteLength) {
          if (view.getUint8(offset) !== 0xFF) break;
          const marker = view.getUint8(offset + 1);
          
          if (marker === 0xDA) {
            chunks.push(currentBuffer.slice(lastOffset));
            break;
          }

          const length = view.getUint16(offset + 2);
          
          if (marker === 0xE1) {
            const exifString = String.fromCharCode.apply(null, new Uint8Array(currentBuffer, offset + 4, 4));
            if (exifString === "Exif") {
              chunks.push(currentBuffer.slice(lastOffset, offset));
              lastOffset = offset + 2 + length;
            }
          }
          offset += 2 + length;
        }

        if (lastOffset === 0) return;

        const newBlob = new Blob(chunks, { type: "image/jpeg" });
        const outUrl = URL.createObjectURL(newBlob);
        
        dlBtn.href = outUrl;
        dlBtn.download = currentName.replace(/\.[^.]+$/, "") + "_clean.jpg";
        
        infoBox.classList.add("hidden");
        cleanBtn.classList.add("hidden");
        resultBox.classList.remove("hidden");
      }, { signal });
    },

    unmount() {}
  });
})();