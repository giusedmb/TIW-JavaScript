function PlayerView(containerElem, msgElem) {
    this.container = containerElem;
    this.msg = msgElem;
    this.load = function (track_id) {
        this.msg.textContent = "";
        makeCall("GET", `GetTrackData?track_id=${track_id}`, null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                const track = JSON.parse(req.responseText);
                this.container.innerHTML = `
                <div class="player-header">
                    <h2>${track.title}</h2>
                    <button id="closePlayer">Chiudi</button>
                </div>
                <div class="player-content">
                    <div class="album-cover">
                        ${track.album.image
                    ? `<img src="uploads/${track.album.image}" alt="Album cover" style="width: 300px; height: auto;"/>`
                    : ''}
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
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>
                </div>`;
                this.container.style.display = 'block';
                this.container.querySelector('#closePlayer')
                    .addEventListener('click', () => this.container.style.display = 'none');
            } else redirectToErrorPage(req);
        });
    };
}
