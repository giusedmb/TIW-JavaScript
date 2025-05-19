package it.polimi.progettotiw.controllers;

import it.polimi.progettotiw.dao.PlaylistDAO;
import it.polimi.progettotiw.ConnectionHandler; // o come gestisci la connessione
import jakarta.servlet.http.HttpServletResponse;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

@WebServlet("/SavePlaylistOrder")
public class SavePlaylistOrder extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private Connection connection;

    @Override
    public void init() throws ServletException {
        // recupera qui la connection dal context (es. tramite ConnectionHandler)
        connection = ConnectionHandler.getConnection(getServletContext());
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // 1) Controllo autenticazione
        HttpSession session = request.getSession(false);
        String username = (session != null) ? (String) session.getAttribute("username") : null;
        if (username == null) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        // 2) Parsing parametri
        int playlistId;
        try {
            playlistId = Integer.parseInt(request.getParameter("playlist_id"));
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("Invalid playlist_id");
            return;
        }
        String[] trackIdsParam = request.getParameterValues("trackIds[]");
        if (trackIdsParam == null || trackIdsParam.length == 0) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("No trackIds provided");
            return;
        }

        PlaylistDAO playlistDAO = new PlaylistDAO(connection);
        try {
            // 3) Verifica ownership
            if (!playlistDAO.isOwnedBy(playlistId, username)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
            // 4) Costruzione lista ordinata
            List<Integer> orderedTrackIds = new ArrayList<>();
            for (String s : trackIdsParam) {
                orderedTrackIds.add(Integer.parseInt(s));
            }
            // 5) Aggiornamento
            playlistDAO.updateTracksOrder(playlistId, orderedTrackIds);
            response.setStatus(HttpServletResponse.SC_OK);

        } catch (SQLException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write("DB error: " + e.getMessage());
        }
    }

    @Override
    public void destroy() {
        try { connection.close(); }
        catch (Exception ignored) {}
    }
}
