(function(){
    const URL_PLAYLIST_LIST   = "GetUserPlaylistsData";
    const URL_PLAYLIST_DATA   = "GetPlaylistData";
    const URL_ALBUM_LIST      = "GetAlbumData";
    const URL_TRACK_LIST      = "GetUserTracksData";
    const URL_CREATE_ALBUM    = "SaveAlbum";
    const URL_UPLOAD_TRACK    = "UploadTrack";
    const URL_SAVE_PLAYLIST   = "SavePlaylist";
    const URL_GENRE_LIST      = "GetGenresData";

    function PlaylistDetailView(containerElem, msgElem) {
        this.container     = containerElem;
        this.msg           = msgElem;
        this.tracks        = [];
        this.currentBlock  = 0;
        this.blockSize     = 5;

        // Inizializza il DOM base
        this.init = () => {
            this.container.innerHTML = `
                <h2 id="detailTitle"></h2>
                <div class="playlist-nav">
                  <button id="prevBtn">PRECEDENTI</button>
                  <button id="nextBtn">SUCCESSIVI</button>
                </div>
                <table id="detailTable"><tr id="detailRow"></tr></table>
            `;
            this.container.querySelector("#prevBtn")
                .addEventListener("click", () => this.renderBlock(this.currentBlock - 1));
            this.container.querySelector("#nextBtn")
                .addEventListener("click", () => this.renderBlock(this.currentBlock + 1));
        };

        // Carica dal server tutte le tracce della playlist
        this.load = (playlist_id) => {
            this.msg.textContent = "";
            makeCall("GET", `${URL_PLAYLIST_DATA}?playlist_id=${playlist_id}`, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) {
                    const resp = JSON.parse(req.responseText);
                    this.tracks       = resp.tracks;
                    this.currentBlock = 0;
                    this.container.querySelector("#detailTitle").textContent = resp.playlist.title;
                    this.renderBlock(0);
                }
                else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                }
                else {
                    this.msg.textContent = req.responseText;
                }
            });
        };

        // Renderizza il blocco specificato
        this.renderBlock = (blockIndex) => {
            const totalBlocks = Math.ceil(this.tracks.length / this.blockSize);
            if (blockIndex < 0 || blockIndex >= totalBlocks) return;
            this.currentBlock = blockIndex;
            const start = blockIndex * this.blockSize;
            const slice = this.tracks.slice(start, start + this.blockSize);

            const row = this.container.querySelector("#detailRow");
            row.innerHTML = "";
            slice.forEach(t => {
                const td = document.createElement("td");
                td.innerHTML = `
                    <a href="GoToPlayer?track_id=${t.track_id}" class="track-link">
                      <div class="track-title">${t.title}</div>
                      ${ t.album.image
                    ? `<img src="uploads/${t.album.image}" alt="cover" class="track-image">`
                    : '' }
                    </a>`;
                row.appendChild(td);
            });

            // Abilita/disabilita i bottoni
            this.container.querySelector("#prevBtn").disabled = (blockIndex === 0);
            this.container.querySelector("#nextBtn").disabled = (blockIndex >= totalBlocks - 1);
        };
    }

    // --- PlaylistTable: lista delle playlist, click per dettaglio AJAX ---
    function PlaylistTable(tableElem, tbodyElem, msgElem, detailView) {
        this.table      = tableElem;
        this.tbody      = tbodyElem;
        this.msg        = msgElem;
        this.detailView = detailView;

        this.reset = () => {
            this.table.style.visibility = "hidden";
            this.msg.textContent = "";
        };

        this.show = () => {
            makeCall("GET", URL_PLAYLIST_LIST, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) {
                    const data = JSON.parse(req.responseText);
                    if (data.length === 0) {
                        this.msg.textContent = "No playlists available";
                        return;
                    }
                    this.update(data);
                }
                else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                }
                else {
                    this.msg.textContent = req.responseText;
                }
            });
        };

        this.update = (playlists) => {
            this.tbody.innerHTML = "";
            playlists.forEach(pl => {
                const tr = document.createElement("tr");

                // Titolo come link AJAX
                const tdTitle = document.createElement("td");
                const a = document.createElement("a");
                a.href = "#";
                a.textContent = pl.title;
                a.addEventListener("click", e => {
                    e.preventDefault();
                    this.detailView.load(pl.playlist_id);
                });
                tdTitle.appendChild(a);
                tr.appendChild(tdTitle);

                // Data creazione
                const tdDate = document.createElement("td");
                tdDate.textContent = new Date(pl.time)
                    .toLocaleString("it-IT", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                    });
                tr.appendChild(tdDate);

                this.tbody.appendChild(tr);
            });
            this.table.style.visibility = "visible";
        };
    }


    // --- AlbumCreator: intercetta il form /SaveAlbum ---
    function AlbumCreator(formElem) {
        this.form = formElem;
// Controllo dimensione immagine
        this.form.querySelector('input[name="image"]').addEventListener("change", e => {
            if (e.target.files[0]?.size > 5 * 1024 * 1024) {
                alert("La dimensione massima è 5MB");
                e.target.value = "";
            }
        });

        this.reset = () => this.form.reset();

        // FUNZIONE MODIFICATA (rimosso il popolamento della select)
        this.show = () => {}; // Non serve nessuna operazione aggiuntiva

        this.registerEvents = orchestrator => {
            this.form.addEventListener("submit", e => {
                e.preventDefault();
                makeCall("POST", URL_CREATE_ALBUM, this.form, req => {
                    if (req.readyState !== XMLHttpRequest.DONE) return;
                    if (req.status === 200) {
                        orchestrator.refresh();
                        alert("Album creato con successo!");
                    } else if (req.status === 403) {
                        window.location.href = req.getResponseHeader("Location");
                        sessionStorage.removeItem("username");
                    } else {
                        alert(req.responseText || "Errore sconosciuto");
                    }
                });
            }, false);
        };
    }


    // --- TrackUploader: intercetta il form /UploadTrack ---
    function TrackUploader(formElem, msgElem) {
        this.form = formElem;
        this.msg  = msgElem;

        // client‐side: max 10MB
        this.form.querySelector('input[name="audioFile"]').addEventListener("change", e => {
            if (e.target.files[0]?.size > 10 * 1024 * 1024) {
                alert("La dimensione massima è 10MB");
                e.target.value = "";
            }
        });

        this.reset = () => this.form.reset();

        this.show = () => {
            // 1) Popola gli album
            makeCall("GET", URL_ALBUM_LIST, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                const selAlbum = document.getElementById("albumSelect");
                selAlbum.innerHTML = "";
                if (req.status === 200) {
                    const albums = JSON.parse(req.responseText);
                    if (albums.length === 0) {
                        const o = document.createElement("option");
                        o.disabled = true; o.selected = true;
                        o.textContent = "Nessun album disponibile";
                        selAlbum.appendChild(o);
                    } else {
                        const placeholder = document.createElement("option");
                        placeholder.disabled = true; placeholder.selected = true;
                        placeholder.textContent = "-- Select album --";
                        selAlbum.appendChild(placeholder);
                        albums.forEach(a => {
                            const o = document.createElement("option");
                            o.value = a.albumId;
                            o.textContent = `${a.title} (${a.publicationYear})`;
                            selAlbum.appendChild(o);
                        });
                    }
                } else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                } else {
                    this.msg.textContent = req.responseText;
                }
            });

            // 2) Popola i generi
            makeCall("GET", URL_GENRE_LIST, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                const selGenre = document.getElementById("genreSelect");
                selGenre.innerHTML = "";
                if (req.status === 200) {
                    const genres = JSON.parse(req.responseText);
                    if (genres.length === 0) {
                        const o = document.createElement("option");
                        o.disabled = true; o.selected = true;
                        o.textContent = "Nessun genere disponibile";
                        selGenre.appendChild(o);
                    } else {
                        const placeholder = document.createElement("option");
                        placeholder.disabled = true; placeholder.selected = true;
                        placeholder.textContent = "-- Select genre --";
                        selGenre.appendChild(placeholder);
                        genres.forEach(g => {
                            const o = document.createElement("option");
                            o.value = g;
                            o.textContent = g;
                            selGenre.appendChild(o);
                        });
                    }
                } else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                } else {
                    this.msg.textContent = req.responseText;
                }
            });
        };

        this.registerEvents = orchestrator => {
            this.form.addEventListener("submit", e => {
                e.preventDefault();
                makeCall("POST", URL_UPLOAD_TRACK, this.form, req => {
                    if (req.readyState !== XMLHttpRequest.DONE) return;
                    if (req.status === 200)      orchestrator.refresh();
                    else if (req.status === 403) {
                        window.location.href = req.getResponseHeader("Location");
                        sessionStorage.removeItem("username");
                    }
                    else alert(req.responseText);
                });
            }, false);
        };
    }


    // --- PlaylistCreator: intercetta il form /SavePlaylist con i checkbox ---
    function PlaylistCreator(formElem) {
        this.form = formElem;
        this.group = formElem.querySelector(".checkbox-group");

        this.reset = () => {
            this.form.querySelector('input[name="title"]').value = "";
            this.group.innerHTML = "";
        };

        this.show = () => {
            makeCall("GET", URL_TRACK_LIST, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) {
                    const tracks = JSON.parse(req.responseText);
                    this.group.innerHTML = "";
                    if (tracks.length === 0) {
                        this.group.textContent = "No tracks available";
                    } else {
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

        this.registerEvents = orchestrator => {
            this.form.addEventListener("submit", e => {
                e.preventDefault();
                if (this.form.querySelectorAll('input[name="trackIds"]:checked').length === 0) {
                    alert("Seleziona almeno un brano");
                    return;
                }
                makeCall("POST", URL_SAVE_PLAYLIST, this.form, req => {
                    if (req.readyState !== XMLHttpRequest.DONE) return;
                    if (req.status === 200)      orchestrator.refresh();
                    else if (req.status === 403) {
                        window.location.href = req.getResponseHeader("Location");
                        sessionStorage.removeItem("username");
                    }
                    else alert(req.responseText);
                });
            }, false);
        };
    }


    // --- PageOrchestrator (HomePageManager) ---
    function HomePageManager(pt, pd, ac, tu, pc) {
        this.playlistTable   = pt;
        this.playlistDetail  = pd;
        this.albumCreator    = ac;
        this.trackUploader   = tu;
        this.playlistCreator = pc;
    }

    HomePageManager.prototype.start = function() {
        this.albumCreator.registerEvents(this);
        this.trackUploader.registerEvents(this);
        this.playlistCreator.registerEvents(this);
        this.playlistTable.show();
        document.querySelector("a.logout")
            .addEventListener("click", () => sessionStorage.removeItem("username"), false);
    };

    HomePageManager.prototype.refresh = function() {
        document.getElementById("messageContainer").textContent = "";
        this.playlistTable.reset();
        this.albumCreator.reset();
        this.trackUploader.reset();
        this.playlistCreator.reset();
        this.playlistTable.show();
        this.albumCreator.show();
        this.trackUploader.show();
        this.playlistCreator.show();
        this.playlistDetail.container.innerHTML = "";  // Pulisce il dettaglio
    };

    // --- Inizializzazione all’avvio della pagina ---
    window.addEventListener("load", () => {
        if (!sessionStorage.getItem("username")) {
            window.location.href = "loginPage.html";
            return;
        }

        const msg = document.getElementById("messageContainer");

        const detailView = new PlaylistDetailView(
            document.getElementById("playlistDetailContainer"),
            msg
        );
        detailView.init();

        const playlistTable = new PlaylistTable(
            document.getElementById("playlistTable"),
            document.getElementById("playlistTableBody"),
            msg,
            detailView
        );
        let albumCreator = new AlbumCreator(
            document.getElementById("albumForm")
        );
        const trackUploader = new TrackUploader(
            document.getElementById("trackForm"),
            msg
        );
        let playlistCreator = new PlaylistCreator(
            document.getElementById("playlistForm")
        );

        const manager = new HomePageManager(
            playlistTable,
            detailView,
            albumCreator,
            trackUploader,
            playlistCreator
        );
        manager.start();
        manager.refresh();
    }, false);

})();
