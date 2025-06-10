package it.polimi.progettotiw.controllers;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;

import it.polimi.progettotiw.beans.Track;
import it.polimi.progettotiw.dao.TrackDAO;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.dao.PlaylistDAO;
import jakarta.servlet.http.HttpServletResponse;

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
        request.setCharacterEncoding("UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");

        int playlistId;
        try {
            playlistId = Integer.parseInt(request.getParameter("playlist_id"));
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"error\":\"ID playlist not valid\"}");
            return;
        }
        String[] trackIdsArray = request.getParameterValues("trackIds[]");
        if (trackIdsArray == null || trackIdsArray.length == 0) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"error\":\"No track selected\"}");
            return;
        }

        try {
            connection.setAutoCommit(false);

            PlaylistDAO playlistDAO = new PlaylistDAO(connection);
            TrackDAO trackDAO = new TrackDAO(connection);
            for (String trackIdStr : trackIdsArray) {
                int trackId = Integer.parseInt(trackIdStr);
                trackDAO.isOwnedBy(trackId, request.getRemoteUser());
            }
            for (String trackIdStr : trackIdsArray) {
                int trackId = Integer.parseInt(trackIdStr);
                playlistDAO.addTrackToPlaylist(playlistId, trackId);
            }

            connection.commit();
            connection.setAutoCommit(true);

            response.setStatus(HttpServletResponse.SC_OK);
            response.getWriter().write("{\"message\":\"Tracks added successfully\"}");

        } catch (NumberFormatException e) {
            try {
                connection.rollback();
            } catch (SQLException ex) {
                log("Rollback fallito in AddTracksToPlaylist", ex);
            }
            try {
                connection.setAutoCommit(true);
            } catch (SQLException acEx) {
                log("Impossibile ripristinare autoCommit in AddTracksToPlaylist", acEx);
            }

            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"error\":\"TrackID format not valid\"}");

        } catch (SQLException e) {
            try {
                connection.rollback();
            } catch (SQLException ex) {
                log("Rollback fallito in AddTracksToPlaylist", ex);
            }
            try {
                connection.setAutoCommit(true);
            } catch (SQLException acEx) {
                log("Impossibile ripristinare autoCommit in AddTracksToPlaylist", acEx);
            }

            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write("{\"error\":\"Server error: impossibile adding tracks\"}");
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
