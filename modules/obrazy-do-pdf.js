(() => {
  Hub.register({
    id: "obrazy-do-pdf",
    title: "Zdjęcia do PDF",
    desc: "Połącz wiele zdjęć w jeden wielostronicowy plik PDF",

    async mount(container, signal) {
      const MAX_FILES = 1000;
      let selectedFiles = [];
      let isGenerating = false;

      container.innerHTML = `
        <style>
          .pdf-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; }
          
          .pdf-intro-box {
            background: var(--surface); border: 1px solid var(--line);
            border-radius: 12px; padding: 24px 20px; text-align: center;
            margin-top: 16px; margin-bottom: 24px;
            display: flex; flex-direction: column; align-items: center; gap: 16px;
          }

          .pdf-icon-wrapper {
            width: 64px; height: 64px; border-radius: 50%;
            background: var(--bg); border: 1px solid var(--line);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent);
          }

          .pdf-warning {
            display: flex; align-items: flex-start; gap: 10px;
            background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.3);
            border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;
            font-size: 12px; color: #fbbf24; line-height: 1.5; text-align: left;
          }
          .pdf-warning svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
          .pdf-warning strong { color: #fcd34d; }

          .pdf-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
          
          .pdf-item {
            display: flex; align-items: center; gap: 12px;
            background: var(--surface); border: 1px solid var(--line);
            padding: 12px; border-radius: 8px;
          }

          .pdf-thumb {
            width: 48px; height: 48px; border-radius: 4px; object-fit: cover;
            border: 1px solid var(--line); background: var(--bg); flex-shrink: 0;
          }

          .pdf-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
          .pdf-name { font-size: 13px; font-weight: 500; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .pdf-size { font-size: 11px; color: var(--muted); }

          .pdf-controls { display: flex; align-items: center; gap: 4px; }
          .pdf-ctrl-btn {
            background: transparent; border: none; color: var(--muted); padding: 6px;
            cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;
          }
          .pdf-ctrl-btn:active { background: var(--surface-hover); color: var(--ink); }
          .pdf-ctrl-btn.danger { color: var(--danger); }
          .pdf-ctrl-btn.danger:active { background: rgba(239, 68, 68, 0.1); }
          .pdf-ctrl-btn svg { width: 18px; height: 18px; }
          .pdf-ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }

          .pdf-actions { display: flex; flex-direction: column; gap: 12px; }
          
          .pdf-progress-wrapper { width: 100%; display: none; flex-direction: column; gap: 8px; margin-top: 12px; }
          .pdf-progress-bar { width: 100%; height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; }
          .pdf-progress-fill { height: 100%; width: 0%; background: var(--accent); transition: width 0.2s ease; }
          .pdf-progress-text { font-size: 12px; color: var(--muted); font-family: monospace; text-align: center; }

          .pdf-count-badge {
            display: inline-block; font-size: 11px; font-weight: 600;
            background: var(--accent); color: var(--accent-ink);
            padding: 2px 8px; border-radius: 10px; margin-left: 8px;
          }
        </style>

        ${Hub.backButtonHtml}

        <div style="margin-top: 16px;">
          <input type="file" id="pdf-file-input" accept="image/*" multiple style="display:none;">
          
          <div id="pdf-intro-card" class="pdf-intro-box">
            <div class="pdf-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 600; color: var(--ink); margin-bottom: 8px;">Zdjęcia do PDF</div>
              <div style="font-size: 14px; color: var(--muted); line-height: 1.5;">Wybierz wiele zdjęć, ułóż je w odpowiedniej kolejności i scal w jeden dokument. Maksymalnie ${MAX_FILES} zdjęć.</div>
            </div>
            
            <div class="pdf-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <div>
                <strong>Uwaga:</strong> Przy dużej liczbie zdjęć (powyżej 30) przetwarzanie może potrwać kilka sekund. Aplikacja została zoptymalizowana pod kątem dużych plików, ale przy ponad 100 zdjęciach operacja może zająć kilkanaście sekund – w tym czasie nie zamykaj aplikacji.
              </div>
            </div>

            <button id="pdf-add-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px; margin-top: 8px;">Dodaj zdjęcia</button>
          </div>

          <div id="pdf-workspace" class="hidden">
            <label class="pdf-label">
              Kolejność stron (przeciągnij strzałkami)
              <span id="pdf-count-badge" class="pdf-count-badge">0</span>
            </label>
            <div id="pdf-list" class="pdf-list"></div>

            <div id="pdf-workspace-warning" class="pdf-warning hidden">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <div>
                <strong>Duża liczba zdjęć!</strong> Generowanie PDF może potrwać kilkanaście sekund. W tym czasie interfejs może się lekko przyciąć – to normalne. Nie zamykaj aplikacji.
              </div>
            </div>

            <div class="pdf-actions">
              <button id="pdf-add-more" class="n-btn" style="width: 100%; padding: 14px;">Dodaj kolejne zdjęcia</button>
              <button id="pdf-generate-btn" class="n-btn n-btn-outline" style="width: 100%; padding: 14px;">Generuj wielostronicowy PDF</button>
            </div>

            <div id="pdf-progress" class="pdf-progress-wrapper">
              <div class="pdf-progress-bar"><div id="pdf-progress-fill" class="pdf-progress-fill"></div></div>
              <div id="pdf-progress-text" class="pdf-progress-text">Przygotowywanie...</div>
            </div>
          </div>
        </div>
      `;

      const $ = id => container.querySelector("#" + id);
      const fileInput = $("pdf-file-input");
      const addBtn = $("pdf-add-btn");
      const addMoreBtn = $("pdf-add-more");
      const introCard = $("pdf-intro-card");
      const workspace = $("pdf-workspace");
      const listEl = $("pdf-list");
      const generateBtn = $("pdf-generate-btn");
      const progressWrapper = $("pdf-progress");
      const progressFill = $("pdf-progress-fill");
      const progressText = $("pdf-progress-text");
      const countBadge = $("pdf-count-badge");
      const workspaceWarning = $("pdf-workspace-warning");

      function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      }

      function updateWarningVisibility() {
        const count = selectedFiles.length;
        countBadge.textContent = count;
        
        if (count > 100) {
          workspaceWarning.classList.remove("hidden");
          workspaceWarning.querySelector("div").innerHTML = `<strong>UWAGA: ${count} zdjęć!</strong> Generowanie PDF może potrwać nawet kilkadziesiąt sekund. Interfejs może się w tym czasie przycinać. Nie zamykaj aplikacji.`;
        } else if (count > 30) {
          workspaceWarning.classList.remove("hidden");
          workspaceWarning.querySelector("div").innerHTML = `<strong>Duża liczba zdjęć (${count}).</strong> Generowanie PDF może potrwać kilkanaście sekund. W tym czasie aplikacja może się lekko przyciąć – to normalne.`;
        } else {
          workspaceWarning.classList.add("hidden");
        }
      }

      function renderList() {
        listEl.innerHTML = "";
        selectedFiles.forEach((file, index) => {
          const item = document.createElement("div");
          item.className = "pdf-item";
          item.innerHTML = `
            <img src="${file.url}" class="pdf-thumb" loading="lazy">
            <div class="pdf-info">
              <div class="pdf-name">${index + 1}. ${file.name}</div>
              <div class="pdf-size">${formatBytes(file.size)}</div>
            </div>
            <div class="pdf-controls">
              <button class="pdf-ctrl-btn move-up" ${index === 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <button class="pdf-ctrl-btn move-down" ${index === selectedFiles.length - 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <button class="pdf-ctrl-btn danger remove-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          `;

          item.querySelector(".move-up").onclick = () => {
            if (index > 0) {
              Hub.haptic('light');
              [selectedFiles[index - 1], selectedFiles[index]] = [selectedFiles[index], selectedFiles[index - 1]];
              renderList();
            }
          };
          item.querySelector(".move-down").onclick = () => {
            if (index < selectedFiles.length - 1) {
              Hub.haptic('light');
              [selectedFiles[index + 1], selectedFiles[index]] = [selectedFiles[index], selectedFiles[index + 1]];
              renderList();
            }
          };
          item.querySelector(".remove-btn").onclick = () => {
            Hub.haptic('medium');
            URL.revokeObjectURL(file.url);
            selectedFiles.splice(index, 1);
            if (selectedFiles.length === 0) {
              workspace.classList.add("hidden");
              introCard.classList.remove("hidden");
            } else {
              renderList();
            }
          };

          listEl.appendChild(item);
        });
        updateWarningVisibility();
      }

      function handleFiles(files) {
        const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (newFiles.length === 0) return;

        const availableSlots = MAX_FILES - selectedFiles.length;
        if (availableSlots <= 0) {
          showToast(`Osiągnięto limit ${MAX_FILES} zdjęć.`);
          return;
        }

        let filesToAdd = newFiles;
        if (newFiles.length > availableSlots) {
          filesToAdd = newFiles.slice(0, availableSlots);
          showToast(`Dodano ${filesToAdd.length} zdjęć (limit ${MAX_FILES}).`);
        } else if (newFiles.length > 30) {
          showToast(`Dodano ${newFiles.length} zdjęć. Przetwarzanie może chwilę potrwać.`);
        }

        filesToAdd.forEach(file => {
          selectedFiles.push({
            file: file,
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file)
          });
        });

        introCard.classList.add("hidden");
        workspace.classList.remove("hidden");
        renderList();
        Hub.haptic('success');
      }

      addBtn.onclick = () => fileInput.click();
      addMoreBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        if (e.target.files.length > 0) handleFiles(e.target.files);
        fileInput.value = "";
      };

      async function createPDF() {
        if (isGenerating || selectedFiles.length === 0) return;
        isGenerating = true;
        
        generateBtn.disabled = true;
        generateBtn.textContent = "Przetwarzanie...";
        progressWrapper.style.display = "flex";
        progressFill.style.width = "0%";
        progressText.textContent = `Przygotowywanie ${selectedFiles.length} zdjęć (0%)...`;
        Hub.haptic('medium');

        await new Promise(r => setTimeout(r, 200));

        try {
          // Nowa metoda: Budujemy PDF binarnie w locie, bez trzymania wszystkich zdjęć w pamięci
          let pdfChunks = [];
          let currentOffset = 0;
          let offsets = [];
          let objectId = 1;
          const maxDim = 2000;
          const totalFiles = selectedFiles.length;

          function appendString(str) {
            const bytes = new TextEncoder().encode(str);
            pdfChunks.push(bytes);
            currentOffset += bytes.length;
          }

          function appendBytes(bytes) {
            pdfChunks.push(bytes);
            currentOffset += bytes.length;
          }

          function addObject(contentString) {
            offsets.push(currentOffset);
            appendString(`${objectId} 0 obj\n${contentString}\nendobj\n`);
            objectId++;
          }

          function addStreamObject(dictString, streamBytes) {
            offsets.push(currentOffset);
            appendString(`${objectId} 0 obj\n<< ${dictString} /Length ${streamBytes.length} >>\nstream\n`);
            appendBytes(streamBytes);
            appendString(`\nendstream\nendobj\n`);
            objectId++;
          }

          appendString("%PDF-1.4\n");
          
          // Obiekt 1: Katalog
          addObject(`<< /Type /Catalog /Pages 2 0 R >>`);
          
          // Obiekt 2: Lista stron (Kids) - wiemy ile ich będzie
          let kidsArray = [];
          for (let i = 0; i < totalFiles; i++) {
            kidsArray.push(`${3 + i * 3} 0 R`);
          }
          addObject(`<< /Type /Pages /Kids [${kidsArray.join(' ')}] /Count ${totalFiles} >>`);

          for (let i = 0; i < totalFiles; i++) {
            const item = selectedFiles[i];
            const percent = Math.round(((i) / totalFiles) * 100);
            progressFill.style.width = percent + "%";
            progressText.textContent = `Przetwarzanie i budowanie (${percent}%)...`;
            
            await new Promise(r => setTimeout(r, 10));

            const bitmap = await createImageBitmap(item.file, { imageOrientation: 'from-image' });
            
            let w = bitmap.width;
            let h = bitmap.height;
            
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((maxDim / w) * h);
                w = maxDim;
              } else {
                w = Math.round((maxDim / h) * w);
                h = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(bitmap, 0, 0, w, h);

            // KLUCZOWA ZMIANA: Używamy Blob i ArrayBuffer (binarnie) zamiast ogromnych stringów Hex/Base64
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Obiekt strony (Page)
            offsets.push(currentOffset);
            appendString(`${objectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${objectId + 1} 0 R /Resources << /XObject << /Im1 ${objectId + 2} 0 R >> >> >>\nendobj\n`);
            objectId++;

            // Strumień zawartości (gdzie narysować obraz)
            const contentStream = `q\n${w} 0 0 ${h} 0 0 cm\n/Im1 Do\nQ\n`;
            addStreamObject('', new TextEncoder().encode(contentStream));
            
            // Strumień obrazu (surowe dane JPEG)
            addStreamObject(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, uint8Array);

            // Zwalniamy pamięć
            if (bitmap.close) bitmap.close();
            canvas.width = 0;
            canvas.height = 0;
            
            await new Promise(r => setTimeout(r, 0)); 
          }

          progressText.textContent = "Finalizowanie (95%)...";
          progressFill.style.width = "95%";
          await new Promise(r => setTimeout(r, 100));

          const startXref = currentOffset;
          let xref = `xref\n0 ${objectId}\n0000000000 65535 f \n`;
          offsets.forEach(off => {
            xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
          });

          const trailer = `trailer\n<< /Size ${objectId} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
          appendString(xref + trailer);

          progressFill.style.width = "100%";
          progressText.textContent = "Gotowe!";
          
          const finalBlob = new Blob(pdfChunks, { type: 'application/pdf' });
          Hub.download(finalBlob, `dokument_${new Date().toISOString().slice(0,10)}.pdf`);
          
          setTimeout(() => {
            progressWrapper.style.display = "none";
            generateBtn.disabled = false;
            generateBtn.textContent = "Generuj wielostronicowy PDF";
            isGenerating = false;
          }, 1000);

        } catch (err) {
          console.error(err);
          showToast("Błąd: " + err.message); // Pokazujemy dokładny błąd
          progressWrapper.style.display = "none";
          generateBtn.disabled = false;
          generateBtn.textContent = "Generuj wielostronicowy PDF";
          isGenerating = false;
        }
      }

      generateBtn.onclick = createPDF;

      signal.addEventListener('abort', () => {
        selectedFiles.forEach(f => URL.revokeObjectURL(f.url));
      });
    },

    unmount() {}
  });
})();