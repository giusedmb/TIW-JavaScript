function PlaylistTable(tableElem, tbodyElem, msgElem, detailView) {
    this.table = tableElem;
    this.tbody = tbodyElem;
    this.msg = msgElem;
    this.detailView = detailView;

    this.reset = () => {
        this.table.style.visibility = "hidden";
        this.msg.textContent = "";
    };

    this.show = () => {
        makeCall("GET", "GetUserPlaylistsData", null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                const data = JSON.parse(req.responseText);
                if (data.length === 0) {
                    this.msg.textContent = "No playlists available";
                    return;
                }
                this.update(data);
            } else redirectToErrorPage(req);
        });
    };

    this.update = playlists => {
        this.tbody.innerHTML = "";
        playlists.forEach(pl => {
            const tr = document.createElement("tr");
            const tdTitle = document.createElement("td");
            const a = document.createElement("a");
            a.href = "#";
            a.textContent = pl.title;
            a.addEventListener("click", e => {
                e.preventDefault();
                this.detailView.load(pl.playlist_id);
            });
            tdTitle.appendChild(a);
            tr.appendChild(tdTitle);

            const tdDate = document.createElement("td");
            tdDate.textContent = new Date(pl.time)
                .toLocaleString("it-IT", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                });
            tr.appendChild(tdDate);

            const tdReorder = document.createElement("td");
            const reorderBtn = document.createElement("button");
            reorderBtn.textContent = "Riordino";
            reorderBtn.addEventListener("click", () => openReorderModal(pl.playlist_id));
            tdReorder.appendChild(reorderBtn);
            tr.appendChild(tdReorder);

            this.tbody.appendChild(tr);
        });
        this.table.style.visibility = "visible";
    };
}
