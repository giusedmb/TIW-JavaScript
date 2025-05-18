package it.polimi.progettotiw.controllers;

import com.google.gson.Gson;
import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.beans.Playlist;
import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.PlaylistDAO;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

@WebServlet("/GetUserPlaylistsData")
public class GetUserPlaylistsData extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private Connection connection;

    @Override
    public void init() throws ServletException {
        ServletContext ctx = getServletContext();
        connection = ConnectionHandler.getConnection(ctx);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // 1) Session check
        User user = (User) req.getSession().getAttribute("user");
        if (user == null) {
            resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        try {
            // 2) Fetch
            List<Playlist> playlists = new PlaylistDAO(connection)
                    .getPlaylistsOfUser(user.getUsername());
            // 3) Serialize
            String json = new Gson().toJson(playlists);

            // 4) Respond
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().write(json);
        } catch (SQLException e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "DB error");
        }
    }

    @Override
    public void destroy() {
        try { ConnectionHandler.closeConnection(connection); }
        catch (Exception ignore) {}
    }
}
