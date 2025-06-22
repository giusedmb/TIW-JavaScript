(function () {
    const URL_PLAYLIST_DATA = "GetPlaylistData";
    const URL_SAVE_ORDER = "SavePlaylistOrder";

    const modalHTML = `
      <div id="modalOverlay" style="
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.5);display:none;z-index:1000;">
      </div>
      <div id="reorderModal" style="
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:#fff;padding:1em;display:none;z-index:1001;
            max-height:80%;overflow:auto;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.3);
            min-width:300px;">
        <h2>Reorder playlist</h2>
        <div id="loadingIndicator" style="display:none;text-align:center;padding:10px;">
            Loading in progress, please wait...
        </div>
        <ul id="reorderList" style="list-style:none;padding:0;margin:0;"></ul>
        <div style="margin-top:1em;text-align:right;">
          <button id="cancelReorderBtn" style="margin-right:0.5em;">Cancel</button>
          <button id="saveReorderBtn">Save order</button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    let dragSrcEl = null;
    let dragTarget = null;
    let dragPosition = null;

    function handleDragStart(e) {
        dragSrcEl = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', null);
        setTimeout(() => {
            dragSrcEl.classList.add('dragging');
        }, 0);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (dragTarget) dragTarget.classList.remove('drag-over', 'drag-above', 'drag-below');

        if (e.target.tagName === 'LI' && e.target !== dragSrcEl) {
            dragTarget = e.target;
            const rect = dragTarget.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) {
                dragTarget.classList.add('drag-over', 'drag-above');
                dragPosition = 'above';
            } else {
                dragTarget.classList.add('drag-over', 'drag-below');
                dragPosition = 'below';
            }
        }
        return false;
    }

    function handleDragLeave(e) {
        if (dragTarget) {
            dragTarget.classList.remove('drag-over', 'drag-above', 'drag-below');
            dragTarget = null;
        }
    }

    function handleDragEnd() {
        document.querySelectorAll('#reorderList li').forEach(item => {
            item.classList.remove('dragging', 'drag-over', 'drag-above', 'drag-below');
        });
        dragSrcEl = null;
        dragTarget = null;
    }

    function handleDrop(e) {
        e.stopPropagation();
        document.querySelectorAll('#reorderList li').forEach(item => {
            item.classList.remove('dragging', 'drag-over', 'drag-above', 'drag-below');
        });
        if (dragSrcEl !== e.target && e.target.tagName === 'LI') {
            const list = e.target.parentNode;
            if (dragPosition === 'above') {
                list.insertBefore(dragSrcEl, e.target);
            } else {
                list.insertBefore(dragSrcEl, e.target.nextSibling);
            }
        }
        if (e.target.tagName === 'UL' && e.target.id === 'reorderList') {
            e.target.appendChild(dragSrcEl);
        }
        return false;
    }

    const dragDropStyles = document.createElement('style');
    dragDropStyles.textContent = `
        #reorderList li {
            padding: 0.5em;
            border: 1px solid #ccc;
            margin-bottom: 0.2em;
            cursor: move;
            background: white;
            transition: transform 0.1s, box-shadow 0.1s;
        }
        #reorderList li.dragging {
            opacity: 0.5;
            transform: scale(0.98);
        }
        #reorderList li.drag-over {
            border-color: #666;
        }
        #reorderList li.drag-above {
            border-top: 2px solid #0066cc;
        }
        #reorderList li.drag-below {
            border-bottom: 2px solid #0066cc;
        }
    `;
    document.head.appendChild(dragDropStyles);

    function showLoadingIndicator() {
        document.getElementById("loadingIndicator").style.display = 'block';
        document.getElementById("reorderList").style.display = 'none';
    }

    function hideLoadingIndicator() {
        document.getElementById("loadingIndicator").style.display = 'none';
        document.getElementById("reorderList").style.display = 'block';
    }

    function openReorderModal(playlistId) {
        const overlay = document.getElementById("modalOverlay");
        const modal = document.getElementById("reorderModal");
        const list = document.getElementById("reorderList");
        overlay.style.display = 'block';
        modal.style.display = 'block';
        list.innerHTML = '';
        showLoadingIndicator();
        loadPlaylistTracks(playlistId);
    }

    function loadPlaylistTracks(playlistId) {
        const list = document.getElementById("reorderList");
        const modal = document.getElementById("reorderModal");

        makeCall("GET", `${URL_PLAYLIST_DATA}?playlist_id=${playlistId}`, null, req => {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            hideLoadingIndicator();

            if (req.status === 200) {
                const resp = JSON.parse(req.responseText);
                if (resp.tracks.length === 0) {
                    list.innerHTML = '<li style="text-align:center;cursor:default;">No tracks in this playlist</li>';
                } else {
                    resp.tracks.forEach(t => {
                        const li = document.createElement("li");
                        li.textContent = t.title;
                        li.setAttribute("draggable", "true");
                        li.dataset.trackId = t.track_id;
                        li.addEventListener("dragstart", handleDragStart);
                        li.addEventListener("dragover", handleDragOver);
                        li.addEventListener("dragleave", handleDragLeave);
                        li.addEventListener("dragend", handleDragEnd);
                        li.addEventListener("drop", handleDrop);
                        list.appendChild(li);
                    });
                }
                modal.dataset.playlistId = playlistId;
                modal.dataset.originalTrackCount = resp.tracks.length;
            } else {
                redirectToErrorPage(req);
                closeReorderModal();
            }
        });
    }

    function closeReorderModal() {
        document.getElementById("modalOverlay").style.display = 'none';
        document.getElementById("reorderModal").style.display = 'none';
        document.querySelectorAll('#reorderList li').forEach(item => {
            item.classList.remove('dragging', 'drag-over', 'drag-above', 'drag-below');
        });
    }

    document.getElementById("saveReorderBtn").addEventListener("click", function () {
        const modal = document.getElementById("reorderModal");
        const playlistId = modal.dataset.playlistId;
        const originalCount = parseInt(modal.dataset.originalTrackCount || '0');
        const items = Array.from(document.querySelectorAll("#reorderList li"));

        if (items.length === 0) {
            alert("No tracks to save");
            return;
        }
        if (items.length !== originalCount) {
            alert(`Error: track number changed (original: ${originalCount}, actual: ${items.length})`);
            return;
        }
        const saveButton = document.getElementById("saveReorderBtn");
        const originalText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
        const tempForm = document.createElement("form");
        const inputPlaylist = document.createElement("input");
        inputPlaylist.type = "hidden";
        inputPlaylist.name = "playlist_id";
        inputPlaylist.value = playlistId;
        tempForm.appendChild(inputPlaylist);
        items.forEach(li => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "trackIds[]";
            input.value = li.dataset.trackId;
            tempForm.appendChild(input);
        });

        makeCall("POST", URL_SAVE_ORDER, tempForm, function (req) {
            saveButton.disabled = false;
            saveButton.textContent = originalText;

            if (req.readyState !== XMLHttpRequest.DONE) return;
            if (req.status === 200) {
                closeReorderModal();
                alert("Order saved successfully!");
            } else redirectToErrorPage(req);
        });
    });

    document.getElementById("cancelReorderBtn").addEventListener("click", closeReorderModal);
    document.getElementById("modalOverlay").addEventListener("click", closeReorderModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById("modalOverlay").style.display === 'block') {
            closeReorderModal();
        }
    });
})();
