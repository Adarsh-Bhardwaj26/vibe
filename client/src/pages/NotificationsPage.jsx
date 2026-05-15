import { useEffect, useState } from 'react';
import { notificationService } from '../services';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, Heart, MessageCircle, UserPlus, Bookmark, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const ICON_MAP = {
  like: { icon: Heart, color: 'text-accent-pink', bg: 'bg-accent-pink/10' },
  comment: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  follow: { icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  message: { icon: MessageCircle, color: 'text-primary-400', bg: 'bg-primary-400/10' },
  save: { icon: Bookmark, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  reply: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  mention: { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-400/10' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await notificationService.getNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await notificationService.markAsRead('all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const deleteNotif = async (id) => {
    await notificationService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Bell size={22} className="text-primary-400" /> Notifications
            {unreadCount > 0 && (
              <span className="badge-primary text-xs px-2 py-0.5">{unreadCount} new</span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button id="mark-all-read" onClick={markAllRead} className="btn-ghost text-sm flex items-center gap-1.5">
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 card p-4">
              <div className="skeleton w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-2 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <BellOff size={48} className="mx-auto text-zinc-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No notifications yet</h3>
          <p className="text-zinc-500">When people interact with your posts, you'll see it here.</p>
        </motion.div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence>
            {notifications.map((notif, i) => {
              const iconConfig = ICON_MAP[notif.type] || ICON_MAP.like;
              const Icon = iconConfig.icon;
              return (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-white/5 relative ${!notif.isRead ? 'bg-primary-600/5 border border-primary-600/10' : ''}`}
                >
                  {/* Sender avatar */}
                  <Link to={`/profile/${notif.sender?.username}`} className="relative flex-shrink-0">
                    <div className="avatar w-11 h-11">
                      {notif.sender?.avatar?.url ? (
                        <img src={notif.sender.avatar.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold">
                          {notif.sender?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${iconConfig.bg} flex items-center justify-center`}>
                      <Icon size={12} className={iconConfig.color} />
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 leading-snug">{notif.text}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : ''}
                    </p>
                  </div>

                  {/* Post thumbnail */}
                  {notif.post?.media?.[0]?.url && (
                    <Link to={`/post/${notif.post._id}`} className="flex-shrink-0">
                      <img src={notif.post.media[0].url} className="w-12 h-12 object-cover rounded-xl" alt="" />
                    </Link>
                  )}

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => deleteNotif(notif._id)}
                    className="opacity-0 group-hover:opacity-100 btn-icon text-zinc-600 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
