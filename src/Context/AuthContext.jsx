
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/+$/, "");

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Check whether the backend session cookie is valid.
  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }

      const data = await response.json();

      if (data?.authenticated !== true) {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }

      setUser(data.user ?? null);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error("Session validation failed:", error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  // Restore authentication when the application starts.
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Log out using the backend API.
  const logout = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Unable to log out. Please try again.");
      }

      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }, []);

  const value = {
    user,
    isAuthenticated,
    isAuthLoading,
    refreshAuth,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
