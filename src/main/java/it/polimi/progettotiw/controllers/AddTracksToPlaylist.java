package it.polimi.progettotiw.controllers;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;

import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.dao.PlaylistDAO;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.WebApplicationTemplateResolver;
import org.thymeleaf.web.servlet.JakartaServletWebApplication;

@WebServlet("/AddTracksToPlaylist")
@MultipartConfig
public class AddTracksToPlaylist extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private Connection connection = null;

    @Override
    public void init() throws ServletException {
        ServletContext servletContext = getServletContext();
        connection = ConnectionHandler.getConnection(servletContext);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // Utilizziamo playlist_id come nel form HTML
        int playlistId = Integer.parseInt(request.getParameter("playlist_id"));
        String[] trackIdsArray = request.getParameterValues("trackIds");

        // Gestione del caso in cui nessuna traccia è selezionata
        if (trackIdsArray == null || trackIdsArray.length == 0) {
            response.getWriter().println("Track IDs cannot be empty");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            PlaylistDAO playlistDAO = new PlaylistDAO(connection);

            // Aggiunge ogni traccia selezionata alla playlist
            for (String trackId : trackIdsArray) {
                playlistDAO.addTrackToPlaylist(playlistId, Integer.parseInt(trackId));
            }

            // Reindirizza alla pagina della playlist con i parametri corretti
            response.sendRedirect("GoToPlaylist?playlist_id=" + playlistId + "&page=0");
        } catch (SQLException e) {
            // Log dettagliato dell'errore
            e.printStackTrace();
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Impossibile aggiungere le tracce alla playlist: " + e.getMessage());
        } catch (NumberFormatException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "ID traccia o playlist non valido");
        }
    }

    @Override
    public void destroy() {
        try {
            ConnectionHandler.closeConnection(connection);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}