function PlayerView(containerElem, msgElem) {
    this.container = containerElem; // div del player
    this.msg = msgElem || {textContent: ''};
    const titleEl = containerElem.querySelector('#playerTitle');
    const coverEl = containerElem.querySelector('#playerCover');
    const perfEl = containerElem.querySelector('#playerPerformer');
    const albumEl = containerElem.querySelector('#playerAlbum');
    const genreEl = containerElem.querySelector('#playerGenre');
    const audioEl = containerElem.querySelector('#playerAudio');
    const closeBtn = containerElem.querySelector('#closePlayer');

    // quando clicco close nascondo tutto il player
    closeBtn.addEventListener('click', () => {
        containerElem.hidden = true;
    });

    // metodo per caricare un brano (passo l'id della track)
    this.load = track_id => {
        this.msg.textContent = ''; // pulisco eventuali messaggi

        // chiamo il server per prendere i dati del brano
        makeCall('GET', `GetTrackData?track_id=${track_id}`, null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return; // aspetto che finisce

            if (req.status === 200) {
                const track = JSON.parse(req.responseText); // converto in oggetto JS

                // riempio i campi del player con i dati ricevuti
                titleEl.textContent = track.title;
                perfEl.textContent = track.album.performer;
                albumEl.textContent = `${track.album.title} (${track.album.publicationYear})`;
                genreEl.textContent = track.genre_name;
                audioEl.src = `uploads/${track.file_path}`;

                // se c'è la cover la mostro, altrimenti la nascondo
                if (track.album.image) {
                    coverEl.src = `uploads/${track.album.image}`;
                    coverEl.hidden = false;
                } else {
                    coverEl.hidden = true;
                }

                // una volta pronti, mostro il player
                containerElem.hidden = false;
            } else {
                // se errore vado alla pagina di errore
                redirectToErrorPage(req);
            }
        });
    };
}
