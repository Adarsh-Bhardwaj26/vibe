import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-100 flex flex-col items-center justify-center text-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <p className="text-[120px] font-display font-black gradient-text leading-none mb-4">404</p>
        <h1 className="text-3xl font-display font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-zinc-500 mb-8">The vibe you're looking for doesn't exist (or was deleted).</p>
        <Link to="/" className="btn-primary inline-flex">
          <Home size={18} /> Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
