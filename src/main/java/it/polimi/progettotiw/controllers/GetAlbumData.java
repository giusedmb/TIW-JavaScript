package it.polimi.progettotiw.controllers;

import com.google.gson.Gson;
import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.beans.Album;
import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.AlbumDAO;
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

@WebServlet("/GetAlbumData")
public class GetAlbumData extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private Connection connection;

    @Override
    public void init() throws ServletException {
        ServletContext ctx = getServletContext();
        connection = ConnectionHandler.getConnection(ctx);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        User user = (User) req.getSession().getAttribute("user");
        if (user == null) {
            resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        try {
            List<Album> albums = new AlbumDAO(connection)
                    .getAlbumOfUser(user.getUsername());
            String json = new Gson().toJson(albums);

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
