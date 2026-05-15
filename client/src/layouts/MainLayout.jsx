import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, MessageCircle, Bell, User, PlusSquare,
  Sparkles, Search, Settings, LogOut, Shield, X, Menu, Sun, Moon,
} from 'lucide-react';
import { useState, lazy, Suspense } from 'react';
import { logoutUser } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
const CreatePostModal = lazy(() => import('../components/post/CreatePostModal'));


const navLinks = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/chat', icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-dark-100">
      {/* ─── Sidebar (Desktop) ──────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-80 fixed left-0 top-0 h-screen border-r border-white/5 bg-dark-50 z-40 py-8 px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-4 px-2 mb-10 group">
          <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-glow transition-shadow">
            <Sparkles className="text-white" size={24} />
          </div>
          <span className="text-3xl font-display font-bold gradient-text">Vibe</span>
        </Link>

        {/* Nav Links */}
        <nav className="flex-1 space-y-3">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              id={`nav-${label.toLowerCase()}`}
              className={isActive(to) ? 'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium bg-primary-600/10 text-primary-400 text-xl' : 'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium text-zinc-400 hover:text-white hover:bg-white/5 text-xl'}
            >
              <Icon size={26} />
              <span>{label}</span>
            </Link>
          ))}

          {/* Create Post */}
          <button
            id="nav-create"
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium text-zinc-400 hover:text-white hover:bg-white/5 text-xl w-full text-left"
          >
            <PlusSquare size={26} />
            <span>Create Post</span>
          </button>
        </nav>

        {/* Bottom section */}
        <div className="space-y-3 mt-6 border-t border-white/5 pt-6">
          {user?.role === 'admin' && (
            <Link to="/admin" className={isActive('/admin') ? 'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium bg-primary-600/10 text-primary-400 text-xl' : 'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium text-zinc-400 hover:text-white hover:bg-white/5 text-xl'}>
              <Shield size={26} />
              <span>Admin</span>
            </Link>
          )}
          <Link
            to={`/profile/${user?.username}`}
            className={isActive('/profile') ? 'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium bg-primary-600/10 text-primary-400 text-xl' : 'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium text-zinc-400 hover:text-white hover:bg-white/5 text-xl'}
          >
            <div className="relative">
              {user?.avatar?.url ? (
                <img src={user.avatar.url} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <User size={26} />
              )}
            </div>
            <span className="truncate">{user?.username || 'Profile'}</span>
          </Link>
          <Link to="/settings" className={isActive('/settings') ? 'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium bg-primary-600/10 text-primary-400 text-xl' : 'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium text-zinc-400 hover:text-white hover:bg-white/5 text-xl'}>
            <Settings size={26} />
            <span>Settings</span>
          </Link>
          <button onClick={() => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            // Dispatch a small event so we can force re-render if needed, but CSS handles most of it.
          }} className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium w-full text-left text-zinc-400 hover:text-white hover:bg-white/5 text-xl">
            <span className="flex items-center gap-4">
              <span className="hidden dark:inline"><Moon size={26} /></span>
              <span className="inline dark:hidden"><Sun size={26} /></span>
              Toggle Theme
            </span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-medium w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xl">
            <LogOut size={26} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ─── Mobile Bottom Nav ───────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-50/95 backdrop-blur-md border-t border-white/5 flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navLinks.map(({ to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl ${isActive(to) ? 'text-primary-400' : 'text-zinc-500'}`}
          >
            <Icon size={22} />
          </Link>
        ))}
        <button onClick={() => setShowCreatePost(true)} className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-zinc-500">
          <PlusSquare size={22} />
        </button>
        <Link
          to={`/profile/${user?.username}`}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-xl ${isActive('/profile') ? 'text-primary-400' : 'text-zinc-500'}`}
        >
          {user?.avatar?.url ? (
            <img src={user.avatar.url} className="w-6 h-6 rounded-full object-cover" alt="" />
          ) : (
            <User size={22} />
          )}
        </Link>
      </nav>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-80 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* ─── Create Post Modal ───────────────────────────────────── */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {showCreatePost && (
            <CreatePostModal onClose={() => setShowCreatePost(false)} />
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
