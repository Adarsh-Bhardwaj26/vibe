import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';

import { fetchCurrentUser } from './redux/slices/authSlice';
import { SocketProvider } from './context/SocketContext';
import MainLayout from './layouts/MainLayout';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Full-screen loading spinner
const GlobalLoader = () => (
  <div className="min-h-screen bg-dark-100 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-500 text-sm">Loading Vibe...</p>
    </div>
  </div>
);

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, initializing } = useSelector((state) => state.auth);
  if (initializing) return <GlobalLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// ─── Public Route (redirect if logged in) ────────────────────────────────────
const PublicRoute = ({ children }) => {
  const { isAuthenticated, initializing } = useSelector((state) => state.auth);
  if (initializing) return <GlobalLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

// ─── Admin Route ──────────────────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, initializing } = useSelector((state) => state.auth);
  if (initializing) return <GlobalLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Attempt to restore session from stored tokens
    const token = localStorage.getItem('accessToken');
    if (token) {
      dispatch(fetchCurrentUser());
    } else {
      dispatch({ type: 'auth/setInitialized' });
    }
  }, [dispatch]);

  return (
    <HelmetProvider>
      <SocketProvider>
        <Toaster
          position="top-right"
          gutter={8}
          containerStyle={{ top: 20, right: 20 }}
          toastOptions={{
            duration: 3500,
            style: {
              background: '#18181b',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />

        <Suspense fallback={<GlobalLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

            {/* Protected routes (wrapped in layout) */}
            <Route path="/" element={<ProtectedRoute><MainLayout><HomePage /></MainLayout></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><MainLayout><ExplorePage /></MainLayout></ProtectedRoute>} />
            <Route path="/profile/:username" element={<ProtectedRoute><MainLayout><ProfilePage /></MainLayout></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><MainLayout><ChatPage /></MainLayout></ProtectedRoute>} />
            <Route path="/chat/:conversationId" element={<ProtectedRoute><MainLayout><ChatPage /></MainLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><MainLayout><NotificationsPage /></MainLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
            <Route path="/settings/profile" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
            <Route path="/post/:id" element={<ProtectedRoute><MainLayout><PostDetailPage /></MainLayout></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </SocketProvider>
    </HelmetProvider>
  );
}

// ─── Inline small pages ───────────────────────────────────────────────────────
import { useState } from 'react';
import { authService } from './services';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch { toast.error('Failed to send reset email.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-100 px-4">
      <div className="w-full max-w-md card p-8">
        <Link to="/login" className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-6"><ArrowLeft size={16} /> Back to login</Link>
        <Mail size={32} className="text-primary-400 mb-4" />
        <h2 className="text-2xl font-display font-bold text-white mb-2">Forgot Password?</h2>
        <p className="text-zinc-400 mb-6 text-sm">Enter your email and we'll send a reset link.</p>
        {sent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-300 text-sm">
            ✅ Reset email sent! Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" required />
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch { toast.error('Reset failed. Link may be expired.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-100 px-4">
      <div className="w-full max-w-md card p-8">
        <h2 className="text-2xl font-display font-bold text-white mb-6">Set New Password</h2>
        {done ? (
          <p className="text-emerald-300">✅ Password reset! Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 6 chars)" className="input" required minLength={6} />
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying');
  useEffect(() => {
    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-100">
      <div className="card p-10 text-center">
        {status === 'verifying' && <><Loader2 size={32} className="animate-spin text-primary-400 mx-auto mb-4" /><p className="text-zinc-300">Verifying your email...</p></>}
        {status === 'success' && <><p className="text-5xl mb-4">✅</p><h2 className="text-xl font-bold text-white mb-2">Email verified!</h2><Link to="/login" className="btn-primary mt-4">Go to Login</Link></>}
        {status === 'error' && <><p className="text-5xl mb-4">❌</p><h2 className="text-xl font-bold text-white mb-2">Verification failed</h2><p className="text-zinc-500">Link expired or invalid.</p></>}
      </div>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
