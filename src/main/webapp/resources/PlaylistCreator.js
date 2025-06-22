function PlaylistCreator(formElem) {
    this.form = formElem;
    this.group = formElem.querySelector(".checkbox-group");

    this.reset = () => {
        this.form.querySelector('input[name="title"]').value = "";
        this.group.innerHTML = "";
    };

    this.show = () => {
        makeCall("GET", "GetUserTracksData", null, req => {
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
                        cb.type = "checkbox"; cb.name = "trackIds";
                        cb.value = t.track_id; cb.id = "track_" + t.track_id;
                        div.appendChild(cb);
                        const lbl = document.createElement("label");
                        lbl.htmlFor = cb.id; lbl.textContent = t.title;
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
                alert("Select at least one track");
                return;
            }
            makeCall("POST", "SavePlaylist", this.form, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) orchestrator.refresh();
                else redirectToErrorPage(req);
            });
        }, false);
    };
}
