(function () {
    const URL_PLAYLIST_LIST = "GetUserPlaylistsData";
    const URL_PLAYLIST_DATA = "GetPlaylistData";
    const URL_ALBUM_LIST = "GetAlbumData";
    const URL_TRACK_LIST = "GetUserTracksData";
    const URL_CREATE_ALBUM = "SaveAlbum";
    const URL_UPLOAD_TRACK = "UploadTrack";
    const URL_SAVE_PLAYLIST = "SavePlaylist";
    const URL_GENRE_LIST = "GetGenresData";
    const URL_TRACK_DATA = "GetTrackData";
    const URL_ADD_TRACKS_TO_PLAYLIST = "AddTracksToPlaylist";
    const URL_SAVE_ORDER = "SavePlaylistOrder";

    // -------------------
    // INIEZIONE MODALE RIORDINO
    // -------------------
    const modalHTML = `
      <div id="modalOverlay" style="
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.5);display:none;z-index:1000;">
      </div>
      <div id="reorderModal" style="
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:#fff;padding:1em;display:none;z-index:1001;
            max-height:80%;overflow:auto;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.3);">
        <h2>Riordino Playlist</h2>
        <ul id="reorderList" style="list-style:none;padding:0;margin:0;"></ul>
        <div style="margin-top:1em;text-align:right;">
          <button id="cancelReorderBtn" style="margin-right:0.5em;">Annulla</button>
          <button id="saveReorderBtn">Salva ordinamento</button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // -------------------
    // FUNZIONI DRAG & DROP
    // -------------------
    let dragSrcEl = null;
    function handleDragStart(e) {
        dragSrcEl = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', null);
    }
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    function handleDrop(e) {
        e.stopPropagation();
        if (dragSrcEl !== e.target && e.target.tagName === 'LI') {
            // inserisce il dragged item prima di quello su cui droppa
            const list = e.target.parentNode;
            list.insertBefore(dragSrcEl, e.target.nextSibling);
        }
        return false;
    }

    // -------------------
    // APRI / CHIUDI MODALE
    // -------------------
    function openReorderModal(playlistId) {
        const overlay = document.getElementById("modalOverlay");
        const modal = document.getElementById("reorderModal");
        const list = document.getElementById("reorderList");
        overlay.style.display = 'block';
        modal.style.display = 'block';
        list.innerHTML = '';

        // carica tutte le tracce della playlist
        console.log("openReorderModal:", { URL_PLAYLIST_DATA, playlistId });
        makeCall("GET", `${URL_PLAYLIST_DATA}?playlist_id=${playlistId}`, null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                const resp = JSON.parse(req.responseText);
                resp.tracks.forEach(t => {
                    const li = document.createElement("li");
                    li.textContent = t.title;
                    li.setAttribute("draggable", "true");
                    li.dataset.trackId = t.track_id;
                    li.style.padding = '0.5em';
                    li.style.border = '1px solid #ccc';
                    li.style.marginBottom = '0.2em';
                    li.style.cursor = 'move';
                    li.addEventListener("dragstart", handleDragStart);
                    li.addEventListener("dragover", handleDragOver);
                    li.addEventListener("drop", handleDrop);
                    list.appendChild(li);
                });
                modal.dataset.playlistId = playlistId;
            } else if (req.status === 403) {
                window.location.href = req.getResponseHeader("Location");
                sessionStorage.removeItem("username");
            } else {
                alert(req.responseText || "Errore nel caricamento delle tracce");
                closeReorderModal();
            }
        });
    }
    function closeReorderModal() {
        document.getElementById("modalOverlay").style.display = 'none';
        document.getElementById("reorderModal").style.display = 'none';
    }

    // salva l’ordinamento PERSONALIZZATO sul server
    // Salva l’ordinamento PERSONALIZZATO
    document.getElementById("saveReorderBtn").addEventListener("click", function () {
        const modal = document.getElementById("reorderModal");
        const playlistId = modal.dataset.playlistId;
        const items = Array.from(document.querySelectorAll("#reorderList li"));
        if (items.length === 0) {
            alert("Nessuna traccia da salvare");
            return;
        }

        // Creo un form HTML "fittizio" con gli input nascosti
        const tempForm = document.createElement("form");

        // input per playlist_id
        const inputPlaylist = document.createElement("input");
        inputPlaylist.type = "hidden";
        inputPlaylist.name = "playlist_id";
        inputPlaylist.value = playlistId;
        tempForm.appendChild(inputPlaylist);

        // input per ogni trackIds[]
        items.forEach(li => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "trackIds[]";
            input.value = li.dataset.trackId;
            tempForm.appendChild(input);
        });

        // Chiamo makeCall passandogli il form vero
        makeCall("POST", URL_SAVE_ORDER, tempForm, function (req) {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                closeReorderModal();
                alert("Ordinamento salvato con successo!");
            } else if (req.status === 403) {
                window.location.href = req.getResponseHeader("Location");
                sessionStorage.removeItem("username");
            } else {
                alert(req.responseText || "Errore durante il salvataggio");
            }
        });
    });

    document.getElementById("cancelReorderBtn").addEventListener("click", closeReorderModal);
    document.getElementById("modalOverlay").addEventListener("click", closeReorderModal);

    function PlaylistDetailView(containerElem, msgElem, playerView) {
        this.container = containerElem;
        this.msg = msgElem;
        this.playerView = playerView;
        this.tracks = [];
        this.currentBlock = 0;
        this.blockSize = 5;
        this.currentPlaylistId = null;
        this.addTracksForm = null;

        this.init = () => {
            this.container.innerHTML = `
                <h2 id="detailTitle"></h2>
                <div class="playlist-navigation">
                    <div class="nav-button prev-button">
                        <button id="prevBtn">PRECEDENTI</button>
                    </div>
                    <div class="tracks-container">
                        <table id="detailTable">
                            <tr id="detailRow"></tr>
                        </table>
                    </div>
                    <div class="nav-button next-button">
                        <button id="nextBtn">SUCCESSIVI</button>
                    </div>
                </div>
                <div class="add-tracks-form">
                    <h3>Aggiungi tracce alla playlist</h3>
                    <form id="addTracksForm">
                        <div class="checkbox-group" id="availableTracksGroup"></div>
                        <button type="submit" id="addTracksBtn">Aggiungi tracce selezionate</button>
                    </form>
                </div>
            `;

            this.addTracksForm = this.container.querySelector('#addTracksForm');
            this.container.querySelector("#prevBtn")
                .addEventListener("click", () => this.renderBlock(this.currentBlock - 1));
            this.container.querySelector("#nextBtn")
                .addEventListener("click", () => this.renderBlock(this.currentBlock + 1));

            // ora colleghiamo un unico handler
            this.addTracksForm.addEventListener('submit', this.handleAddTracks.bind(this));
        };

        this.load = (playlist_id) => {
            this.currentPlaylistId = playlist_id;
            this.msg.textContent = "";

            // Chiudi il player se aperto
            const playerContainer = document.getElementById('playerContainer');
            if (playerContainer) {
                playerContainer.style.display = 'none';
                playerContainer.innerHTML = '';
            }

            makeCall("GET", `GetPlaylistData?playlist_id=${playlist_id}`, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) {
                    const resp = JSON.parse(req.responseText);
                    this.tracks = resp.tracks;
                    this.currentBlock = 0;
                    this.container.style.display = "block";
                    this.container.querySelector("#detailTitle").textContent = resp.playlist.title;
                    this.renderBlock(0);

                    // Carica tracce disponibili
                    makeCall("GET", "GetUserTracksData", null, req2 => {
                        if (req2.readyState === XMLHttpRequest.DONE && req2.status === 200) {
                            const allTracks = JSON.parse(req2.responseText);
                            const availableTracks = allTracks.filter(t =>
                                !this.tracks.some(pt => pt.track_id === t.track_id)
                            );
                            this.renderAvailableTracks(availableTracks);
                        }
                    });
                } else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                } else {
                    this.msg.textContent = req.responseText;
                }
            });
        };


        this.renderBlock = (blockIndex) => {
            const totalBlocks = Math.ceil(this.tracks.length / this.blockSize);
            if (blockIndex < 0 || blockIndex >= totalBlocks) return;
            this.currentBlock = blockIndex;
            const slice = this.tracks.slice(blockIndex * this.blockSize, (blockIndex + 1) * this.blockSize);
            const row = this.container.querySelector("#detailRow");
            row.innerHTML = "";

            slice.forEach(t => {
                const td = document.createElement("td");
                td.innerHTML = `
                    <a href="#" class="track-link" data-track-id="${t.track_id}">
                        <div class="track-title">${t.title}</div>
                        ${t.album.image ?
                    `<img src="uploads/${t.album.image}" alt="cover" class="track-image">` : ''}
                    </a>
                `;
                row.appendChild(td);
            });

            this.container.querySelectorAll('a.track-link')
                .forEach(a => a.addEventListener('click', e => {
                    e.preventDefault();
                    this.playerView.load(a.dataset.trackId);
                }));

            const prevContainer = this.container.querySelector(".prev-button");
            const nextContainer = this.container.querySelector(".next-button");

            if (totalBlocks <= 1) {
                prevContainer.style.display = "none";
                nextContainer.style.display = "none";
            } else {
                prevContainer.style.display = (blockIndex > 0) ? "block" : "none";
                nextContainer.style.display = (blockIndex < totalBlocks - 1) ? "block" : "none";
            }
        };

        this.renderAvailableTracks = (availableTracks) => {
            const group = this.container.querySelector('#availableTracksGroup');
            const button = this.container.querySelector('#addTracksBtn');
            group.innerHTML = '';

            if (availableTracks.length === 0) {
                group.innerHTML = '<div class="no-tracks">Nessuna traccia disponibile da aggiungere</div>';
                button.disabled = true;
                return;
            }

            availableTracks.forEach(track => {
                const div = document.createElement('div');
                div.className = 'checkbox-item';
                div.innerHTML = `
                    <input type="checkbox" 
                           id="track_${track.track_id}" 
                           name="trackIds[]" 
                           value="${track.track_id}">
                    <label for="track_${track.track_id}">
                        ${track.title} (${track.album.performer} - ${track.album.publicationYear})
                    </label>
                `;
                group.appendChild(div);
            });

            button.disabled = false;
        };

        this.handleAddTracks = (e) => {
            e.preventDefault();
            const form = e.target;
            const selected = form.querySelectorAll('input[name="trackIds[]"]:checked');

            if (selected.length === 0) {
                alert("Seleziona almeno un brano da aggiungere");
                return;
            }

            // Aggiungo nascosto playlist_id
            const playlistIdInput = document.createElement('input');
            playlistIdInput.type = 'hidden';
            playlistIdInput.name = 'playlist_id';
            playlistIdInput.value = this.currentPlaylistId;
            form.appendChild(playlistIdInput);

            // PASSIAMO IL FORM, non FormData
            makeCall("POST", URL_ADD_TRACKS_TO_PLAYLIST, form, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) {
                    this.tracks = [];
                    this.currentBlock = 0;
                    this.load(this.currentPlaylistId);
                    this.msg.textContent = "Tracce aggiunte con successo!";
                } else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                } else {
                    alert(req.responseText || "Errore sconosciuto");
                }
            });

            // Rimuovo l’input nascosto
            form.removeChild(playlistIdInput);
        };


    }

    function PlayerView(containerElem, msgElem) {
        this.container = containerElem;
        this.msg = msgElem;

        // Load track metadata and audio URL via AJAX
        this.load = (track_id) => {
            this.msg.textContent = "";
            makeCall("GET", `${URL_TRACK_DATA}?track_id=${track_id}`, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) {
                    const track = JSON.parse(req.responseText);
                    // Build player UI
                    this.container.innerHTML = `
                    <div class="player-header">
                        <h2>${track.title}</h2>
                        <button id="closePlayer">Chiudi</button>
                    </div>
                    <div class="player-content">
                        <div class="album-cover" >
                            ${track.album.image
                        ? `<img src="uploads/${track.album.image}" alt="Album cover"/>` : ''}
                        </div>
                        <div class="track-info">
                            <dl class="info-list">
                                <dt>Performer:</dt><dd>${track.album.performer}</dd>
                                <dt>Album:</dt><dd>${track.album.title} (${track.album.publicationYear})</dd>
                                <dt>Genre:</dt><dd>${track.genre_name}</dd>
                            </dl>
                            <div class="audio-player">
                                <audio controls>
                                    <source src="uploads/${track.file_path}" type="audio/mpeg"/>
                                    Il tuo browser non supporta l'elemento audio.
                                </audio>
                            </div>
                        </div>
                    </div>
                `;
                    // Mostra solo il player, senza nascondere la lista tracce
                    this.container.style.display = 'block';

                    // Close button: chiudi solo il player
                    this.container.querySelector('#closePlayer')
                        .addEventListener('click', () => {
                            this.container.style.display = 'none';
                        });
                } else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                } else {
                    this.msg.textContent = req.responseText;
                }
            });
        };
    }

    function PlaylistTable(tableElem, tbodyElem, msgElem, detailView) {
        this.table = tableElem;
        this.tbody = tbodyElem;
        this.msg = msgElem;
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
                } else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                } else {
                    this.msg.textContent = req.responseText;
                }
            });
        };

        this.update = (playlists) => {
            this.tbody.innerHTML = "";
            playlists.forEach(pl => {
                const tr = document.createElement("tr");

                // Titolo (click apre detailView)
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

                // Pulsante RIORDINO
                const tdReorder = document.createElement("td");
                const reorderBtn = document.createElement("button");
                reorderBtn.textContent = "Riordino";
                reorderBtn.addEventListener("click", () => openReorderModal(pl.playlist_id));
                tdReorder.appendChild(reorderBtn);
                tr.appendChild(tdReorder);

                this.tbody.appendChild(tr);
            });
            this.table.style.visibility = "visible";
        };
    }

    function AlbumCreator(formElem) {
        this.form = formElem;
        this.form.querySelector('input[name="image"]').addEventListener("change", e => {
            if (e.target.files[0]?.size > 5 * 1024 * 1024) {
                alert("La dimensione massima è 5MB");
                e.target.value = "";
            }
        });
        this.reset = () => this.form.reset();
        this.show = () => {
        }; // Nessuna operazione aggiuntiva
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

    function TrackUploader(formElem, msgElem) {
        this.form = formElem;
        this.msg = msgElem;
        this.form.querySelector('input[name="audioFile"]').addEventListener("change", e => {
            if (e.target.files[0]?.size > 10 * 1024 * 1024) {
                alert("La dimensione massima è 10MB");
                e.target.value = "";
            }
        });
        this.reset = () => this.form.reset();

        this.show = () => {
            // Popola gli album
            makeCall("GET", URL_ALBUM_LIST, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                const selAlbum = document.getElementById("albumSelect");
                selAlbum.innerHTML = "";
                if (req.status === 200) {
                    const albums = JSON.parse(req.responseText);
                    if (albums.length === 0) {
                        const o = document.createElement("option");
                        o.disabled = true;
                        o.selected = true;
                        o.textContent = "Nessun album disponibile";
                        selAlbum.appendChild(o);
                    } else {
                        const placeholder = document.createElement("option");
                        placeholder.disabled = true;
                        placeholder.selected = true;
                        placeholder.textContent = "-- Select album --";
                        selAlbum.appendChild(placeholder);
                        albums.forEach(a => {
                            const o = document.createElement("option");
                            o.value = a.albumId;
                            o.textContent = `${a.title} (${a.publicationYear})`;
                            selAlbum.appendChild(o);
                        });
                        // Chiudi il player se selezioni un altro album
                        selAlbum.addEventListener('change', () => {
                            const player = document.getElementById('playerContainer');
                            if (player) {
                                player.style.display = 'none';
                                player.innerHTML = '';
                            }
                            const detail = document.getElementById('playlistDetailContainer');
                            if (detail) detail.style.display = 'block';
                        });
                    }
                } else if (req.status === 403) {
                    window.location.href = req.getResponseHeader("Location");
                    sessionStorage.removeItem("username");
                } else {
                    this.msg.textContent = req.responseText;
                }
            });

            // Popola i generi
            makeCall("GET", URL_GENRE_LIST, null, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                const selGenre = document.getElementById("genreSelect");
                selGenre.innerHTML = "";
                if (req.status === 200) {
                    const genres = JSON.parse(req.responseText);
                    if (genres.length === 0) {
                        const o = document.createElement("option");
                        o.disabled = true;
                        o.selected = true;
                        o.textContent = "Nessun genere disponibile";
                        selGenre.appendChild(o);
                    } else {
                        const placeholder = document.createElement("option");
                        placeholder.disabled = true;
                        placeholder.selected = true;
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
                    if (req.status === 200) orchestrator.refresh();
                    else if (req.status === 403) {
                        window.location.href = req.getResponseHeader("Location");
                        sessionStorage.removeItem("username");
                    } else alert(req.responseText);
                });
            }, false);
        };
    }

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
                    if (req.status === 200) orchestrator.refresh();
                    else if (req.status === 403) {
                        window.location.href = req.getResponseHeader("Location");
                        sessionStorage.removeItem("username");
                    } else alert(req.responseText);
                });
            }, false);
        };
    }

    function HomePageManager(pt, pd, ac, tu, pc) {
        this.playlistTable = pt;
        this.playlistDetail = pd;
        this.albumCreator = ac;
        this.trackUploader = tu;
        this.playlistCreator = pc;
    }

    HomePageManager.prototype.start = function () {
        this.albumCreator.registerEvents(this);
        this.trackUploader.registerEvents(this);
        this.playlistCreator.registerEvents(this);
        this.playlistTable.show();
        document.querySelector("a.logout")
            .addEventListener("click", () => sessionStorage.removeItem("username"), false);
    };

    HomePageManager.prototype.refresh = function () {
        document.getElementById("messageContainer").textContent = "";
        this.playlistTable.reset();
        this.albumCreator.reset();
        this.trackUploader.reset();
        this.playlistCreator.reset();
        this.playlistTable.show();
        this.albumCreator.show();
        this.trackUploader.show();
        this.playlistCreator.show();
        this.playlistDetail.container.style.display = "none";
    };

    window.addEventListener("load", () => {
        if (!sessionStorage.getItem("username")) {
            window.location.href = "loginPage.html";
            return;
        }

        const msg = document.getElementById("messageContainer");

        const playerView = new PlayerView(
            document.getElementById("playerContainer"), msg
        );

        const detailView = new PlaylistDetailView(
            document.getElementById("playlistDetailContainer"),
            msg, playerView
        );
        detailView.init();

        const playlistTable = new PlaylistTable(
            document.getElementById("playlistTable"),
            document.getElementById("playlistTableBody"),
            msg,
            detailView
        );

        const albumCreator = new AlbumCreator(
            document.getElementById("albumForm")
        );

        const trackUploader = new TrackUploader(
            document.getElementById("trackForm"),
            msg
        );

        const playlistCreator = new PlaylistCreator(
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
