import { useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Trash2, Edit3, Flag, X } from 'lucide-react';
import { toggleLike, toggleSave, deletePost } from '../../redux/slices/postsSlice';
import { postService } from '../../services';
import { useSelector as useSelect } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function PostCard({ post }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localComments, setLocalComments] = useState(post.comments || []);
  const [showMenu, setShowMenu] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(0);
  const menuRef = useRef(null);

  const isOwner = user?._id === post.author?._id || user?._id === post.author;

  const handleLike = () => dispatch(toggleLike(post._id));
  const handleSave = () => dispatch(toggleSave(post._id));

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await postService.addComment(post._id, commentText.trim());
      setLocalComments((prev) => [...prev, res.data.comment]);
      setCommentText('');
    } catch (err) {
      toast.error('Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    dispatch(deletePost(post._id));
    toast.success('Post deleted.');
    setShowMenu(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      navigator.share({ url: `${window.location.origin}/post/${post._id}` });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
      toast.success('Link copied!');
    }
  };

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : '';

  return (
    <motion.article
      layout
      className="card overflow-hidden"
      id={`post-${post._id}`}
    >
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${post.author?.username}`} className="flex items-center gap-3 group">
          <div className="avatar w-10 h-10">
            {post.author?.avatar?.url ? (
              <img src={post.author.avatar.url} alt={post.author?.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-600/20 text-primary-300 font-bold">
                {post.author?.fullName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-white text-sm group-hover:text-primary-300 transition-colors">
              {post.author?.fullName || post.author?.username}
            </p>
            <p className="text-zinc-500 text-xs">@{post.author?.username} · {timeAgo}</p>
          </div>
        </Link>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            id={`post-menu-${post._id}`}
            onClick={() => setShowMenu(!showMenu)}
            className="btn-icon text-zinc-500"
          >
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-10 w-44 card shadow-card z-10 py-1 overflow-hidden"
              >
                {isOwner ? (
                  <>
                    <Link
                      to={`/post/${post._id}/edit`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
                    >
                      <Edit3 size={15} /> Edit Post
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/5 hover:text-red-300"
                    >
                      <Trash2 size={15} /> Delete Post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={async () => {
                      await postService.reportPost(post._id);
                      toast.success('Post reported.');
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/5"
                  >
                    <Flag size={15} /> Report Post
                  </button>
                )}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
                >
                  <Share2 size={15} /> Copy Link
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Caption ──────────────────────────────────────────────── */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
            {post.caption.split(/(#\w+)/g).map((part, i) =>
              part.startsWith('#') ? (
                <Link key={i} to={`/explore?hashtag=${part.slice(1)}`} className="text-primary-400 hover:underline">
                  {part}
                </Link>
              ) : part
            )}
          </p>
        </div>
      )}

      {/* ─── Media ────────────────────────────────────────────────── */}
      {post.media?.length > 0 && (
        <div className="relative bg-black">
          {post.media[currentMedia]?.type === 'video' ? (
            <video
              src={post.media[currentMedia].url}
              controls
              className="w-full max-h-[850px] object-contain"
            />
          ) : (
            <img
              src={post.media[currentMedia].url}
              alt="Post media"
              className="w-full max-h-[850px] object-cover"
              loading="lazy"
            />
          )}
          {/* Multi-media dots */}
          {post.media.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {post.media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentMedia(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentMedia ? 'bg-white w-4' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Actions ──────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            id={`like-btn-${post._id}`}
            onClick={handleLike}
            className={`post-action-btn ${post.isLiked ? 'text-accent-pink' : ''}`}
          >
            <motion.div whileTap={{ scale: 1.3 }}>
              <Heart size={20} className={post.isLiked ? 'fill-accent-pink' : ''} />
            </motion.div>
            <span>{post.likesCount || 0}</span>
          </button>

          <button
            id={`comment-btn-${post._id}`}
            onClick={() => setShowComments(!showComments)}
            className="post-action-btn"
          >
            <MessageCircle size={20} />
            <span>{localComments.length}</span>
          </button>

          <button onClick={handleShare} className="post-action-btn">
            <Share2 size={20} />
          </button>
        </div>

        <button
          id={`save-btn-${post._id}`}
          onClick={handleSave}
          className={`post-action-btn ${post.isSaved ? 'text-primary-400' : ''}`}
        >
          <Bookmark size={20} className={post.isSaved ? 'fill-primary-400' : ''} />
        </button>
      </div>

      {/* ─── Comments ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 overflow-hidden"
          >
            {/* Comment list */}
            <div className="px-4 py-3 space-y-3 max-h-60 overflow-y-auto scrollbar-hide">
              {localComments.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-2">No comments yet. Be first!</p>
              ) : (
                localComments.slice(-5).map((comment) => (
                  <div key={comment._id} className="flex items-start gap-2">
                    <div className="avatar w-7 h-7 flex-shrink-0">
                      {comment.user?.avatar?.url ? (
                        <img src={comment.user.avatar.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-600/20 text-primary-300 text-xs font-bold">
                          {comment.user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="bg-white/5 rounded-xl px-3 py-2 flex-1">
                      <span className="text-primary-300 text-xs font-semibold mr-2">@{comment.user?.username}</span>
                      <span className="text-zinc-300 text-sm">{comment.text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <form onSubmit={handleComment} className="flex items-center gap-3 px-4 pb-3">
              <div className="avatar w-7 h-7 flex-shrink-0">
                {user?.avatar?.url ? (
                  <img src={user.avatar.url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-600/20 text-primary-300 text-xs font-bold">
                    {user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <input
                id={`comment-input-${post._id}`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-600 focus:border-primary-500 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="text-primary-400 text-sm font-semibold hover:text-primary-300 disabled:opacity-40"
              >
                Post
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
