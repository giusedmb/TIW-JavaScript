package it.polimi.progettotiw.controllers;

import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.AlbumDAO;
import it.polimi.progettotiw.dao.TrackDAO;

import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.UUID;

// Servlet per il salvataggio delle tracce audio
@WebServlet("/UploadTrack")
@MultipartConfig(
        fileSizeThreshold   = 1024 * 1024,
        maxFileSize         = 10 * 1024 * 1024,
        maxRequestSize      = 20 * 1024 * 1024
)
public class UploadTrack extends HttpServlet {
    private static final long serialVersionUID = 1L;

    private Connection connection;
    private String uploadBase;

    @Override
    public void init() throws ServletException {
        ServletContext servletContext = getServletContext();
        connection = ConnectionHandler.getConnection(servletContext);
        uploadBase = servletContext.getInitParameter("UPLOAD_BASE");
        if (uploadBase == null) {
            throw new ServletException("UPLOAD_BASE not configured in web.xml");
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            User user = (User) request.getSession().getAttribute("user");

            String albumIdStr = request.getParameter("albumId");
            String title      = request.getParameter("title");
            String genreName  = request.getParameter("genreName");
            Part audioPart    = request.getPart("audioFile");

            if (albumIdStr == null || albumIdStr.isEmpty() ||
                    title == null || title.isEmpty() ||
                    genreName == null || genreName.isEmpty() ||
                    audioPart == null || audioPart.getSize() == 0) {
                response.getWriter().println("Missing Parameters");
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            int albumId;
            try {
                albumId = Integer.parseInt(albumIdStr);
            } catch (NumberFormatException e) {
                response.getWriter().println("Album ID not valid");
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            Path basePath = Paths.get(uploadBase).toAbsolutePath().normalize();
            Path userAudioDir = basePath.resolve(user.getUsername()).resolve("audio").normalize();
            if (!userAudioDir.startsWith(basePath)) {
                throw new IOException("Path traversal attempt");
            }
            Files.createDirectories(userAudioDir);

            String originalName = audioPart.getSubmittedFileName();
            String ext = originalName != null && originalName.contains(".")
                    ? originalName.substring(originalName.lastIndexOf('.'))
                    : "";
            String storedName = UUID.randomUUID() + ext;
            Path dest = userAudioDir.resolve(storedName);

            try {
                Files.copy(audioPart.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                log("Error saving file audio", e);
                response.getWriter().println("Error when copying audio file");
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return;
            }

            String relativePath = user.getUsername() + "/audio/" + storedName;
            try {
                connection.setAutoCommit(false);
                new AlbumDAO(connection).isOwnedBy(albumId, user.getUsername());
                new TrackDAO(connection).create(
                        title, relativePath, albumId, genreName, user.getUsername()
                );

                connection.commit();
            } catch (SQLException e) {
                try {
                    connection.rollback();
                } catch (SQLException rbEx) {
                    log("Rollback fallito in UploadTrack", rbEx);
                }
                log("Error DB saving track", e);
                try {
                    Files.deleteIfExists(dest);
                } catch (IOException delEx) {
                    log("Non è stato possibile rimuovere l'audio dopo rollback", delEx);
                }
                response.getWriter().println("Error when copying track");
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return;
            } finally {
                try {
                    connection.setAutoCommit(true);
                } catch (SQLException acEx) {
                    log("Impossibile ripristinare autoCommit in UploadTrack", acEx);
                }
            }
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
        } catch (IllegalStateException e) {
            request.setAttribute("jakarta.servlet.error.exception", e);
            request.getRequestDispatcher("/ErrorHandler").forward(request, response);
        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("Error when copying track");
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
