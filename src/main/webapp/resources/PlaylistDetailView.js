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

    this.init = () => {
        containerElem.hidden = true;

        prevBtn.addEventListener('click', () =>
            this.renderBlock(this.currentBlock - 1)
        );
        nextBtn.addEventListener('click', () =>
            this.renderBlock(this.currentBlock + 1)
        );
        addForm.addEventListener('submit', this.handleAddTracks.bind(this));

        containerElem.querySelector('#closeBtn')
            .addEventListener('click', () => {
                containerElem.hidden = true;
                this.msg.textContent = '';
            });
    };

    this.load = playlistId => {
        this.currentPlaylistId = playlistId;
        this.msg.textContent = '';

        const playerContainer = document.getElementById('playerContainer');
        if (playerContainer) {
            playerContainer.hidden = true;       // basta questo
            const audio = playerContainer.querySelector('#playerAudio');
            if (audio) {
                audio.pause();
                audio.src = '';
            }
        }

        makeCall('GET', `GetPlaylistData?playlist_id=${playlistId}`, null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                const resp = JSON.parse(req.responseText);
                this.tracks = resp.tracks;
                this.currentBlock = 0;

                titleEl.textContent = resp.playlist.title;
                containerElem.hidden = false;
                this.renderBlock(0);

                /* carica le tracce dell’utente per il form “add” */
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

    this.renderBlock = blockIdx => {
        const total = Math.ceil(this.tracks.length / this.blockSize);
        if (blockIdx < 0 || blockIdx >= total) return;
        this.currentBlock = blockIdx;

        rowEl.textContent = '';                                  // pulisci
        const tpl = document.getElementById('trackCellTpl');

        this.tracks
            .slice(blockIdx * this.blockSize, (blockIdx + 1) * this.blockSize)
            .forEach(t => {
                const cell = tpl.content.cloneNode(true);
                const link = cell.querySelector('a.track-link');
                const img = cell.querySelector('img.track-image');

                link.dataset.trackId = t.track_id;
                cell.querySelector('.track-title').textContent = t.title;

                if (t.album.image) {
                    img.src = `uploads/${t.album.image}`;
                } else {
                    img.remove();                                      // nessuna cover
                }
                rowEl.appendChild(cell);
            });

        rowEl.querySelectorAll('a.track-link').forEach(a =>
            a.addEventListener('click', e => {
                e.preventDefault();
                this.player.load(a.dataset.trackId);
            })
        );

        prevBtn.hidden = blockIdx === 0;
        nextBtn.hidden = blockIdx === total - 1;
    };

    this.renderAvailableTracks = tracks => {
        availWrap.textContent = '';
        const tpl = document.getElementById('checkboxTpl');

        if (tracks.length === 0) {
            availWrap.innerHTML = '<div class="no-tracks">No tracks available to add</div>';
            addBtn.disabled = true;
            return;
        }

        tracks.forEach(t => {
            const node = tpl.content.cloneNode(true);
            const input = node.querySelector('input[type="checkbox"]');
            const label = node.querySelector('label');

            input.id = `track_${t.track_id}`;
            input.name = 'trackIds[]';
            input.value = t.track_id;

            label.htmlFor = input.id;
            label.textContent = `${t.title} (${t.album.performer} – ${t.album.publicationYear})`;

            availWrap.appendChild(node);
        });
        addBtn.disabled = false;
    };

    this.handleAddTracks = e => {
        e.preventDefault();
        const selected = addForm.querySelectorAll('input[name="trackIds[]"]:checked');
        if (selected.length === 0) {
            alert('Select at least one track to add');
            return;
        }

        const idField = document.createElement('input');
        idField.type = 'hidden';
        idField.name = 'playlist_id';
        idField.value = this.currentPlaylistId;
        addForm.appendChild(idField);

        makeCall('POST', 'AddTracksToPlaylist', addForm, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                this.load(this.currentPlaylistId);                   // ricarica
                this.msg.textContent = 'Tracks added successfully!';
            } else redirectToErrorPage(req);
        });

        addForm.removeChild(idField);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const detailView = new PlaylistDetailView(
        document.getElementById('playlistDetailContainer'),
        document.getElementById('messageContainer'),
        new PlayerView(document.getElementById('playerContainer'))
    );
    detailView.init();   // ← fondamentale
});

