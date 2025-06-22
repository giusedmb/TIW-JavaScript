package it.polimi.progettotiw.controllers;

import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.PlaylistDAO;

import it.polimi.progettotiw.dao.TrackDAO;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@WebServlet("/SavePlaylist")
@MultipartConfig
public class SavePlaylist extends HttpServlet {
    private static final long serialVersionUID = 1L;

    private Connection connection;

    @Override
    public void init() throws ServletException {
        ServletContext ctx = getServletContext();
        connection = ConnectionHandler.getConnection(ctx);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        User user = (User) request.getSession().getAttribute("user");

        String title = request.getParameter("title");
        String[] trackIdsParam = request.getParameterValues("trackIds");

        if (title == null || title.isEmpty()) {
            response.getWriter().println("Title cannot be empty");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        List<Integer> trackIds;
        try {
            trackIds = (trackIdsParam == null)
                    ? List.of()
                    : Arrays.stream(trackIdsParam)
                    .map(idStr -> {
                        try {
                            return Integer.valueOf(idStr);
                        } catch (NumberFormatException e) {
                            throw new IllegalArgumentException("Invalid track id: " + idStr, e);
                        }
                    })
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException badParam) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, badParam.getMessage());
            return;
        }
        if (trackIds.isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Select at least one track");
            return;
        }

        TrackDAO trackDAO = new TrackDAO(connection);
        try {
            connection.setAutoCommit(false);
            for (Integer trackId : trackIds) {
                if (!trackDAO.isOwnedBy(trackId, user.getUsername())) {
                    connection.rollback();
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Track non autorizzato");
                    return;
                }
            }
            new PlaylistDAO(connection)
                    .createPlaylistWithTracks(title, user.getUsername(), trackIds);

            connection.commit();
        } catch (SQLException e) {
            try {
                connection.rollback();
            } catch (SQLException rbEx) {
                log("Rollback fallito in SavePlaylist", rbEx);
            }
            e.printStackTrace();
            response.getWriter().println("Server Error");
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        } finally {
            try {
                connection.setAutoCommit(true);
            } catch (SQLException acEx) {
                log("Impossibile ripristinare autoCommit in SavePlaylist", acEx);
            }
        }
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
    }

    @Override
    public void destroy() {
        try {
            ConnectionHandler.closeConnection(connection);
        } catch (SQLException ignore) {
        }
    }
}
