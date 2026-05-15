import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3X3, Bookmark, Settings, Camera, Link as LinkIcon,
  MapPin, ExternalLink, UserCheck, UserPlus, MessageCircle, Loader2
} from 'lucide-react';
import { userService, postService, chatService } from '../services';
import PostCard from '../components/post/PostCard';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'posts', label: 'Posts', icon: Grid3X3 },
  { id: 'saved', label: 'Saved', icon: Bookmark },
];

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwn = currentUser?.username === username;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await userService.getProfile(username);
        const prof = res.data.user;
        setProfile(prof);
        setIsFollowing(prof.followers?.some((f) => f._id === currentUser?._id || f === currentUser?._id));
      } catch {
        toast.error('Profile not found.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    const loadPosts = async () => {
      setPostsLoading(true);
      try {
        const res = await postService.getUserPosts(profile._id);
        setPosts(res.data.posts);
      } catch {}
      finally { setPostsLoading(false); }
    };
    loadPosts();
  }, [profile?._id]);

  useEffect(() => {
    if (activeTab === 'saved' && isOwn) {
      postService.getSavedPosts().then((res) => setSavedPosts(res.data.posts)).catch(() => {});
    }
  }, [activeTab, isOwn]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      await userService.toggleFollow(profile._id);
      setIsFollowing((prev) => !prev);
      setProfile((prev) => ({
        ...prev,
        followers: isFollowing
          ? (prev.followers || []).filter((f) => (f._id || f) !== currentUser?._id)
          : [...(prev.followers || []), currentUser?._id],
      }));
    } catch { toast.error('Action failed.'); }
    finally { setFollowLoading(false); }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-56 md:h-80 w-full rounded-2xl mb-4" />
        <div className="flex items-end gap-4 -mt-14 px-6 mb-6">
          <div className="skeleton w-28 h-28 rounded-full border-4 border-dark-100" />
        </div>
        <div className="px-6 space-y-3">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-4 w-60 rounded" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const displayPosts = activeTab === 'posts' ? posts : savedPosts;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* ─── Cover Image ─────────────────────────────────────────── */}
      <div className="relative h-56 md:h-80 bg-gradient-to-br from-primary-900/50 to-dark-400 overflow-hidden">
        {profile.coverImage?.url ? (
          <img src={profile.coverImage.url} className="w-full h-full object-cover" alt="Cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/30 via-dark-400 to-accent-pink/10" />
        )}
        {isOwn && (
          <label className="absolute bottom-3 right-3 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors">
            <Camera size={16} className="text-white" />
            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('cover', file);
              const res = await userService.updateCoverImage(formData);
              setProfile((prev) => ({ ...prev, coverImage: res.data.coverImage }));
              toast.success('Cover updated!');
            }} />
          </label>
        )}
      </div>

      {/* ─── Profile Info ─────────────────────────────────────────── */}
      <div className="px-4 md:px-6">
        <div className="flex items-end justify-between -mt-14 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="avatar w-24 h-24 md:w-28 md:h-28 border-4 border-dark-100 ring-2 ring-primary-500">
              {profile.avatar?.url ? (
                <img src={profile.avatar.url} className="w-full h-full object-cover" alt={profile.username} />
              ) : (
                <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 text-3xl font-bold">
                  {profile.fullName?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {isOwn && (
              <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-500 transition-colors">
                <Camera size={13} className="text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('avatar', file);
                  const res = await userService.updateAvatar(formData);
                  setProfile((prev) => ({ ...prev, avatar: res.data.avatar }));
                  toast.success('Avatar updated!');
                }} />
              </label>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-16">
            {isOwn ? (
              <>
                <Link to="/settings/profile" id="edit-profile-btn" className="btn-secondary text-sm">
                  <Settings size={15} /> Edit Profile
                </Link>
              </>
            ) : (
              <>
                <button
                  id="follow-btn"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isFollowing
                      ? 'bg-white/5 border border-white/10 text-white hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                      : 'bg-primary-600 hover:bg-primary-500 text-white'
                  }`}
                >
                  {followLoading ? <Loader2 size={15} className="animate-spin" /> : isFollowing ? <><UserCheck size={15} /> Following</> : <><UserPlus size={15} /> Follow</>}
                </button>
                <button
                  id="message-btn"
                  onClick={async () => {
                    const res = await chatService.createConversation?.(profile._id).catch(() => {});
                    if (res?.data?.conversation) navigate(`/chat/${res.data.conversation._id}`);
                    else navigate('/chat');
                  }}
                  className="btn-secondary text-sm"
                >
                  <MessageCircle size={15} /> Message
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-white">{profile.fullName}</h1>
          <p className="text-zinc-500">@{profile.username}</p>
          {profile.bio && <p className="text-zinc-300 mt-2 text-sm leading-relaxed">{profile.bio}</p>}

          <div className="flex flex-wrap gap-4 mt-3">
            {profile.location && (
              <span className="flex items-center gap-1 text-zinc-500 text-sm">
                <MapPin size={14} /> {profile.location}
              </span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary-400 text-sm hover:underline">
                <LinkIcon size={14} /> {profile.website.replace(/https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-6 border-t border-b border-white/5 py-4">
          {[
            { label: 'Posts', value: posts.length },
            { label: 'Followers', value: profile.followers?.length || 0 },
            { label: 'Following', value: profile.following?.length || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-display font-bold text-white">{value.toLocaleString()}</p>
              <p className="text-zinc-500 text-sm">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-dark-400 p-1 rounded-xl w-fit">
          {tabs.filter((t) => t.id !== 'saved' || isOwn).map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-glow'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        {postsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-square rounded-xl" />
            ))}
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-3">📷</p>
            <p>{activeTab === 'posts' ? 'No posts yet.' : 'No saved posts.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pb-8">
            {displayPosts.map((post) => (
              <Link key={post._id} to={`/post/${post._id}`} className="relative aspect-square group overflow-hidden rounded-xl bg-dark-400">
                {post.media?.[0]?.url ? (
                  post.media[0].type === 'video' ? (
                    <video src={post.media[0].url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={post.media[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 p-4 text-sm text-center">
                    {post.caption?.slice(0, 60) || 'Post'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1 text-white font-semibold text-sm">
                    ❤️ {post.likesCount || post.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1 text-white font-semibold text-sm">
                    💬 {post.commentsCount || post.comments?.length || 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
