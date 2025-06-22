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
            <div class="detail-header">
                <h2 id="detailTitle"></h2>
                <button id="closeBtn" class="close-button">Close</button>
            </div>

            <div class="playlist-navigation">
                <div class="nav-button prev-button"><button id="prevBtn">PREVIOUS</button></div>

                <div class="tracks-container">
                    <table id="detailTable"><tr id="detailRow"></tr></table>
                </div>

                <div class="nav-button next-button"><button id="nextBtn">NEXT</button></div>
            </div>

            <div class="add-tracks-form">
                <h3>Add tracks to playlist</h3>
                <form id="addTracksForm">
                    <div class="checkbox-group" id="availableTracksGroup"></div>
                    <button type="submit" id="addTracksBtn">Add selected tracks</button>
                </form>
            </div>`;

        this.container.style.display = 'none';

        this.container.querySelector("#prevBtn")
            .addEventListener("click", () => this.renderBlock(this.currentBlock - 1));
        this.container.querySelector("#nextBtn")
            .addEventListener("click", () => this.renderBlock(this.currentBlock + 1));

        this.addTracksForm = this.container.querySelector('#addTracksForm');
        this.addTracksForm.addEventListener('submit', this.handleAddTracks.bind(this));

        this.container.querySelector("#closeBtn")
            .addEventListener("click", () => {
                this.container.style.display = 'none';
                this.msg.textContent = '';
            });
    };

    this.load = playlist_id => {
        this.currentPlaylistId = playlist_id;
        this.msg.textContent = "";

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
                makeCall("GET", "GetUserTracksData", null, req2 => {
                    if (req2.readyState === XMLHttpRequest.DONE && req2.status === 200) {
                        const allTracks = JSON.parse(req2.responseText);
                        const availableTracks = allTracks.filter(t =>
                            !this.tracks.some(pt => pt.track_id === t.track_id)
                        );
                        this.renderAvailableTracks(availableTracks);
                    }
                });
            } else redirectToErrorPage(req);
        });
    };

    this.renderBlock = blockIndex => {
        const totalBlocks = Math.ceil(this.tracks.length / this.blockSize);
        if (blockIndex < 0 || blockIndex >= totalBlocks) return;
        this.currentBlock = blockIndex;

        const slice = this.tracks.slice(blockIndex * this.blockSize,
            (blockIndex + 1) * this.blockSize);

        const row = this.container.querySelector("#detailRow");
        row.innerHTML = "";

        slice.forEach(t => {
            const td = document.createElement("td");
            td.innerHTML = `
                <a href="#" class="track-link" data-track-id="${t.track_id}">
                    <div class="track-title">${t.title}</div>
                    ${t.album.image
                ? `<img src="uploads/${t.album.image}" 
                                alt="cover" class="track-image"
                                style="width: 300px; height: auto;">`
                : ''}
                </a>`;
            row.appendChild(td);
        });

        this.container.querySelectorAll('a.track-link').forEach(a =>
            a.addEventListener('click', e => {
                e.preventDefault();
                this.playerView.load(a.dataset.trackId);
            })
        );

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

    this.renderAvailableTracks = availableTracks => {
        const group  = this.container.querySelector('#availableTracksGroup');
        const button = this.container.querySelector('#addTracksBtn');
        group.innerHTML = '';

        if (availableTracks.length === 0) {
            group.innerHTML = '<div class="no-tracks">No tracks available to add</div>';
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
                </label>`;
            group.appendChild(div);
        });
        button.disabled = false;
    };

    this.handleAddTracks = e => {
        e.preventDefault();
        const form = e.target;
        const selected = form.querySelectorAll('input[name="trackIds[]"]:checked');
        if (selected.length === 0) {
            alert("Select at least one track to add");
            return;
        }

        const playlistIdInput = document.createElement('input');
        playlistIdInput.type = 'hidden';
        playlistIdInput.name = 'playlist_id';
        playlistIdInput.value = this.currentPlaylistId;
        form.appendChild(playlistIdInput);

        makeCall("POST", "AddTracksToPlaylist", form, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                /* ricarica la playlist dalla prima pagina */
                this.load(this.currentPlaylistId);
                this.msg.textContent = "Tracks added successfully!";
            } else redirectToErrorPage(req);
        });

        form.removeChild(playlistIdInput);
    };
}
