function PlaylistTable(tableElem, tbodyElem, msgElem, detailView) {
    this.table = tableElem;
    this.tbody = tbodyElem;
    this.msg = msgElem;
    this.detailView = detailView;

    // resetto la tabella: la nascondo e tolgo eventuali messaggi
    this.reset = () => {
        this.table.style.visibility = "hidden";
        this.msg.textContent = "";
    };

    // caricamento dati da server e visualizzazione
    this.show = () => {
        makeCall("GET", "GetUserPlaylistsData", null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return; // aspetto risposta completa
            if (req.status === 200) {
                const data = JSON.parse(req.responseText); // array di playlist
                if (data.length === 0) {
                    // se non ci sono playlist, mostro messaggio
                    this.msg.textContent = "Nessuna playlist disponibile";
                    return;
                }
                // altrimenti popolo la tabella
                this.update(data);
            } else {
                // in caso di errore vado alla pagina di errore
                redirectToErrorPage(req);
            }
        });
    };

    // aggiorno le righe della tabella con le playlist
    this.update = playlists => {
        this.tbody.innerHTML = ""; // svuoto il <tbody>
        playlists.forEach(pl => {
            const tr = document.createElement("tr");

            // colonna titolo con link per aprire il dettaglio
            const tdTitle = document.createElement("td");
            const a = document.createElement("a");
            a.href = "#";
            a.textContent = pl.title;
            a.addEventListener("click", e => {
                e.preventDefault();
                this.detailView.load(pl.playlist_id); // apro PlaylistDetailView
            });
            tdTitle.appendChild(a);
            tr.appendChild(tdTitle);

            // colonna data di creazione formattata in italiano
            const tdDate = document.createElement("td");
            tdDate.textContent = new Date(pl.time)
                .toLocaleString("it-IT", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                });
            tr.appendChild(tdDate);

            // colonna bottone per riordinare i brani
            const tdReorder = document.createElement("td");
            const reorderBtn = document.createElement("button");
            reorderBtn.textContent = "Riordino";
            reorderBtn.addEventListener("click", () =>
                openReorderModal(pl.playlist_id) // funzione globale
            );
            tdReorder.appendChild(reorderBtn);
            tr.appendChild(tdReorder);

            // aggiungo la riga alla tabella
            this.tbody.appendChild(tr);
        });
        // mostro la tabella
        this.table.style.visibility = "visible";
    };
}
