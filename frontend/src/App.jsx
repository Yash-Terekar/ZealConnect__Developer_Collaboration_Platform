import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import EditProfilePage from "./pages/EditProfilePage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import CreatePostPage from "./pages/CreatePostPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import ProjectDetailPage from "./pages/ProjectDetailPage.jsx";

function AppContent() {
  const { user, logout } = useAuth();

  return (
    <div className="gradient-bg min-h-screen relative">
      <div className="background-circles">
        <div className="circle"></div>
        <div className="circle"></div>
      </div>

      {user && <Navbar />}

      <Routes>
        <Route
          path="/login"
          element={!user ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <EditProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-post"
          element={
            <ProtectedRoute>
              <CreatePostPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.2)",
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
