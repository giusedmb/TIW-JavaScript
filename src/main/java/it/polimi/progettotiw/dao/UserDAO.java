package it.polimi.progettotiw.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;

import it.polimi.progettotiw.beans.User;

public class UserDAO {
    private final Connection con; //session between a Java application and a database

    public UserDAO(Connection connection) {
        this.con = connection;
    }

    public User checkCredentials(String user, String pwd) throws SQLException {
        //Don't need of password
        String query = "SELECT username FROM Users WHERE username = ? AND  password = ?";
        try (PreparedStatement pstatement = con.prepareStatement(query)) {
            pstatement.setString(1, user);
            pstatement.setString(2, pwd);
            try (ResultSet result = pstatement.executeQuery()) {
                if (!result.isBeforeFirst())
                    return null;
                else {
                    result.next();
                    User u = new User();
                    u.setUsername(result.getString("username"));
                    return u;
                }
            }
        }
    }

    public void registerUser(User user) throws SQLException {
        String query = "INSERT into Users (username, password, first_name,last_name) VALUES (?, ?, ?, ?)";
        try (PreparedStatement pstatement = con.prepareStatement(query)) {
            pstatement.setString(1, user.getUsername());
            pstatement.setString(2, user.getPassword());
            pstatement.setString(3, user.getName());
            pstatement.setString(4, user.getSurname());
            pstatement.executeUpdate();
        }
    }


    public boolean existsByUsername(String username) throws SQLException {
        String query = "SELECT 1 FROM Users WHERE username = ?";
        try (PreparedStatement pstatement = con.prepareStatement(query)) {
            pstatement.setString(1, username);
            try (ResultSet rs = pstatement.executeQuery()) {
                return rs.next();
            }
        }
    }
}
