function TrackUploader(formElem, msgElem) {
    this.form = formElem;
    this.msg = msgElem;
    this.form.querySelector('input[name="audioFile"]').addEventListener("change", e => {
        if (e.target.files[0]?.size > 10 * 1024 * 1024) {
            alert("Maximum file size is 10MB");
            e.target.value = "";
        }
    });
    this.reset = () => this.form.reset();

    this.show = () => {
        makeCall("GET", "GetAlbumData", null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            const selAlbum = document.getElementById("albumSelect");
            selAlbum.innerHTML = "";
            if (req.status === 200) {
                const albums = JSON.parse(req.responseText);
                if (albums.length === 0) {
                    const o = document.createElement("option");
                    o.disabled = true; o.selected = true;
                    o.textContent = "No album available";
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
                    selAlbum.addEventListener('change', () => {
                        const player = document.getElementById('playerContainer');
                        if (player) { player.style.display = 'none'; player.innerHTML = ''; }
                        const detail = document.getElementById('playlistDetailContainer');
                        if (detail) detail.style.display = 'block';
                    });
                }
            } else redirectToErrorPage(req);
        });

        makeCall("GET", "GetGenresData", null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            const selGenre = document.getElementById("genreSelect");
            selGenre.innerHTML = "";
            if (req.status === 200) {
                const genres = JSON.parse(req.responseText);
                if (genres.length === 0) {
                    const o = document.createElement("option");
                    o.disabled = true; o.selected = true;
                    o.textContent = "No genre available";
                    selGenre.appendChild(o);
                } else {
                    const placeholder = document.createElement("option");
                    placeholder.disabled = true; placeholder.selected = true;
                    placeholder.textContent = "-- Select genre --";
                    selGenre.appendChild(placeholder);
                    genres.forEach(g => {
                        const o = document.createElement("option");
                        o.value = g; o.textContent = g;
                        selGenre.appendChild(o);
                    });
                }
            } else redirectToErrorPage(req);
        });
    };

    this.registerEvents = orchestrator => {
        this.form.addEventListener("submit", e => {
            e.preventDefault();
            makeCall("POST", "UploadTrack", this.form, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) orchestrator.refresh();
                else redirectToErrorPage(req);
            });
        }, false);
    };
}
