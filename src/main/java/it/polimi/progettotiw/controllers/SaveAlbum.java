package it.polimi.progettotiw.controllers;

import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.AlbumDAO;

import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import org.thymeleaf.TemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.WebApplicationTemplateResolver;
import org.thymeleaf.web.servlet.JakartaServletWebApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.UUID;

@WebServlet("/SaveAlbum")
@MultipartConfig(
        fileSizeThreshold   = 1024 * 1024,      // 1MB prima di scrivere su disco
        maxFileSize         = 5 * 1024 * 1024,  // 5MB per file
        maxRequestSize      = 10 * 1024 * 1024  // 10MB totale
)
public class SaveAlbum extends HttpServlet {
    private static final long serialVersionUID = 1L;

    private Connection connection;
    private String uploadBase;

    @Override
    public void init() throws ServletException {
        ServletContext servletContext = getServletContext();
        connection = ConnectionHandler.getConnection(servletContext);

        // Upload base path from web.xml
        uploadBase = servletContext.getInitParameter("UPLOAD_BASE");
        if (uploadBase == null) {
            throw new ServletException("UPLOAD_BASE non configurato");
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
        // 1) sessione / user
        User user = (User) request.getSession().getAttribute("user");

        // 2) parametri
        String title      = request.getParameter("title");
        String performer  = request.getParameter("performer");
        String yearStr    = request.getParameter("publicationYear");
        Part imagePart    = request.getPart("image");
        System.out.printf("ciao");
        if (title == null || title.isEmpty()
                || performer == null || performer.isEmpty()
                || yearStr == null || yearStr.isEmpty()
                || imagePart == null || imagePart.getSize() == 0) {
            response.getWriter().println("Missing parameters");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        int publicationYear;
        try {
            publicationYear = Integer.parseInt(yearStr);
        } catch (NumberFormatException e) {
            response.getWriter().println("Year is not a number");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        // 3) prepara directory
        Path basePath = Paths.get(uploadBase).toAbsolutePath().normalize();
        Path userImagesDir = basePath.resolve(user.getUsername()).resolve("images").normalize();

        if (!userImagesDir.startsWith(basePath)) {
            throw new IOException("Tentativo di path traversal");
        }
        Files.createDirectories(userImagesDir);

        // 4) salva immagine
        String originalName = imagePart.getSubmittedFileName();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf('.'));
        }
        String storedName = UUID.randomUUID() + ext;
        Path dest = userImagesDir.resolve(storedName);

        try {
            Files.copy(imagePart.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log("Errore salvataggio immagine", e);
            response.getWriter().println("Error uploading image");
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }

        // 5) persist su DB
        String relativePath = user.getUsername() + "/images/" + storedName;
        try {
            new AlbumDAO(connection).create(
                    title,
                    performer,
                    publicationYear,
                    relativePath,
                    user.getUsername()
            );
        } catch (SQLException e) {
            log("Errore DB salvataggio album", e);
            response.getWriter().println("Error uploading album");
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }

        // 6) redirect a GoToHome
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
    }catch (IllegalStateException e) {
            // file troppo grande da Servlet container
            request.setAttribute("jakarta.servlet.error.exception", e);
            request.getRequestDispatcher("/ErrorHandler").forward(request, response);
        } catch (Exception e) {
            // altri errori generici
            e.printStackTrace();
            response.getWriter().println("Too big to upload");
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public void destroy() {
        try {
            ConnectionHandler.closeConnection(connection);
        } catch (SQLException ignore) {}
    }
}