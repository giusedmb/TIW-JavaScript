function HomePageManager(pt, pd, ac, tu, pc) {
    this.playlistTable  = pt; // tabella con l’elenco delle playlist dell’utente
    this.playlistDetail = pd; // vista di dettaglio di una singola playlist
    this.albumCreator   = ac; // form per inserire un nuovo album
    this.trackUploader  = tu;  // form per caricare un brano
    this.playlistCreator = pc; // form per creare una playlist selezionando i propri brani
}


HomePageManager.prototype.start = function () {
    // collego gli eventi ai vari “mini-controller”
    this.albumCreator.registerEvents(this);
    this.trackUploader.registerEvents(this);
    this.playlistCreator.registerEvents(this);

    // mostro subito le playlist disponibili
    this.playlistTable.show();

    document.querySelector("a.logout")
        .addEventListener("click", () => sessionStorage.removeItem("username"), false);
};

HomePageManager.prototype.refresh = function (what) {
    switch (what) {
        case "albums":
            this.albumCreator.reset();
            this.trackUploader.reset();
            return;

        case "tracks":
            this.playlistCreator.reset();
            this.playlistCreator.show();
            return;

        case "playlists":
            this.playlistTable.reset();
            this.playlistTable.show();
            return;
    }
    document.getElementById("messageContainer").textContent = "";
    this.playlistTable.reset(); this.playlistTable.show();
    this.albumCreator.reset();  this.albumCreator.show();
    this.trackUploader.reset(); this.trackUploader.show();
    this.playlistCreator.reset(); this.playlistCreator.show();
    this.playlistDetail.container.hidden = true;
};


// eseguito quando tutta la pagina è caricata
window.addEventListener("load", function () {
    // se non c’è username in sessione, rimando al login
    if (!sessionStorage.getItem("username")) {
        window.location.href = "loginPage.html";
        return;
    }
    const msg = document.getElementById("messageContainer");
    const playerView = new PlayerView(
        document.getElementById("playerContainer"),
        msg
    );
    const detailView = new PlaylistDetailView(
        document.getElementById("playlistDetailContainer"),
        msg,
        playerView
    );
    detailView.init(); // inizializzo gli event listener interni

    // tabella con tutte le playlist dell’utente
    const playlistTable = new PlaylistTable(
        document.getElementById("playlistTable"),
        document.getElementById("playlistTableBody"),
        msg,
        detailView
    );

    // form per creare un album
    const albumCreator = new AlbumCreator(
        document.getElementById("albumForm")
    );

    // form per uploadare un brano
    const trackUploader = new TrackUploader(
        document.getElementById("trackForm"),
        msg
    );

    // form per creare una playlist
    const playlistCreator = new PlaylistCreator(
        document.getElementById("playlistForm")
    );

    // istanzio il manager centrale con tutti i pezzi
    const manager = new HomePageManager(
        playlistTable,
        detailView,
        albumCreator,
        trackUploader,
        playlistCreator
    );

    // avvio l’app e faccio subito un refresh completo
    manager.start();
    manager.refresh();
}, false);
