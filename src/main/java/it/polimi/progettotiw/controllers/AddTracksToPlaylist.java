package it.polimi.progettotiw.controllers;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;

import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.TrackDAO;
import it.polimi.progettotiw.dao.PlaylistDAO;
import it.polimi.progettotiw.ConnectionHandler;

import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
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


        User user = (User) request.getSession().getAttribute("user");
        String username = user.getUsername();
        if (username == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().println("User not authenticated");
            return;
        }

        int playlistId;
        try {
            playlistId = Integer.parseInt(request.getParameter("playlist_id"));
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("Invalid playlist id");
            return;
        }

        // Parsing track IDs
        String[] trackIdsArray = request.getParameterValues("trackIds[]");
        if (trackIdsArray == null || trackIdsArray.length == 0) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("No Tracks selected");
            return;
        }

        try {
            connection.setAutoCommit(false);
            PlaylistDAO playlistDAO = new PlaylistDAO(connection);
            TrackDAO trackDAO = new TrackDAO(connection);

            // Controllo ownership dei brani
            for (String trackIdStr : trackIdsArray) {
                int trackId = Integer.parseInt(trackIdStr);
                if (!trackDAO.isOwnedBy(trackId, username)) {
                    connection.rollback();
                    connection.setAutoCommit(true);
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().println("User not authorized");
                    return;
                }
            }

            // Aggiunta dei brani alla playlist
            for (String trackIdStr : trackIdsArray) {
                int trackId = Integer.parseInt(trackIdStr);
                playlistDAO.addTrackToPlaylist(playlistId, trackId);
            }

            connection.commit();
            connection.setAutoCommit(true);

            response.setStatus(HttpServletResponse.SC_OK);
            response.getWriter().println("Tracks added successfully");

        } catch (NumberFormatException e) {
            try {
                connection.rollback();
            } catch (SQLException ex) {
                log("Rollback failed", ex);
            }
            try {
                connection.setAutoCommit(true);
            } catch (SQLException acEx) {
                log("Could not reset autoCommit", acEx);
            }
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("Invalid track id");

        } catch (SQLException e) {
            try {
                connection.rollback();
            } catch (SQLException ex) {
                log("Rollback failed", ex);
            }
            try {
                connection.setAutoCommit(true);
            } catch (SQLException acEx) {
                log("Could not reset autoCommit", acEx);
            }
            log("Database error in AddTracksToPlaylist", e);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().println("Server error");
        }
    }

    @Override
    public void destroy() {
        try {
            ConnectionHandler.closeConnection(connection);
        } catch (SQLException e) {
            log("Error closing connection", e);
        }
    }
}
