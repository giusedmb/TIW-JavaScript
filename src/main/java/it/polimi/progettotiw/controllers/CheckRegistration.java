package it.polimi.progettotiw.controllers;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.regex.Pattern;

import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.WebContext;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.WebApplicationTemplateResolver;
import org.thymeleaf.web.servlet.JakartaServletWebApplication;

import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.UserDAO;
import it.polimi.progettotiw.ConnectionHandler;

@WebServlet("/CheckRegistration")
@MultipartConfig
public class CheckRegistration extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[A-Za-z0-9_]{3,20}$");
    private static final int MAX_NAME_LENGTH = 50;
    private static final int MAX_PASSWORD_LENGTH = 60;

    private Connection connection;

    @Override
    public void init() throws ServletException {
        ServletContext servletContext = getServletContext();

        connection = ConnectionHandler.getConnection(servletContext);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String username = request.getParameter("newUsername");
        String name = request.getParameter("newName");
        String surname = request.getParameter("newSurname");
        String password = request.getParameter("newPassword");
        String repeated = request.getParameter("newRepeatedPassword");

        // Controllo parametri
        if (username == null || name == null || surname == null ||
                password == null || repeated == null ||
                username.isBlank() || name.isBlank() || surname.isBlank() ||
                password.isBlank() || repeated.isBlank()) {
            response.getWriter().println("Invalid username or password");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        // Validazioni formali
        if (!USERNAME_PATTERN.matcher(username).matches()) {
            response.getWriter().println("Invalid username");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (name.length() > MAX_NAME_LENGTH || surname.length() > MAX_NAME_LENGTH) {
            response.getWriter().println("Username is too long");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (password.length() < 8 || password.length() > MAX_PASSWORD_LENGTH) {
            response.getWriter().println("Password is too short or too long");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (!password.equals(repeated)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().println("Passwords do not match");
            return;
        }

        UserDAO userDAO = new UserDAO(connection);

        try {
            if (userDAO.existsByUsername(username)) {
                response.getWriter().println("Username Already Taken");
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
            User u = new User();
            u.setUsername(username);
            u.setPassword(password);
            u.setName(name);
            u.setSurname(surname);
            userDAO.registerUser(u);
            ServletContext ctx = getServletContext();
            String baseDir = ctx.getInitParameter("UPLOAD_BASE");
            Path basePath = Paths.get(baseDir).toAbsolutePath().normalize();
            Path userPath = basePath.resolve(u.getUsername()).normalize();
            if (!userPath.startsWith(basePath)) {
                throw new IOException("Path traversal attempt");
            }


        } catch (SQLException e) {
            log("ERROR SQL in user registration", e);
            response.getWriter().println("Cannot check registration");
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        } catch (IOException e) {
            log("FILESYSTEM ERROR in user registration", e);
            response.getWriter().println("Error filesystem");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
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