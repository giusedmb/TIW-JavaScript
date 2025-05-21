package it.polimi.progettotiw.dao;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import it.polimi.progettotiw.beans.Playlist;

public class PlaylistDAO {
    private final Connection con; //session between a Java application and a database

    public PlaylistDAO(Connection connection) {
        this.con = connection;
    }

    public List<Playlist> getPlaylistsOfUser(String username) throws SQLException {
        String query = "SELECT playlist_id, title, creation_date, username FROM Playlists WHERE username = ? ORDER BY creation_date DESC";
        List<Playlist> playlists = new ArrayList<>();
        try (PreparedStatement ps = con.prepareStatement(query)) {
            ps.setString(1, username);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Playlist p = new Playlist();
                    p.setPlaylist_id(rs.getInt("playlist_id"));
                    p.setTitle(rs.getString("title"));
                    // Assicurati che la data non sia null prima di impostarla
                    Timestamp timestamp = rs.getTimestamp("creation_date");
                    if (timestamp != null) {
                        p.setTime(timestamp);
                    }

                    p.setCreator(rs.getString("username"));
                    playlists.add(p);
                }
            }
        }
        return playlists;
    }


    public void createPlaylistWithTracks(String title, String username, List<Integer> trackIds)
            throws SQLException {
        String insertPlaylistSql = "INSERT INTO Playlists (title, username, creation_date) VALUES (?, ?, ?)";
        try (PreparedStatement ps = con.prepareStatement(insertPlaylistSql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, title);
            ps.setString(2, username);
            ps.setTimestamp(3, new Timestamp(System.currentTimeMillis()));
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (!rs.next()) {
                    throw new SQLException("Creazione playlist fallita, nessuna chiave.");
                }
                int playlistId = rs.getInt(1);
                if (!trackIds.isEmpty()) {
                    String insertLinkSql =
                            "INSERT INTO Playlist_Tracks (playlist_id, track_id) VALUES (?, ?)";
                    try (PreparedStatement psLink = con.prepareStatement(insertLinkSql)) {
                        for (int trackId : trackIds) {
                            psLink.setInt(1, playlistId);
                            psLink.setInt(2, trackId);
                            psLink.addBatch();
                        }
                        psLink.executeBatch();
                    }
                }
            }
        }
    }

    public Playlist getPlaylistById(int playlistId) throws SQLException {
        String query = "SELECT playlist_id, title, creation_date, username FROM Playlists WHERE playlist_id = ?";
        try (PreparedStatement ps = con.prepareStatement(query)) {
            ps.setInt(1, playlistId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Playlist p = new Playlist();
                    p.setPlaylist_id(rs.getInt("playlist_id"));
                    p.setTitle(rs.getString("title"));
                    Timestamp timestamp = rs.getTimestamp("creation_date");
                    if (timestamp != null) p.setTime(timestamp);
                    p.setCreator(rs.getString("username"));
                    return p;
                }
                return null;
            }
        }
    }

    public void addTrackToPlaylist(int playlistId, int trackId) throws SQLException {
        String sql = "INSERT INTO Playlist_Tracks (playlist_id, track_id) VALUES (?, ?)";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, playlistId);
            ps.setInt(2, trackId);
            ps.executeUpdate();
        }
    }
    public boolean isOwnedBy(int playlistId, String username) throws SQLException {
        String sql = "SELECT COUNT(*) AS cnt "
                + "FROM Playlists "
                + "WHERE playlist_id = ? AND username = ?";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, playlistId);
            ps.setString(2, username);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("cnt") > 0;
                }
                return false;
            }
        }
}
    public void updateTracksOrder(int playlistId, List<Integer> orderedTrackIds) throws SQLException {
        String sql = "UPDATE Playlist_Tracks SET position = ? WHERE playlist_id = ? AND track_id = ?";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            for (int i = orderedTrackIds.size()-1; i >0; i--) {
                ps.setInt(1, i - 1);
                ps.setInt(2, playlistId);
                ps.setInt(3, orderedTrackIds.get(i));
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }


}