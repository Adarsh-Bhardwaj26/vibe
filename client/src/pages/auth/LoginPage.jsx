import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { loginUser, clearError } from '../../redux/slices/authSlice';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    dispatch(clearError());
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back! 🎉');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── Left Panel (Brand) ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative overflow-hidden bg-dark-100">
        {/* Gradient blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-600/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-pink/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center px-12"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center shadow-glow">
              <Sparkles className="text-white" size={24} />
            </div>
            <span className="text-3xl font-display font-bold gradient-text">Vibe</span>
          </div>
          <h1 className="text-5xl font-display font-bold text-white leading-tight mb-6">
            Connect.<br />Share.<br />Inspire.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
            Join millions of creators, thinkers, and storytellers. Your world, your vibe.
          </p>

          {/* Floating testimonial cards */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="mt-12 glass rounded-2xl p-5 text-left max-w-xs mx-auto"
          >
            <p className="text-zinc-300 text-sm">"Vibe changed how I connect with my audience. The real-time chat is incredible!"</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-pink" />
              <div>
                <p className="text-xs font-semibold text-white">Sarah K.</p>
                <p className="text-xs text-zinc-500">Content Creator</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ─── Right Panel (Form) ──────────────────────────────────────── */}
      <div className="flex-1 lg:max-w-md flex flex-col justify-center px-8 py-12 bg-dark-50">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-sm mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center">
              <Sparkles className="text-white" size={18} />
            </div>
            <span className="text-2xl font-display font-bold gradient-text">Vibe</span>
          </div>

          <h2 className="text-3xl font-display font-bold text-white mb-2">Welcome back</h2>
          <p className="text-zinc-400 mb-8">Sign in to your Vibe account.</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="input pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button id="login-btn" type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="divider text-zinc-600 text-sm">or</div>

          <button
            id="demo-login-btn"
            type="button"
            onClick={() => {
              setForm({ email: 'demo@vibe.app', password: 'demo1234' });
              toast('Demo credentials filled! Click Sign In.', { icon: '💡' });
            }}
            className="btn-secondary w-full py-3 text-sm"
          >
            Try Demo Account
          </button>

          <p className="text-center text-zinc-500 text-sm mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold">
              Sign up free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
