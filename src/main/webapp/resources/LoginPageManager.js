(function () { //IIFE Immediately invoked function expression - invocata quando viene parsato htlm. Defer.
    const URL_CHECK_LOGIN = "CheckPassword";
    const URL_CHECK_REGISTRATION = "CheckRegistration";

    document.getElementById("LoginButton").addEventListener("click", (e) => {
        // recupero il form a cui appartiene il bottone
        const form = e.target.closest("form");
        // prendo i campi username e password
        const userField = form.elements["username"];
        const pwdField = form.elements["password"];

        // resetto eventuali bordi rossi da errori precedenti
        userField.style.borderColor = "";
        pwdField.style.borderColor = "";

        if (form.checkValidity()) {
            // invio una richiesta POST asincrona per controllare username/password
            makeCall("POST", URL_CHECK_LOGIN, form,
                function (req) {
                    const message = req.responseText;
                    // aspetto che la chiamata sia completata
                    if (req.readyState === XMLHttpRequest.DONE) {
                        if (req.status === 200) {
                            // se OK, salvo lo username in sessionStorage e vado alla home
                            sessionStorage.setItem('username', message);
                            window.location.href = "homePage.html";
                        } else if (req.status === 401) {
                            // se credenziali sbagliate, evidenzio i campi in rosso e mostro errore
                            userField.style.borderColor = "red";
                            pwdField.style.borderColor = "red";
                            document.getElementById("errorMessageLogin").textContent = message;
                        } else {
                            // per altri errori, mostro semplicemente il messaggio
                            document.getElementById("errorMessageLogin").textContent = message;
                        }
                    }
                });
        } else {
            // se validazione HTML fallisce, mostro i messaggi di errore nativi
            form.reportValidity();
        }
    });

    document.getElementById("RegistratonButton").addEventListener("click", (e) => {
        const form = e.target.closest("form");
        const pwdField = form.elements["newPassword"];
        const rpt_pwdField = form.elements["newRepeatedPassword"];

        // resetto i bordi rossi
        pwdField.style.borderColor = "";
        rpt_pwdField.style.borderColor = "";

        // prima controllo che le due password corrispondano
        if (pwdField.value === rpt_pwdField.value) {
            if (form.checkValidity()) {
                // invio POST per registrare l'utente
                makeCall("POST", URL_CHECK_REGISTRATION, form,
                    function (req) {
                        const message = req.responseText;
                        if (req.readyState === XMLHttpRequest.DONE) {
                            if (req.status === 200) {
                                // registrazione OK: dico all'utente di fare il login
                                document.getElementById("errorMessageRegistration").textContent =
                                    "You have successfully registered, please log in";
                            } else {
                                // altrimenti mostro l'errore restituito
                                document.getElementById("errorMessageRegistration").textContent = message;
                            }
                        }
                    });
            } else {
                // mostro errori di validazione HTML5
                form.reportValidity();
            }
        } else {
            // password diverse: prevengo submit, bordo rosso e messaggio
            e.preventDefault();
            document.getElementById("errorMessageRegistration").textContent =
                "Passwords do not match.";
            pwdField.style.borderColor = "red";
            rpt_pwdField.style.borderColor = "red";
        }
    });
})();
