package it.polimi.progettotiw.filter;

import it.polimi.progettotiw.ConnectionHandler;
import it.polimi.progettotiw.beans.User;
import it.polimi.progettotiw.dao.AlbumDAO;
import it.polimi.progettotiw.dao.PlaylistDAO;
import it.polimi.progettotiw.dao.TrackDAO;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.stream.Stream;

public class Checker implements Filter {
    private ServletContext ctx;
    private Path uploadsBaseDir;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        this.ctx = filterConfig.getServletContext();
        String uploadParam = ctx.getInitParameter("UPLOAD_BASE");
        if (uploadParam == null) {
            throw new ServletException("UPLOAD_BASE non configurato");
        }
        uploadsBaseDir = Paths.get(uploadParam).toAbsolutePath().normalize();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        String uri = req.getRequestURI();
        String context = req.getContextPath();

        // Whitelist for public pages and actions
        if (uri.startsWith(context + "/loginPage.html") ||
                uri.startsWith(context + "/CheckPassword") ||
                uri.startsWith(context + "/CheckRegistration") ||
                uri.startsWith(context + "/style.css") || // Allow CSS
                uri.startsWith(context + "/resources/") || // Allow JS resources
                uri.startsWith(context + "/logo.png")      // Allow logo
        ) {
            if (uri.startsWith(context + "/loginPage.html")) {
                HttpSession session = req.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
            }
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setDateHeader("Expires", 0);
            chain.doFilter(request, response);
            return;
        }

        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            res.sendRedirect(context + "/loginPage.html");
            return;
        }

        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setDateHeader("Expires", 0);

        User user = (User) session.getAttribute("user");
        String currentUser = user.getUsername();

        try (Connection connection = ConnectionHandler.getConnection(ctx)) {
            TrackDAO trackDAO = new TrackDAO(connection);
            PlaylistDAO playlistDAO = new PlaylistDAO(connection);
            AlbumDAO albumDAO = new AlbumDAO(connection);

            if (uri.startsWith(context + "/uploads/")) {
                // rimuovo prefisso "/context/uploads/"
                String relative = uri.substring((context + "/uploads/").length());
                // risolvo e normalizzo
                Path requested = uploadsBaseDir.resolve(relative).normalize();
                // directory base dell'utente
                Path userDir = uploadsBaseDir.resolve(currentUser).normalize();
                if (!requested.startsWith(userDir)) {
                    res.sendError(HttpServletResponse.SC_FORBIDDEN, "Accesso negato");
                    return;
                }
                chain.doFilter(request, response);
                return;
            }


            if (uri.startsWith(context + "/GetTrackData")) {
                String idStr = req.getParameter("track_id");
                if (idStr == null || idStr.isEmpty()) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing track_id parameter");
                    return;
                }
                int trackId;
                try {
                    trackId = Integer.parseInt(idStr);
                } catch (NumberFormatException e) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "track_id format not valid");
                    return;
                }
                try {
                    if (!trackDAO.isOwnedBy(trackId, currentUser)) {
                        res.sendError(HttpServletResponse.SC_FORBIDDEN, "You do not own this track.");
                        return;
                    }
                } catch (SQLException e) {
                    res.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
                    return;
                }
            }

            if (uri.startsWith(context + "/GetPlaylistData")) {
                String idStr = req.getParameter("playlist_id");
                if (idStr == null || idStr.isEmpty()) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing playlist_id parameter");
                    return;
                }
                int playlistId;
                try {
                    playlistId = Integer.parseInt(idStr);
                } catch (NumberFormatException e) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "playlist_id format not valid");
                    return;
                }
                try {
                    if (!playlistDAO.isOwnedBy(playlistId, currentUser)) {
                        res.sendError(HttpServletResponse.SC_FORBIDDEN, "You do not own this playlist.");
                        return;
                    }
                } catch (SQLException e) {
                    res.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
                    return;
                }
            }

            if (uri.startsWith(context + "/AddTracksToPlaylist")) {
                String idStr = req.getParameter("playlist_id");
                if (idStr == null || idStr.isEmpty()) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing playlist_id parameter");
                    return;
                }
                int playlistId;
                try {
                    playlistId = Integer.parseInt(idStr);
                } catch (NumberFormatException e) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "playlist_id format not valid");
                    return;
                }
                try {
                    if (!playlistDAO.isOwnedBy(playlistId, currentUser)) {
                        res.sendError(HttpServletResponse.SC_FORBIDDEN, "You do not own this playlist");
                        return;
                    }
                } catch (SQLException e) {
                    res.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
                    return;
                }

                String[] trackIdsParam = req.getParameterValues("trackIds[]");
                if (trackIdsParam == null || trackIdsParam.length == 0) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "No track selected");
                    return;
                }
                try {
                    List<Integer> trackIds = Stream.of(trackIdsParam).map(Integer::parseInt).toList();
                    for (Integer tId : trackIds) {
                        if (!trackDAO.isOwnedBy(tId, currentUser)) {
                            res.sendError(HttpServletResponse.SC_FORBIDDEN, "You do not own the track " + tId);
                            return;
                        }
                    }
                } catch (NumberFormatException e) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "One or more trackIds are not valid");
                    return;
                } catch (SQLException e) {
                    res.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
                    return;
                }
            }

            if (uri.startsWith(context + "/SavePlaylist")) {
                String[] trackIdsParam = req.getParameterValues("trackIds");
                if (trackIdsParam != null) {
                    try {
                        List<Integer> trackIds = Stream.of(trackIdsParam).map(Integer::parseInt).toList();
                        for (Integer tId : trackIds) {
                            if (!trackDAO.isOwnedBy(tId, currentUser)) {
                                res.sendError(HttpServletResponse.SC_FORBIDDEN, "You do not own the track " + tId);
                                return;
                            }
                        }
                    } catch (NumberFormatException e) {
                        res.sendError(HttpServletResponse.SC_BAD_REQUEST, "One or more trackIds are not valid");
                        return;
                    } catch (SQLException e) {
                        res.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
                        return;
                    }
                }
            }

            if (uri.startsWith(context + "/SavePlaylistOrder")) {
                String idStr = req.getParameter("playlist_id");
                if (idStr == null || idStr.isEmpty()) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing playlist_id parameter");
                    return;
                }
                int playlistId;
                try {
                    playlistId = Integer.parseInt(idStr);
                } catch (NumberFormatException e) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "playlist_id format not valid");
                    return;
                }
                try {
                    if (!playlistDAO.isOwnedBy(playlistId, currentUser)) {
                        res.sendError(HttpServletResponse.SC_FORBIDDEN, "You do not own this playlist");
                        return;
                    }
                    String[] trackIdsParam = req.getParameterValues("trackIds[]");
                    if (trackIdsParam == null || trackIdsParam.length == 0) {
                        res.sendError(HttpServletResponse.SC_BAD_REQUEST, "No trackIds provided for reordering");
                        return;
                    }
                    List<Integer> trackIds = Stream.of(trackIdsParam).map(Integer::parseInt).toList();
                    for (Integer tId : trackIds) {
                        if (!trackDAO.isOwnedBy(tId, currentUser)) {
                            res.sendError(HttpServletResponse.SC_FORBIDDEN, "You do not own the track " + tId);
                            return;
                        }
                    }
                } catch (NumberFormatException e) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "One or more trackIds are not valid");
                    return;
                } catch (SQLException e) {
                    res.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
                    return;
                }
            }

            if (uri.startsWith(context + "/UploadTrack")) {
                String albumIdStr = req.getParameter("albumId");
                if (albumIdStr == null || albumIdStr.isEmpty()) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing albumId parameter");
                    return;
                }
                int albumId;
                try {
                    albumId = Integer.parseInt(albumIdStr);
                } catch (NumberFormatException e) {
                    res.sendError(HttpServletResponse.SC_BAD_REQUEST, "albumId format not valid");
                    return;
                }
                try {
                    if (!albumDAO.isOwnedBy(albumId, currentUser)) {
                        res.sendError(HttpServletResponse.SC_FORBIDDEN, "You do not own this album");
                        return;
                    }
                } catch (SQLException e) {
                    res.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
                    return;
                }
            }

            // If no checks failed, let the request continue to the servlet
            chain.doFilter(request, response);

        } catch (SQLException e) {
            res.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database connection error.");
        }
    }

    @Override
    public void destroy() {
    }
}
