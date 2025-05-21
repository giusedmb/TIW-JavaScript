package it.polimi.progettotiw.dao;

import it.polimi.progettotiw.beans.Album;
import it.polimi.progettotiw.beans.Track;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class TrackDAO {
    private final Connection con;

    public TrackDAO(Connection connection) {
        this.con = connection;
    }

    public void create(String title, String filePath, int albumId, String genreName, String username) throws SQLException {
        String query = "INSERT INTO Tracks (title, file_path, album_id, genre_name, username) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement ps = con.prepareStatement(query)) {
            ps.setString(1, title);
            ps.setString(2, filePath);
            ps.setInt(3, albumId);
            ps.setString(4, genreName);
            ps.setString(5, username);
            ps.executeUpdate();
        }
    }

    public List<Track> findByUserOrdered(String username) throws SQLException {
        String sql = "SELECT t.track_id, t.title, t.file_path, t.genre_name, "
                + "a.album_id,a.title AS album_title, a.performer, a.publication_year, a.image "
                + "FROM Tracks t "
                + "JOIN Albums a ON t.album_id = a.album_id "
                + "WHERE t.username = ? "
                + "ORDER BY a.performer ASC, a.publication_year ASC, t.title ASC";

        List<Track> tracks = new ArrayList<>();
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, username);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tracks.add(mapTrackFromResultSet(rs));
                }
            }
        }
        return tracks;
    }

    public Track findById(int trackId) throws SQLException {
        String sql = "SELECT t.track_id, t.title, t.file_path, t.genre_name, "
                + "a.album_id,a.title AS album_title, a.performer, a.publication_year, a.image "
                + "FROM Tracks t "
                + "JOIN Albums a ON t.album_id = a.album_id "
                + "WHERE t.track_id = ?";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, trackId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapTrackFromResultSet(rs);
                }
            }
        }
        return null;
    }

    public List<Track> getTracksByPlaylistOrdered(int playlistId) throws SQLException {
        String sql = "SELECT t.track_id, t.title, t.file_path, t.genre_name, "
                + "a.album_id, a.title AS album_title, a.performer, a.publication_year, a.image "
                + "FROM Tracks t "
                + "JOIN Playlist_Tracks pt ON t.track_id = pt.track_id "
                + "JOIN Albums a ON t.album_id = a.album_id "
                + "WHERE pt.playlist_id = ? "
                + "ORDER BY pt.position DESC, a.performer ASC, a.publication_year ASC, t.title ASC";

        List<Track> tracks = new ArrayList<>();
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, playlistId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tracks.add(mapTrackFromResultSet(rs));
                }
            }
        }
        return tracks;
    }

    // Mappatura centralizzata con oggetto Album
    private Track mapTrackFromResultSet(ResultSet rs) throws SQLException {
        Track track = new Track();
        track.setTrack_id(rs.getInt("track_id"));
        track.setTitle(rs.getString("title"));
        track.setFilePath(rs.getString("file_path"));
        track.setGenreName(rs.getString("genre_name"));

        // Popola l'oggetto Album
        Album album = new Album();
        album.setAlbumId(rs.getInt("album_id"));
        album.setTitle(rs.getString("album_title"));
        album.setPerformer(rs.getString("performer"));
        album.setPublicationYear(rs.getInt("publication_year"));
        album.setImage(rs.getString("image")); // Campo "image" dal database
        track.setAlbum(album);

        return track;
    }
    public boolean isOwnedBy(int trackId, String username) throws SQLException {
        String sql = "SELECT COUNT(*) AS cnt "
                + "FROM Tracks "
                + "WHERE track_id = ? AND username = ?";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, trackId);
            ps.setString(2, username);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("cnt") > 0;
                }
                return false;
            }
        }
}
}