function PlaylistDetailView(containerElem, msgElem, playerView) {
    this.container = containerElem;
    this.msg = msgElem;
    this.player = playerView;
    this.tracks = [];
    this.blockSize = 5;
    this.currentBlock = 0;
    this.currentPlaylistId = null;

    const titleEl = containerElem.querySelector('#detailTitle');
    const prevBtn = containerElem.querySelector('#prevBtn');
    const nextBtn = containerElem.querySelector('#nextBtn');
    const rowEl = containerElem.querySelector('#detailRow');
    const addForm = containerElem.querySelector('#addTracksForm');
    const availWrap = containerElem.querySelector('#availableTracksGroup');
    const addBtn = containerElem.querySelector('#addTracksBtn');

    // inizializzo gli eventi e nascondo la vista
    this.init = () => {
        containerElem.hidden = true;
        // navigazione tra blocchi
        prevBtn.addEventListener('click', () =>
            this.renderBlock(this.currentBlock - 1)
        );
        nextBtn.addEventListener('click', () =>
            this.renderBlock(this.currentBlock + 1)
        );
        // submit per aggiungere tracce
        addForm.addEventListener('submit', this.handleAddTracks.bind(this));
        // chiusura della vista
        containerElem.querySelector('#closeBtn')
            .addEventListener('click', () => {
                containerElem.hidden = true;
                this.msg.textContent = '';
            });
        // se cambiano i brani utente, aggiorno il form di "add"
        document.addEventListener('userTracksChanged', () => {
            if (!containerElem.hidden) {
                this.refreshAvailableTracks();
            }
        });
    };

    // carico i dati della playlist e preparo tutto
    this.load = playlistId => {
        this.currentPlaylistId = playlistId;
        this.msg.textContent = '';
        // nascondo il player se aperto
        const playerContainer = document.getElementById('playerContainer');
        if (playerContainer) {
            playerContainer.hidden = true;
            const audio = playerContainer.querySelector('#playerAudio');
            if (audio) {
                audio.pause();
                audio.src = '';
            }
        }
        // prendo i brani della playlist
        makeCall('GET', `GetPlaylistData?playlist_id=${playlistId}`, null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                const resp = JSON.parse(req.responseText);
                this.tracks = resp.tracks;
                this.currentBlock = 0;
                // titolo e mostra vista
                titleEl.textContent = resp.playlist.title;
                containerElem.hidden = false;
                this.renderBlock(0);
                // carico anche i brani disponibili per l'aggiunta
                makeCall('GET', 'GetUserTracksData', null, req2 => {
                    if (req2.readyState === XMLHttpRequest.DONE && req2.status === 200) {
                        const allTracks = JSON.parse(req2.responseText);
                        const available = allTracks.filter(t =>
                            !this.tracks.some(pt => pt.track_id === t.track_id)
                        );
                        this.renderAvailableTracks(available);
                    }
                });
            } else redirectToErrorPage(req);
        });
    };

    // mostra un blocco di brani (pagine da 5)
    this.renderBlock = blockIdx => {
        const total = Math.ceil(this.tracks.length / this.blockSize);
        if (blockIdx < 0 || blockIdx >= total) return;
        this.currentBlock = blockIdx;
        rowEl.textContent = ''; // pulisco le celle
        const tpl = document.getElementById('trackCellTpl');
        // prendo il sotto-array dei brani da mostrare
        this.tracks
            .slice(blockIdx * this.blockSize, (blockIdx + 1) * this.blockSize)
            .forEach(t => {
                const cell = tpl.content.cloneNode(true);
                const link = cell.querySelector('a.track-link');
                const img = cell.querySelector('img.track-image');
                // setto dati e testo
                link.dataset.trackId = t.track_id;
                cell.querySelector('.track-title').textContent = t.title;
                // cover se presente
                if (t.album.image) {
                    img.src = `uploads/${t.album.image}`;
                } else {
                    img.remove();
                }
                rowEl.appendChild(cell);
            });
        // click sui titoli per far partire il player
        rowEl.querySelectorAll('a.track-link').forEach(a =>
            a.addEventListener('click', e => {
                e.preventDefault();
                this.player.load(a.dataset.trackId);
            })
        );
        // mostro/nascondo bottoni avanti/indietro
        prevBtn.hidden = blockIdx === 0;
        nextBtn.hidden = blockIdx === total - 1;
    };

    // riempio il form di aggiunta con le tracce disponibili
    this.renderAvailableTracks = tracks => {
        availWrap.textContent = '';
        const tpl = document.getElementById('checkboxTpl');
        if (tracks.length === 0) {
            availWrap.innerHTML = '<div class="no-tracks">Nessun brano da aggiungere</div>';
            addBtn.disabled = true;
            return;
        }
        tracks.forEach(t => {
            const node = tpl.content.cloneNode(true);
            const cb = node.querySelector('input[type="checkbox"]');
            const lbl = node.querySelector('label');
            cb.id = `add_track_${t.track_id}`;
            cb.name = 'trackIds[]';
            cb.value = t.track_id;
            lbl.htmlFor = cb.id;
            lbl.textContent = `${t.title} (${t.album.performer} – ${t.album.publicationYear})`;
            availWrap.appendChild(node);
        });
        addBtn.disabled = false;
    };

    // gestisco il submit per aggiungere tracce
    this.handleAddTracks = e => {
        e.preventDefault();
        const selected = addForm.querySelectorAll('input[name="trackIds[]"]:checked');
        if (selected.length === 0) {
            alert('Seleziona almeno un brano da aggiungere');
            return;
        }
        // metto l'id della playlist nel form
        const idField = document.createElement('input');
        idField.type = 'hidden';
        idField.name = 'playlist_id';
        idField.value = this.currentPlaylistId;
        addForm.appendChild(idField);
        // invio i dati
        makeCall('POST', 'AddTracksToPlaylist', addForm, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                this.load(this.currentPlaylistId); // ricarico tutto
                this.msg.textContent = 'Tracce aggiunte!';
            } else redirectToErrorPage(req);
        });
        // tolgo il campo temporaneo
        addForm.removeChild(idField);
    };

    // aggiorno il form "add" se cambiano i brani utente
    this.refreshAvailableTracks = () => {
        makeCall('GET', 'GetUserTracksData', null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                const allTracks = JSON.parse(req.responseText);
                const available = allTracks.filter(t =>
                    !this.tracks.some(pt => pt.track_id === t.track_id)
                );
                this.renderAvailableTracks(available);
            }
        });
    };
}
