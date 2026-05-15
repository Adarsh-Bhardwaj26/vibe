import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { userService } from '../../services';
import { UserPlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function SuggestedUsers() {
  const { user } = useSelector((state) => state.auth);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await userService.getSuggestedUsers();
        setSuggested(res.data.users);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFollow = async (userId) => {
    try {
      await userService.toggleFollow(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    } catch {
      toast.error('Failed to follow user.');
    }
  };

  if (loading) {
    return (
      <div className="card p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-3 w-28 rounded" />
              <div className="skeleton h-2 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!suggested.length) return null;

  return (
    <div className="card p-6">
      {/* Current user mini-profile */}
      {user && (
        <Link to={`/profile/${user.username}`} className="flex items-center gap-4 mb-6 group">
          <div className="avatar w-14 h-14">
            {user.avatar?.url ? (
              <img src={user.avatar.url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold text-lg">
                {user.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-base group-hover:text-primary-300 truncate">{user.fullName}</p>
            <p className="text-zinc-500 text-sm truncate">@{user.username}</p>
          </div>
          <Link to="/settings" className="text-primary-400 text-sm font-semibold hover:text-primary-300">
            Edit
          </Link>
        </Link>
      )}

      <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-5">Suggested for you</p>

      <div className="space-y-5">
        {suggested.map((su, i) => (
          <motion.div
            key={su._id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4"
          >
            <Link to={`/profile/${su.username}`} className="flex items-center gap-4 flex-1 group min-w-0">
              <div className="avatar w-12 h-12 flex-shrink-0">
                {su.avatar?.url ? (
                  <img src={su.avatar.url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 text-sm font-bold">
                    {su.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-base group-hover:text-primary-300 truncate">{su.fullName}</p>
                <p className="text-zinc-500 text-sm truncate">@{su.username}</p>
              </div>
            </Link>
            <button
              id={`follow-btn-${su._id}`}
              onClick={() => handleFollow(su._id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all ${
                followingIds.has(su._id)
                  ? 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  : 'text-primary-400 hover:text-primary-300'
              }`}
            >
              {followingIds.has(su._id) ? 'Following' : 'Follow'}
            </button>
          </motion.div>
        ))}
      </div>

      <Link to="/explore" className="block text-center text-primary-400 text-xs hover:text-primary-300 mt-5">
        See more suggestions →
      </Link>
    </div>
  );
}
