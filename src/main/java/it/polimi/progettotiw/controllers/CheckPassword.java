package it.polimi.progettotiw.controllers;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;

import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import jakarta.servlet.http.HttpSession;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.WebContext;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.web.servlet.JakartaServletWebApplication;
import org.thymeleaf.templateresolver.WebApplicationTemplateResolver;

import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.UserDAO;
import it.polimi.progettotiw.ConnectionHandler;

@WebServlet("/CheckPassword")
@MultipartConfig
public class CheckPassword extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private Connection connection = null;
	public void init() throws ServletException {
		ServletContext servletContext = getServletContext();
		connection = ConnectionHandler.getConnection(servletContext);
	}

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
		// getting and sanitizing parameters
		String usr = request.getParameter("username");
		String pwd = request.getParameter("password");
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		System.out.printf("DEBUG login: usr=[%s] pwd=[%s]%n", usr, pwd);
		if (usr == null || usr.isEmpty() || pwd == null || pwd.isEmpty()) {
			response.getWriter().println("Invalid username or password");
			response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
			return;
		}

		UserDAO userDAO = new UserDAO(connection);
		User u;
		try {
			u = userDAO.checkCredentials(usr, pwd);
		} catch (SQLException e) {
			e.printStackTrace();
			response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			response.getWriter().println("Cannot check login");
			return;
		}

		if (u == null) {// user not logged
			response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
			response.getWriter().println("Incorrect credentials");
		} else {
			request.getSession().setAttribute("user", u);// save user in session
			response.setStatus(HttpServletResponse.SC_OK);
			response.setContentType("application/json");
			response.setCharacterEncoding("UTF-8");
			response.getWriter().println(usr);
		}
	}

	public void destroy() {
		try {
			ConnectionHandler.closeConnection(connection);
		} catch (SQLException e) {
			e.printStackTrace();
		}
	}
}