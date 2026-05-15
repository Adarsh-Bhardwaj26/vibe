import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchExplorePosts } from '../redux/slices/postsSlice';
import { userService, postService } from '../services';
import { Search, Hash, TrendingUp, Users, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';

const TRENDING_TAGS = ['#javascript', '#react', '#design', '#photography', '#travel', '#food', '#fitness', '#coding', '#art', '#music'];

export default function ExplorePage() {
  const dispatch = useDispatch();
  const { explore } = useSelector((state) => state.posts);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [searching, setSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTag, setActiveTag] = useState('');
  const debounceRef = useRef(null);
  const pageRef = useRef(1);
  const { ref: loadMoreRef, inView } = useInView();

  useEffect(() => {
    pageRef.current = 1;
    dispatch(fetchExplorePosts({ page: 1, hashtag: activeTag }));
  }, [activeTag]);

  useEffect(() => {
    if (inView && explore.length > 0) {
      pageRef.current += 1;
      dispatch(fetchExplorePosts({ page: pageRef.current, hashtag: activeTag }));
    }
  }, [inView]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults({ users: [], posts: [] });
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [usersRes, postsRes] = await Promise.all([
          userService.searchUsers(searchQuery),
          postService.searchPosts(searchQuery),
        ]);
        setSearchResults({
          users: usersRes.data.users || [],
          posts: postsRes.data.posts || [],
        });
      } catch { } finally { setSearching(false); }
    }, 500);
  }, [searchQuery]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          id="explore-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users, posts, hashtags..."
          className="w-full bg-dark-400 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder-zinc-500 focus:border-primary-500 focus:outline-none text-base"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchQuery && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6">
            {searching ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
            ) : (
              <div className="space-y-4">
                {searchResults.users.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><Users size={14} /> People</h3>
                    <div className="space-y-3">
                      {searchResults.users.map((su) => (
                        <Link key={su._id} to={`/profile/${su.username}`} className="flex items-center gap-3 hover:bg-white/5 rounded-xl p-2 transition-colors">
                          <div className="avatar w-10 h-10">
                            {su.avatar?.url ? <img src={su.avatar.url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold">{su.username?.[0]?.toUpperCase()}</div>}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">{su.fullName}</p>
                            <p className="text-zinc-500 text-xs">@{su.username} · {su.followers?.length || 0} followers</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.posts.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Posts</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {searchResults.posts.slice(0, 9).map((post) => (
                        <Link key={post._id} to={`/post/${post._id}`} className="aspect-square rounded-xl overflow-hidden bg-dark-400">
                          {post.media?.[0]?.url ? (
                            <img src={post.media[0].url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-2 text-xs text-zinc-500 text-center">{post.caption?.slice(0, 40)}</div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {!searching && searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">No results for "{searchQuery}"</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trending Hashtags */}
      {!searchQuery && (
        <>
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-white mb-3">
              <TrendingUp size={18} className="text-primary-400" /> Trending
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag('')}
                className={`badge text-sm px-3 py-1.5 rounded-full cursor-pointer ${!activeTag ? 'bg-primary-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
              >
                All
              </button>
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag.slice(1) ? '' : tag.slice(1))}
                  className={`badge text-sm px-3 py-1.5 rounded-full cursor-pointer transition-all ${
                    activeTag === tag.slice(1) ? 'bg-primary-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Hash size={12} className="inline -mt-0.5" />{tag.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          <div className="columns-2 md:columns-3 gap-3 space-y-3">
            {explore.map((post, i) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="break-inside-avoid mb-3"
              >
                <Link to={`/post/${post._id}`} className="block group rounded-2xl overflow-hidden bg-dark-400 relative">
                  {post.media?.[0]?.url ? (
                    post.media[0].type === 'video' ? (
                      <video src={post.media[0].url} className="w-full object-cover" />
                    ) : (
                      <img src={post.media[0].url} alt="" className="w-full object-cover" loading="lazy" />
                    )
                  ) : (
                    <div className="p-4 min-h-[120px] flex items-center">
                      <p className="text-zinc-300 text-sm leading-relaxed">{post.caption?.slice(0, 100)}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <span className="text-white text-sm font-bold">❤️ {post.likes?.length || 0}</span>
                    <span className="text-white text-sm font-bold">💬 {post.comments?.length || 0}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div ref={loadMoreRef} className="h-8" />
        </>
      )}
    </div>
  );
}
