import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Users, MessageSquare, GitBranch } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

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
    <nav className="navbar px-6 md:px-10 py-4 flex justify-between items-center text-white sticky top-0 z-50 bg-gradient-to-r from-black/40 via-black/30 to-black/40 backdrop-blur-md border-b border-white/10">
      <Link
        to="/"
        className="nav-logo text-2xl font-bold text-accent hover:text-primary transition-colors"
      >
        ⚡ ZealConnect
      </Link>

      <ul className="nav-links flex gap-8 list-none items-center">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                isActive(item.path)
                  ? "text-primary bg-white/10"
                  : "hover:text-primary hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="nav-actions flex gap-2 items-center flex-wrap justify-end">
        {user && (
          <div className="hidden md:flex items-center gap-2 text-sm text-white/70 px-3 py-2 bg-white/5 rounded-lg">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent"
              style={{
                backgroundImage: user.avatar ? `url(${user.avatar})` : "none",
                backgroundSize: "cover",
              }}
            />
            <span className="truncate max-w-[100px]">
              {user.name.split(" ")[0]}
            </span>
          </div>
        )}
        <Link to="/chat">
          <button
            className="px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
            title="Go to Chat"
          >
            <MessageSquare size={18} />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </Link>
        <Link to="/create-post">
          <button className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-medium hover:fill-white transition-all text-sm">
            ＋ Post
          </button>
        </Link>
        <button
          onClick={handleLogout}
          className="nav-btn px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
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
