function HomePageManager(pt, pd, ac, tu, pc) {
    this.playlistTable = pt;
    this.playlistDetail = pd;
    this.albumCreator = ac;
    this.trackUploader = tu;
    this.playlistCreator = pc;
}

HomePageManager.prototype.start = function () {
    this.albumCreator.registerEvents(this);
    this.trackUploader.registerEvents(this);
    this.playlistCreator.registerEvents(this);
    this.playlistTable.show();
    document.querySelector("a.logout")
        .addEventListener("click", () => sessionStorage.removeItem("username"), false);
};

HomePageManager.prototype.refresh = function () {
    document.getElementById("messageContainer").textContent = "";
    this.playlistTable.reset();
    this.albumCreator.reset();
    this.trackUploader.reset();
    this.playlistCreator.reset();
    this.playlistTable.show();
    this.albumCreator.show();
    this.trackUploader.show();
    this.playlistCreator.show();
    this.playlistDetail.container.style.display = "none";
};

window.addEventListener("load", function () {
    if (!sessionStorage.getItem("username")) {
        window.location.href = "loginPage.html";
        return;
    }
    const msg = document.getElementById("messageContainer");
    const playerView = new PlayerView(
        document.getElementById("playerContainer"), msg
    );
    const detailView = new PlaylistDetailView(
        document.getElementById("playlistDetailContainer"),
        msg, playerView
    );
    detailView.init();
    const playlistTable = new PlaylistTable(
        document.getElementById("playlistTable"),
        document.getElementById("playlistTableBody"),
        msg,
        detailView
    );
    const albumCreator = new AlbumCreator(
        document.getElementById("albumForm")
    );
    const trackUploader = new TrackUploader(
        document.getElementById("trackForm"),
        msg
    );
    const playlistCreator = new PlaylistCreator(
        document.getElementById("playlistForm")
    );
    const manager = new HomePageManager(
        playlistTable,
        detailView,
        albumCreator,
        trackUploader,
        playlistCreator
    );
    manager.start();
    manager.refresh();
}, false);
