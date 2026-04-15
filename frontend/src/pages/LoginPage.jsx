import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const handleToggle = () => setIsLogin(!isLogin);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login({
      email: formData.email,
      password: formData.password,
    });
    if (success) {
      setShowLoginSuccess(true);
      setTimeout(() => {
        setShowLoginSuccess(false);
        navigate("/");
      }, 1500);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const success = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
    if (success) {
      setShowSignupSuccess(true);
      setTimeout(() => {
        setShowSignupSuccess(false);
        navigate("/");
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 home-body">
      <div className="w-full max-w-md">
        <GlassCard className="h-[500px] flex flex-col overflow-hidden relative">
          <div
            className={`form-box transition-transform duration-500 ${isLogin ? "translate-x-0" : "-translate-x-full"}`}
          >
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-white/70 mb-8 text-sm">
              Enter your details to stay connected.
            </p>
            <form onSubmit={handleLogin}>
              <div className="mb-5">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="mb-6">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn w-full p-3 bg-primary text-white rounded-lg font-semibold hover:bg-primaryHover shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Login
              </button>
            </form>
            <div className="switch-text mt-6 text-center text-white/70 text-sm">
              Don't have an account?{" "}
              <button
                onClick={handleToggle}
                className="text-primary font-bold cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>

          <div
            className={`form-box absolute inset-0 transition-transform duration-500 ${isLogin ? "translate-x-full" : "translate-x-0"}`}
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              Join the Community
            </h2>
            <p className="text-white/70 mb-8 text-sm">
              Create an account to start sharing.
            </p>
            <form onSubmit={handleSignup}>
              <div className="mb-5">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="mb-5">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="mb-6">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn w-full p-3 bg-primary text-white rounded-lg font-semibold hover:bg-primaryHover shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Create Account
              </button>
            </form>
            <div className="switch-text mt-6 text-center text-white/70 text-sm">
              Already a member?{" "}
              <button
                onClick={handleToggle}
                className="text-primary font-bold cursor-pointer"
              >
                Login
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Login Success Popup */}
      {showLoginSuccess && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-2xl text-center w-80 scale-100 transition-transform">
            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Login Successful
            </h3>
            <p className="text-gray-600 mb-6">
              Welcome back to your dashboard.
            </p>
            <button
              onClick={() => setShowLoginSuccess(false)}
              className="px-8 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Signup Success Popup */}
      {showSignupSuccess && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-2xl text-center w-80 scale-100 transition-transform">
            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Registered Successfully
            </h3>
            <p className="text-gray-600 mb-6">Your account has been created.</p>
            <button
              onClick={() => setShowSignupSuccess(false)}
              className="px-8 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-all"
            >
              Let's Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
