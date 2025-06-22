(function () {
    const URL_PLAYLIST_DATA = "GetPlaylistData";
    const URL_SAVE_ORDER = "SavePlaylistOrder";

    const overlay = document.getElementById("modalOverlay");
    const modal = document.getElementById("reorderModal");
    const list = document.getElementById("reorderList");
    const loadingEl = document.getElementById("loadingIndicator");
    const btnSave = document.getElementById("saveReorderBtn");
    const btnCancel = document.getElementById("cancelReorderBtn");

    const show = el => el.classList.remove("is-hidden");
    const hide = el => el.classList.add("is-hidden");

    // variabili di stato per il drag-and-drop
    let dragSrcEl = null; // <li> che sto trascinando
    let dragTarget = null; // <li> attualmente sotto il cursore
    let dragPosition = null; // stringa "above" oppure "below" usata nel drop

    function handleDragStart(e) {
        dragSrcEl = e.currentTarget; // salvo quale elemento sto muovendo
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", ""); // obbligatorio in Firefox
        dragSrcEl.classList.add("dragging");   // aggiunge stile di evidenziazione
    }

    //il cursore passa sopra un altro <li>
    function handleDragOver(e) {
        e.preventDefault(); // necessario per abilitare il drop

        // rimuove eventuali classi di evidenziazione dal precedente target
        if (dragTarget) {
            dragTarget.classList.remove("drag-over", "drag-above", "drag-below");
        }

        const target = e.target.closest("li"); // trova il <li> reale sotto il puntatore
        if (!target || target === dragSrcEl) return;

        dragTarget = target;

        // determina se siamo sopra o sotto la metà verticale del <li>
        const rect = target.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        dragPosition = e.clientY < midpoint ? "above" : "below";

        // aggiunge la classe che fa comparire la riga guida
        target.classList.add(
            "drag-over",
            dragPosition === "above" ? "drag-above" : "drag-below"
        );
    }

    // cancella TUTTE le classi legate al drag sui <li>
    function clearDragClasses() {
        document.querySelectorAll("#reorderList li").forEach(li => {
            li.classList.remove("dragging", "drag-over", "drag-above", "drag-below");
        });
        dragSrcEl = dragTarget = null;
    }

    // il cursore esce da un <li> senza rilasciare
    function handleDragLeave() {
        if (dragTarget) {
            dragTarget.classList.remove("drag-over", "drag-above", "drag-below");
            dragTarget = null;
        }
    }

    // l’utente rilascia il mouse
    function handleDrop(e) {
        e.stopPropagation();// blocca la propagazione dell’evento
        if (!dragSrcEl) return;

        const targetLi = e.target.closest("li");

        // caso 1: drop sopra un altro <li> valido (non se stesso)
        if (targetLi && targetLi !== dragSrcEl) {
            if (dragPosition === "above") {
                list.insertBefore(dragSrcEl, targetLi);
            } else {
                list.insertBefore(dragSrcEl, targetLi.nextSibling);
            }
        }
        //caso 2: drop nello spazio vuoto in fondo alla lista
        else if (!targetLi) {
            list.appendChild(dragSrcEl);
        }

        clearDragClasses();
    }

    function openReorderModal(playlistId) {
        show(overlay);
        show(modal);
        list.innerHTML = ""; // pulizia lista
        show(loadingEl);
        hide(list); // nasconde la <ul> finché non arrivano i dati
        loadPlaylistTracks(playlistId);
    }

    window.openReorderModal = openReorderModal; // per esportarlo e usarlo in altre parti

    // chiusura generale della finestra
    function closeReorderModal() {
        hide(overlay);
        hide(modal);
        clearDragClasses();
    }

    overlay.addEventListener("click", closeReorderModal);
    btnCancel.addEventListener("click", closeReorderModal);

    // uscita rapida con tasto ESC
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !overlay.classList.contains("is-hidden")) {
            closeReorderModal();
        }
    });

    function loadPlaylistTracks(playlistId) {
        makeCall("GET",
            `${URL_PLAYLIST_DATA}?playlist_id=${playlistId}`,
            null,
            req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;

                hide(loadingEl);
                show(list);

                if (req.status !== 200) {
                    redirectToErrorPage(req);
                    closeReorderModal();
                    return;
                }

                const {tracks} = JSON.parse(req.responseText);
                if (tracks.length === 0) {
                    list.innerHTML = '<li style="text-align:center;cursor:default;">Nessun brano</li>';
                } else {
                    // creo dinamicamente un <li> per ogni brano
                    tracks.forEach(t => {
                        const li = document.createElement("li");
                        li.textContent = t.title;
                        li.dataset.trackId = t.track_id;
                        li.draggable = true;

                        // collego tutti i listener drag & drop
                        li.addEventListener("dragstart", handleDragStart);
                        li.addEventListener("dragover", handleDragOver);
                        li.addEventListener("dragleave", handleDragLeave);
                        li.addEventListener("dragend", clearDragClasses);
                        li.addEventListener("drop", handleDrop);

                        list.appendChild(li);
                    });
                }

                //memorizzo informazioni utili per il salvataggio del nuovo ordine nel caricamento
                modal.dataset.playlistId = playlistId;
                modal.dataset.originalTrackCnt = tracks.length;
            });
    }

    btnSave.addEventListener("click", () => {
        const originalCnt = +modal.dataset.originalTrackCnt || 0;
        const items = [...document.querySelectorAll("#reorderList li")];

        // validazione di base
        if (items.length === 0) {
            alert("Nessun brano da salvare");
            return;
        }
        if (items.length !== originalCnt) {
            alert(`Errore: numero di brani cambiato (prima: ${originalCnt}, ora: ${items.length})`);
            return;
        }

        btnSave.disabled = true;
        const oldText = btnSave.textContent;
        btnSave.textContent = "Salvataggio...";

        const tempForm = document.createElement("form");

        const inputPlaylist = document.createElement("input");
        inputPlaylist.type = "hidden";
        inputPlaylist.name = "playlist_id";
        inputPlaylist.value = modal.dataset.playlistId;
        tempForm.appendChild(inputPlaylist);

        items.forEach(li => {
            const inp = document.createElement("input");
            inp.type = "hidden";
            inp.name = "trackIds[]";
            inp.value = li.dataset.trackId;
            tempForm.appendChild(inp);
        });

        makeCall("POST", URL_SAVE_ORDER, tempForm, req => {
            btnSave.disabled = false;
            btnSave.textContent = oldText;
            if (req.readyState !== XMLHttpRequest.DONE) return;

            if (req.status === 200) {
                document.dispatchEvent(new CustomEvent("playlistOrderSaved", {
                    detail: {playlistId: +modal.dataset.playlistId}
                }));
                closeReorderModal();
                alert("Ordine salvato!");
            } else {
                redirectToErrorPage(req);
            }
        });
    });
})();
