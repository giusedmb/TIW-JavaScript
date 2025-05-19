package it.polimi.progettotiw.controllers;

import com.google.gson.Gson;
import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.beans.Playlist;
import it.polimi.progettotiw.beans.Track;
import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.PlaylistDAO;
import it.polimi.progettotiw.dao.TrackDAO;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@WebServlet("/GetPlaylistData")
public class GetPlaylistData extends HttpServlet {
    private Connection connection;

    @Override
    public void init() throws ServletException {
        ServletContext ctx = getServletContext();
        connection = ConnectionHandler.getConnection(ctx);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // 1) Controllo sessione
        User user = (User) req.getSession().getAttribute("user");
        if (user == null) {
            resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        // 2) Parametri
        String pidParam = req.getParameter("playlist_id");
        if (pidParam == null) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing playlist_id");
            return;
        }
        int playlistId = Integer.parseInt(pidParam);

        try {
            // 3) Recupera playlist e tracce ordinate
            PlaylistDAO pdao = new PlaylistDAO(connection);
            TrackDAO   tdao = new TrackDAO(connection);

            Playlist playlist = pdao.getPlaylistById(playlistId);
            List<Track> tracks = tdao.getTracksByPlaylistOrdered(playlistId);

            // 4) Prepara mappa JSON
            Map<String,Object> result = new HashMap<>();
            result.put("playlist", playlist);
            result.put("tracks", tracks);

            // 5) Serializza e rispondi
            String json = new Gson().toJson(result);
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().write(json);
        } catch (SQLException e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
        }
    }

    @Override
    public void destroy() {
        try { ConnectionHandler.closeConnection(connection); }
        catch (Exception ignore) {}
    }
}
