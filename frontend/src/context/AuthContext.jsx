import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api.js";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth on load
    const token = localStorage.getItem("token");
    if (token) {
      // Verify token with backend
      api
        .get("/auth/profile")
        .then((response) => {
          console.log("Profile loaded:", response.data.user);
          setUser(response.data.user);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Token verification failed:", error);
          localStorage.removeItem("token");
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const token = response.data.user._id; // Store the user ID or JWT
      localStorage.setItem("token", token);
      setUser(response.data.user);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const signup = async (data) => {
    try {
      const response = await api.post("/auth/signup", data);
      const token = response.data.user._id; // Store the user ID or JWT
      localStorage.setItem("token", token);
      setUser(response.data.user);
      return true;
    } catch (error) {
      console.error("Signup error:", error);
      return false;
    }
  };

  const updateUser = async (id, data, hasFile = false) => {
    try {
      const config = hasFile
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
      const response = await api.put(`/users/${id}`, data, config);
      setUser(response.data);
      localStorage.setItem("token", response.data._id); // refresh token if needed
      return response.data;
    } catch (error) {
      console.error("Update user error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    updateUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
