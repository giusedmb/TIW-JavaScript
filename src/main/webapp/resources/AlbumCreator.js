function AlbumCreator(formElem) {
    this.form = formElem;

    // controllo la dimensione dell'immagine al cambio input
    this.form.querySelector('input[name="image"]').addEventListener("change", e => {
        // se il file supera i 5MB mostro un avviso e svuoto l'input
        if (e.target.files[0]?.size > 5 * 1024 * 1024) {
            alert("Dimensione massima 5MB");
            e.target.value = "";
        }
    });
    this.show = () => {
    };

    this.reset = () => this.form.reset();

    // registro l'evento di invio del form
    this.registerEvents = orchestrator => {
        this.form.addEventListener("submit", e => {
            e.preventDefault();
            // invio i dati al server con POST
            makeCall("POST", "SaveAlbum", this.form, req => {
                if (req.readyState !== XMLHttpRequest.DONE) return; // aspetto risposta completa
                if (req.status === 200) {
                    // se va bene ricarico la lista album e avviso
                    orchestrator.refresh("albums");
                    alert("Album creato con successo!");
                } else {
                    // altrimenti gestisco l'errore generico
                    redirectToErrorPage(req);
                }
            });
        }, false);
    };
}
