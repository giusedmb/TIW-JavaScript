package it.polimi.progettotiw.controllers;

import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.PlaylistDAO;
import it.polimi.progettotiw.ConnectionHandler; // o come gestisci la connessione
import jakarta.servlet.annotation.MultipartConfig;
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
@MultipartConfig
public class SavePlaylistOrder extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private Connection connection;

    @Override
    public void init() throws ServletException {
        connection = ConnectionHandler.getConnection(getServletContext());
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        User user = (User) request.getSession().getAttribute("user");
        String username = user.getUsername();

        int playlistId;
        try {
            playlistId = Integer.parseInt(request.getParameter("playlist_id"));
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("Invalid playlist_id");
            return;
        }
        String[] trackIdsParam = request.getParameterValues("trackIds[]");
        if (trackIdsParam == null || trackIdsParam.length == 0) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("No trackIds provided");
            return;
        }

        PlaylistDAO playlistDAO = new PlaylistDAO(connection);
        try {
            connection.setAutoCommit(false);
            if (!playlistDAO.isOwnedBy(playlistId, username)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                connection.rollback();
                return;
            }
            List<Integer> orderedTrackIds = new ArrayList<>();
            try {
                for (String s : trackIdsParam) {
                    orderedTrackIds.add(Integer.parseInt(s));
                }
            } catch (NumberFormatException ex) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "trackIds non validi");
                connection.rollback();
                return;
            }
            try {
                playlistDAO.updateTracksOrder(playlistId, orderedTrackIds);
                connection.commit();
            } catch (SQLException e) {
                try {
                    connection.rollback();
                } catch (SQLException rbEx) {
                    log("Rollback fallito in SavePlaylistOrder", rbEx);
                }
                throw e;
            } finally {
                try {
                    connection.setAutoCommit(true);
                } catch (SQLException acEx) {
                    log("Impossibile ripristinare autoCommit in SavePlaylistOrder", acEx);
                }
            }

            response.setStatus(HttpServletResponse.SC_OK);

        } catch (SQLException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().println("DB error: " + e.getMessage());
        }
    }

    @Override
    public void destroy() {
        try { connection.close(); }
        catch (Exception ignored) {}
    }
}
