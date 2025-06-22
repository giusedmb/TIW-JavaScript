// Funzione per inviare richieste HTTP (anche con dati da un form) e gestire la risposta tramite callback
function makeCall(method, url, formElement, cback, reset = true) {
    const req = new XMLHttpRequest();

    req.onreadystatechange = function () {
        // La callback viene invocata ogni volta che cambia lo stato della richiesta.
        // Sarà responsabilità della callback stessa controllare se readyState === 4 prima di agire.
        cback(req);
    };

    req.open(method, url);

    if (formElement == null) {
        req.send();
    } else {
        console.log("sending...");
        req.send(new FormData(formElement));
        if (reset) {
            formElement.reset();
        }
    }
}

// Funzione che reindirizza a una pagina di errore passando lo status e il messaggio ricevuto
function redirectToErrorPage(req) {
    const status = req.status;
    const message = req.responseText || 'An unknown client-side error occurred.';
    const encodedMessage = encodeURIComponent(message);
    window.location.href = `ErrorHandler?status=${status}&message=${encodedMessage}`;
}
