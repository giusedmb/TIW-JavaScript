package it.polimi.progettotiw.filter;

import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.PlaylistDAO;
import it.polimi.progettotiw.dao.TrackDAO;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;

public class Checker implements Filter {
	private ServletContext ctx;

	@Override
	public void init(FilterConfig filterConfig) {
		this.ctx = filterConfig.getServletContext();
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {

		HttpServletRequest req = (HttpServletRequest) request;
		HttpServletResponse res = (HttpServletResponse) response;
		String uri = req.getRequestURI();
		String context = req.getContextPath();
		if (uri.startsWith(context + "/loginPage.html") )
		{
			HttpSession session = req.getSession(false);
			if(session != null){
				session.invalidate();
			}
			//rimuove cache
			res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
			res.setHeader("Pragma", "no-cache");
			res.setDateHeader("Expires", 0);
			chain.doFilter(request, response);
			return;
		}else if(uri.startsWith(context + "/CheckPassword") || uri.startsWith(context + "/CheckRegistration")) {
			chain.doFilter(request, response);
			return;
		}
		HttpSession session = req.getSession(false);
		if (session == null || session.getAttribute("user") == null) {
			res.sendRedirect(context + "/loginPage.html");
			return;
		}
		else{
			res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
			res.setHeader("Pragma", "no-cache");
			res.setDateHeader("Expires", 0);
		}

		User user = (User) session.getAttribute("user");
		String currentUser = user.getUsername();

		try (Connection connection = ConnectionHandler.getConnection(ctx)) {
			TrackDAO trackDAO = new TrackDAO(connection);
			PlaylistDAO playlistDAO = new PlaylistDAO(connection); // Aggiunto
			if (uri.startsWith(context + "/uploads/")) {
				String[] pathParts = uri.substring(context.length()).split("/");
				if (pathParts.length < 3 || !pathParts[2].equals(currentUser)) {
					res.sendError(403, "Accesso alla directory negato");
					return;
				}
			}
			if (uri.startsWith(context + "/GoToPlayer")) {
				String idStr = req.getParameter("track_id");
				if (idStr == null || idStr.isEmpty()) {
					res.sendError(400, "Parametro track_id mancante");
					return;
				}
				try {
					int trackId = Integer.parseInt(idStr);
					if (!trackDAO.isOwnedBy(trackId, currentUser)) {
						res.sendError(403);
						return;
					}
				} catch (NumberFormatException e) {
					res.sendError(400, "Formato track_id non valido");
					return;
				} catch (SQLException e) {
					res.sendError(500);
					return;
				}
			}
			if (uri.startsWith(context + "/GoToPlaylist")) {
				String idStr = req.getParameter("playlist_id");
				if (idStr == null || idStr.isEmpty()) {
					res.sendError(400, "Parametro playlist_id mancante");
					return;
				}

				try {
					int playlistId = Integer.parseInt(idStr);
					if (!playlistDAO.isOwnedBy(playlistId, currentUser)) {
						res.sendError(403);
						return;
					}
				} catch (NumberFormatException e) {
					res.sendError(400, "Formato playlist_id non valido");
					return;
				} catch (SQLException e) {
					res.sendError(500);
					return;
				}
			}

			chain.doFilter(request, response);
		} catch (SQLException e) {
			res.sendError(500, "Errore database");
		}
	}

	@Override
	public void destroy() { }
}