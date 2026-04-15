import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, MessageSquare, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { path: "/", label: "🏠 Home" },
    { path: "/chat", label: "💬 Chat" },
    { path: "/projects", label: "📦 Projects" },
    { path: "/profile", label: "👤 Profile" },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar px-6 md:px-10 py-4 flex justify-between items-center sticky top-0 z-50">
      <Link
        to="/"
        className="nav-logo text-2xl font-bold text-primary hover:text-secondary transition-colors flex items-center gap-2"
      >
        <span>⚡</span>
        <span className="hidden sm:inline">ZealConnect</span>
      </Link>

      <ul className="nav-links flex gap-4 md:gap-8 list-none items-center">
        {navItems.map((item) => (
          <li key={item.path} className="hidden md:block">
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

      <div className="nav-actions flex gap-2 items-center flex-wrap justify-end">
        {user && (
          <div className="hidden md:flex items-center gap-2 text-sm px-3 py-2 rounded-lg glass">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary"
              style={{
                backgroundImage: user.avatar ? `url(${user.avatar})` : "none",
                backgroundSize: "cover",
              }}
            />
            <span className="truncate max-w-[100px] text-primary">
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

        <Link to="/chat">
          <button
            className="px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:shadow-lg text-white rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
            title="Go to Chat"
          >
            <MessageSquare size={18} />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </Link>

        <Link to="/create-post">
          <button className="px-4 py-2 bg-primary/80 hover:bg-primary text-white rounded-lg font-medium transition-all text-sm hidden sm:block">
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
    </nav>
  );
};

export default Navbar;
