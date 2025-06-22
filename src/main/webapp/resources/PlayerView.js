function PlayerView(containerElem, msgElem) {
    this.container = containerElem;
    this.msg = msgElem || {textContent: ''};
    const titleEl = containerElem.querySelector('#playerTitle');
    const coverEl = containerElem.querySelector('#playerCover');
    const perfEl = containerElem.querySelector('#playerPerformer');
    const albumEl = containerElem.querySelector('#playerAlbum');
    const genreEl = containerElem.querySelector('#playerGenre');
    const audioEl = containerElem.querySelector('#playerAudio');
    const closeBtn = containerElem.querySelector('#closePlayer');
    closeBtn.addEventListener('click', () => (containerElem.hidden = true));

    this.load = track_id => {
        this.msg.textContent = '';

        makeCall('GET', `GetTrackData?track_id=${track_id}`, null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;

            if (req.status === 200) {
                const track = JSON.parse(req.responseText);
                titleEl.textContent = track.title;
                perfEl.textContent = track.album.performer;
                albumEl.textContent = `${track.album.title} (${track.album.publicationYear})`;
                genreEl.textContent = track.genre_name;
                audioEl.src = `uploads/${track.file_path}`;
                if (track.album.image) {
                    coverEl.src = `uploads/${track.album.image}`;
                    coverEl.hidden = false;
                } else {
                    coverEl.hidden = true;
                }

                containerElem.hidden = false;
            } else {
                redirectToErrorPage(req);
            }
        });
    };
}
