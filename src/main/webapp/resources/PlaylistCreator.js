function PlaylistCreator(formElem) {
    this.form = formElem;
    this.group = formElem.querySelector(".checkbox-group");

    // resetto il form: titolo vuoto e group ripulito
    this.reset = () => {
        this.form.querySelector('input[name="title"]').value = "";
        this.group.innerHTML = "";
    };

    // mostro il form e carico le tracce dell'utente
    this.show = () => {
        makeCall("GET", "GetUserTracksData", null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return; // aspetto la risposta
            if (req.status === 200) {
                const tracks = JSON.parse(req.responseText); // array di brani
                this.group.innerHTML = "";

                if (tracks.length === 0) {
                    // se non ci sono brani, lo segnalo
                    this.group.textContent = "Nessun brano disponibile";
                } else {
                    // per ogni brano creo una checkbox + etichetta
                    tracks.forEach(t => {
                        const div = document.createElement("div");
                        div.className = "checkbox-item";

                        const cb = document.createElement("input");
                        cb.type = "checkbox";
                        cb.name = "trackIds";
                        cb.value = t.track_id;
                        cb.id = "track_" + t.track_id;
                        div.appendChild(cb);

                        const lbl = document.createElement("label");
                        lbl.htmlFor = cb.id;
                        lbl.textContent = t.title;
                        div.appendChild(lbl);

                        this.group.appendChild(div);
                    });
                }
            }
        });
    };

    // registro l'evento di invio del form
    this.registerEvents = orchestrator => {
        this.form.addEventListener("submit", e => {
            e.preventDefault(); // blocco il reload

            // controllo che almeno una checkbox sia selezionata
            if (this.form.querySelectorAll('input[name="trackIds"]:checked').length === 0) {
                alert("Seleziona almeno un brano");
                return;
            }

            // invio i dati al server
            makeCall("POST", "SavePlaylist", this.form, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return; // aspetto ok
                if (req.status === 200) {
                    // se va bene aggiorno la lista playlist e avviso
                    orchestrator.refresh("playlists");
                    alert("Playlist creata!");
                } else {
                    // gestione errore generico
                    redirectToErrorPage(req);
                }
            });
        }, false);
    };
}