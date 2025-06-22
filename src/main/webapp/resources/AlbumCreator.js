function AlbumCreator(formElem) {
    this.form = formElem;
    this.form.querySelector('input[name="image"]').addEventListener("change", e => {
        if (e.target.files[0]?.size > 5 * 1024 * 1024) {
            alert("Maximum file size is 5MB");
            e.target.value = "";
        }
    });
    this.show = () => {
    };
    this.reset = () => this.form.reset();
    this.registerEvents = orchestrator => {
        this.form.addEventListener("submit", e => {
            e.preventDefault();
            makeCall("POST", "SaveAlbum", this.form, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return;
                if (req.status === 200) {
                    orchestrator.refresh();
                    alert("Album created successfully!");
                } else redirectToErrorPage(req);
            });
        }, false);
    };
}
