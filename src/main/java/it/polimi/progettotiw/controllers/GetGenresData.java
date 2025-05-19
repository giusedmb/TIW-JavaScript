package it.polimi.progettotiw.controllers;

import com.google.gson.Gson;
import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.dao.GenresDAO;
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

@WebServlet("/GetGenresData")
public class GetGenresData extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private Connection connection;
    private final Gson gson = new Gson();

    @Override
    public void init() throws ServletException {
        ServletContext ctx = getServletContext();
        connection = ConnectionHandler.getConnection(ctx);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            List<String> genres = new GenresDAO(connection).getGenresNames();
            String json = gson.toJson(genres);

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
