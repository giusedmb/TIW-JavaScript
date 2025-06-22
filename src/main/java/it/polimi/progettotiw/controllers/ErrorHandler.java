package it.polimi.progettotiw.controllers;

import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.WebContext;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.WebApplicationTemplateResolver;
import org.thymeleaf.web.servlet.JakartaServletWebApplication;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;

@WebServlet("/ErrorHandler")
public class ErrorHandler extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private TemplateEngine templateEngine;
    private JakartaServletWebApplication application;

    @Override
    public void init() throws ServletException {
        ServletContext servletContext = getServletContext();
        application = JakartaServletWebApplication.buildApplication(servletContext);

        WebApplicationTemplateResolver templateResolver = new WebApplicationTemplateResolver(application);
        templateResolver.setTemplateMode(TemplateMode.HTML);
        templateResolver.setSuffix(".html");
        templateResolver.setPrefix("/");
        templateEngine = new TemplateEngine();
        templateEngine.setTemplateResolver(templateResolver);
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        processError(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        processError(request, response);
    }

    private void processError(HttpServletRequest request, HttpServletResponse response) throws IOException {
        int statusCode;
        String errorMessage;
        String requestUri;
        String exceptionType = "N/A";
        String stackTrace = "Not available.";

        // --- Logica per determinare la fonte dell'errore ---

        // 1. Controlla se è un errore gestito dal container (ha gli attributi standard)
        Object statusCodeObj = request.getAttribute("jakarta.servlet.error.status_code");
        if (statusCodeObj != null) {
            statusCode = (Integer) statusCodeObj;
            errorMessage = (String) request.getAttribute("jakarta.servlet.error.message");
            requestUri = (String) request.getAttribute("jakarta.servlet.error.request_uri");
            Throwable exception = (Throwable) request.getAttribute("jakarta.servlet.error.exception");

            if (exception != null) {
                Throwable root = exception.getCause() != null ? exception.getCause() : exception;
                exceptionType = root.getClass().getName();
                if (errorMessage == null || errorMessage.isEmpty()) {
                    errorMessage = root.getMessage();
                }
                // Prendi lo stack trace completo
                StringWriter sw = new StringWriter();
                root.printStackTrace(new PrintWriter(sw));
                stackTrace = escapeHTML(sw.toString()).replace("\n", "<br/>").replace("\t", "    ");
            }
        }
        // 2. Altrimenti, controlla se è un redirect da AJAX (ha i parametri nell'URL)
        else if (request.getParameter("status") != null) {
            try {
                statusCode = Integer.parseInt(request.getParameter("status"));
            } catch (NumberFormatException e) {
                statusCode = 500; // Default
            }
            // Leggi il messaggio dall'URL. Il server lo decodifica in automatico.
            errorMessage = request.getParameter("message");
            requestUri = "N/A (from client-side action)";
        }
        // 3. Caso di fallback (accesso diretto senza parametri)
        else {
            statusCode = 500;
            errorMessage = "Error page accessed directly without error information.";
            requestUri = request.getRequestURI();
        }

        // Assicurati che il messaggio non sia mai nullo
        if (errorMessage == null || errorMessage.isEmpty()) {
            errorMessage = "An unspecified error occurred.";
        }

        // Imposta lo status e il content type della risposta
        response.setStatus(statusCode);
        response.setContentType("text/html");
        response.setCharacterEncoding("UTF-8");

        // Prepara il contesto per Thymeleaf
        WebContext ctx = new WebContext(application.buildExchange(request, response), request.getLocale());

        ctx.setVariable("errorTitle", "Error " + statusCode);
        ctx.setVariable("errorMessage", errorMessage);
        ctx.setVariable("statusCode", statusCode);
        ctx.setVariable("requestUri", requestUri);
        ctx.setVariable("exceptionType", exceptionType);
        ctx.setVariable("stackTrace", stackTrace);
        ctx.setVariable("backUrl", request.getContextPath() + "/homePage.html");

        // Renderizza la pagina di errore
        templateEngine.process("errorPage", ctx, response.getWriter());
    }

    // Funzione di utilità per l'escape HTML per prevenire XSS
    private String escapeHTML(String s) {
        if (s == null) return "";
        return s.replace("&", "&").replace("<", "<").replace(">", ">");
    }
}