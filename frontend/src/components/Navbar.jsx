import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogOut, MessageSquare, Moon, Sun, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: "/", label: "🏠 Home" },
    { path: "/chat", label: "💬 Chat" },
    { path: "/projects", label: "📦 Projects" },
    { path: "/profile", label: "👤 Profile" },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/login");
  };

  return (
    <nav className="navbar px-4 md:px-10 py-3 flex justify-between items-center sticky top-0 z-50 bg-transparent backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="nav-logo text-xl md:text-2xl font-bold text-primary hover:text-secondary transition-colors flex items-center gap-2"
          onClick={() => setMobileOpen(false)}
        >
          <span>⚡</span>
          <span className=" sm:inline">ZealConnect</span>
        </Link>
      </div>

      {/* Desktop links */}
      <ul className="nav-links hidden md:flex gap-4 md:gap-8 list-none items-center">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                isActive(item.path)
                  ? "text-primary bg-primary/10"
                  : "hover:text-primary hover:bg-primary/5"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Actions (desktop) */}
      <div className="nav-actions hidden md:flex gap-2 items-center">
        {user && (
          <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg glass">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary"
              style={{
                backgroundImage: user.avatar ? `url(${user.avatar})` : "none",
                backgroundSize: "cover",
              }}
            />
            <span className="truncate max-w-[120px] text-primary">
              {user.name.split(" ")[0]}
            </span>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-all hover:bg-primary/10 text-primary"
          title={isDark ? "Light Mode" : "Dark Mode"}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* <Link to="/chat">
          <button
            className="px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:shadow-lg text-white rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
            title="Go to Chat"
          >
            <MessageSquare size={18} />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </Link> */}

        <Link to="/create-post">
          <button className="px-4 py-2 bg-primary/80 hover:bg-primary text-white rounded-lg font-medium transition-all text-sm">
            ＋ Post
          </button>
        </Link>

        <button
          onClick={handleLogout}
          className="nav-btn px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
          title="Logout"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={() => setMobileOpen((s) => !s)}
          className="p-2 rounded-md border border-white/10 bg-white/5"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="absolute right-4 top-full mt-2 w-[90vw] max-w-sm bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{
                  backgroundImage: user?.avatar
                    ? `url(${user.avatar})`
                    : "none",
                  backgroundSize: "cover",
                }}
              />
              <div>
                <div className="font-semibold">{user?.name || "Guest"}</div>
                <div className="text-xs text-muted">{user?.email}</div>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-1">
              <X size={18} />
            </button>
          </div>

          <ul className="flex flex-col gap-2 mb-3">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md ${
                    isActive(item.path)
                      ? "text-primary bg-primary/10"
                      : "hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                toggleTheme();
                setMobileOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5"
            >
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>

            <Link to="/chat" onClick={() => setMobileOpen(false)}>
              <button className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 flex items-center gap-2">
                <MessageSquare /> Chat
              </button>
            </Link>

            <Link to="/projects" onClick={() => setMobileOpen(false)}>
              <button className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 flex items-center gap-2">
                📦 Projects
              </button>
            </Link>

            <Link to="/create-post" onClick={() => setMobileOpen(false)}>
              <button className="w-full text-left px-3 py-2 rounded-md bg-primary text-white">
                ＋ Create Post
              </button>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-md bg-red-600 text-white"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
