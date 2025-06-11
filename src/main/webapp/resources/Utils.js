function makeCall(method, url, formElement, cback, reset = true) {
    const req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        cback(req)
    };

    req.open(method, url);

    if (formElement == null) {
        req.send();
    } else {
        console.log("sending...")
        req.send(new FormData(formElement));
        if (reset) {
            formElement.reset();
        }
    }
}

function redirectToErrorPage(req) {
    const status = req.status;
    const message = req.responseText || 'An unknown client-side error occurred.';
    const encodedMessage = encodeURIComponent(message);
    window.location.href = `ErrorHandler?status=${status}&message=${encodedMessage}`;
}