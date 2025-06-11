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
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.stream.Stream;

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
                String[] parts = uri.substring(context.length()).split("/");
                // path is /uploads/<username>/<type>/<filename> -> length should be 5
                if (parts.length < 3 || !parts[2].equals(currentUser)) {
                    res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    res.getWriter().println("Access denied to this resource.");
                    return;
                }
                // Let the request for the file proceed
                chain.doFilter(request, response);
                return;
            }

            if (uri.startsWith(context + "/GetTrackData")) {
                String idStr = req.getParameter("track_id");
                if (idStr == null || idStr.isEmpty()) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("Missing track_id parameter");
                    return;
                }
                int trackId;
                try {
                    trackId = Integer.parseInt(idStr);
                } catch (NumberFormatException e) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("track_id format not valid");
                    return;
                }
                try {
                    if (!trackDAO.isOwnedBy(trackId, currentUser)) {
                        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        res.getWriter().println("You do not own this track.");
                        return;
                    }
                } catch (SQLException e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    res.getWriter().println("Database error");
                    return;
                }
            }

            if (uri.startsWith(context + "/GetPlaylistData")) {
                String idStr = req.getParameter("playlist_id");
                if (idStr == null || idStr.isEmpty()) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("Missing playlist_id parameter");
                    return;
                }
                int playlistId;
                try {
                    playlistId = Integer.parseInt(idStr);
                } catch (NumberFormatException e) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("playlist_id format not valid");
                    return;
                }
                try {
                    if (!playlistDAO.isOwnedBy(playlistId, currentUser)) {
                        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        res.getWriter().println("You do not own this playlist.");
                        return;
                    }
                } catch (SQLException e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    res.getWriter().println("Database error");
                    return;
                }
            }

            if (uri.startsWith(context + "/AddTracksToPlaylist")) {
                String idStr = req.getParameter("playlist_id");
                if (idStr == null || idStr.isEmpty()) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("Missing playlist_id parameter");
                    return;
                }
                int playlistId;
                try {
                    playlistId = Integer.parseInt(idStr);
                } catch (NumberFormatException e) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("playlist_id format not valid");
                    return;
                }
                try {
                    if (!playlistDAO.isOwnedBy(playlistId, currentUser)) {
                        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        res.getWriter().println("You do not own this playlist");
                        return;
                    }
                } catch (SQLException e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    res.getWriter().println("Database error");
                    return;
                }

                String[] trackIdsParam = req.getParameterValues("trackIds[]");
                if (trackIdsParam == null || trackIdsParam.length == 0) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("No track selected");
                    return;
                }
                try {
                    List<Integer> trackIds = Stream.of(trackIdsParam).map(Integer::parseInt).toList();
                    for (Integer tId : trackIds) {
                        if (!trackDAO.isOwnedBy(tId, currentUser)) {
                            res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            res.getWriter().println("You do not own the track " + tId);
                            return;
                        }
                    }
                } catch (NumberFormatException e) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("One or more trackIds are not valid");
                    return;
                } catch (SQLException e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    res.getWriter().println("Database error");
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
                                res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                res.getWriter().println("You do not own the track " + tId);
                                return;
                            }
                        }
                    } catch (NumberFormatException e) {
                        res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        res.getWriter().println("One or more trackIds are not valid");
                        return;
                    } catch (SQLException e) {
                        res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                        res.getWriter().println("Database error");
                        return;
                    }
                }
            }

            if (uri.startsWith(context + "/SavePlaylistOrder")) {
                String idStr = req.getParameter("playlist_id");
                if (idStr == null || idStr.isEmpty()) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("Missing playlist_id parameter");
                    return;
                }
                int playlistId;
                try {
                    playlistId = Integer.parseInt(idStr);
                } catch (NumberFormatException e) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("playlist_id format not valid");
                    return;
                }
                try {
                    if (!playlistDAO.isOwnedBy(playlistId, currentUser)) {
                        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        res.getWriter().println("You do not own this playlist");
                        return;
                    }
                    String[] trackIdsParam = req.getParameterValues("trackIds[]");
                    if (trackIdsParam == null || trackIdsParam.length == 0) {
                        res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        res.getWriter().println("No trackIds provided for reordering");
                        return;
                    }
                    List<Integer> trackIds = Stream.of(trackIdsParam).map(Integer::parseInt).toList();
                    for (Integer tId : trackIds) {
                        if (!trackDAO.isOwnedBy(tId, currentUser)) {
                            res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            res.getWriter().println("You do not own the track " + tId);
                            return;
                        }
                    }
                } catch (NumberFormatException e) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("One or more trackIds are not valid");
                    return;
                } catch (SQLException e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    res.getWriter().println("Database error");
                    return;
                }
            }

            if (uri.startsWith(context + "/UploadTrack")) {
                String albumIdStr = req.getParameter("albumId");
                if (albumIdStr == null || albumIdStr.isEmpty()) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("Missing albumId parameter");
                    return;
                }
                int albumId;
                try {
                    albumId = Integer.parseInt(albumIdStr);
                } catch (NumberFormatException e) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.getWriter().println("albumId format not valid");
                    return;
                }
                try {
                    if (!albumDAO.isOwnedBy(albumId, currentUser)) {
                        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        res.getWriter().println("You do not own this album");
                        return;
                    }
                } catch (SQLException e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    res.getWriter().println("Database error");
                    return;
                }
            }

            // If no checks failed, let the request continue to the servlet
            chain.doFilter(request, response);

        } catch (SQLException e) {
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            try {
                res.getWriter().println("Database connection error.");
            } catch (IOException ioException) {
                // Ignore if writer cannot be obtained
            }
        }
    }

    @Override
    public void destroy() {
    }
}