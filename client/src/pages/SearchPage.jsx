import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, TrendingUp, Hash,
  AlertTriangle, Compass, Sparkles
} from 'lucide-react';
import { userService, postService } from '../services';
import PostCard from '../components/post/PostCard';
import PostSkeleton from '../components/post/PostSkeleton';
import toast from 'react-hot-toast';

const TRENDING_TAGS = ['#react', '#javascript', '#coding', '#design', '#photography', '#travel', '#music', '#fitness'];

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'people', label: 'People' },
  { id: 'posts', label: 'Posts' },
  { id: 'tags', label: 'Tags' },
];

function UserSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 card animate-pulse">
      <div className="flex items-center gap-3">
        <div className="skeleton w-12 h-12 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
      <div className="skeleton h-8 w-20 rounded-xl" />
    </div>
  );
}

export default function SearchPage() {
  const currentUser = useSelector((state) => state.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const queryParam = searchParams.get('q') || '';
  const tabParam = searchParams.get('tab') || 'all';

  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState(tabParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [toggledFollows, setToggledFollows] = useState({});

  // Discovery / Empty-query State - initialized to true since we load suggestions on mount
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const debounceRef = useRef(null);

  // Derived follow state logic (no sync useEffect needed)
  const isUserFollowing = useCallback((userId) => {
    if (toggledFollows[userId] !== undefined) {
      return toggledFollows[userId];
    }
    if (!currentUser?.following) return false;
    return currentUser.following.some(f => (typeof f === 'object' ? f._id : f) === userId);
  }, [currentUser, toggledFollows]);

  // Load suggested users on mount
  useEffect(() => {
    let isMounted = true;
    userService.getSuggestedUsers()
      .then((res) => {
        if (isMounted) {
          setSuggestedUsers(res.data.users || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load suggestions:', err);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingSuggestions(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync URL search queries when back/forward occurs (asynchronous to satisfy ESLint rule)
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(queryParam);
      setActiveTab(tabParam);
    }, 0);
    return () => clearTimeout(timer);
  }, [queryParam, tabParam]);

  // Perform API call
  const performSearch = useCallback(async (searchQuery, tab) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setUsers([]);
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (tab === 'all') {
        const [usersRes, postsRes] = await Promise.all([
          userService.searchUsers(trimmed),
          postService.searchPosts(trimmed),
        ]);
        setUsers(usersRes.data.users || []);
        setPosts(postsRes.data.posts || []);
      } else if (tab === 'people') {
        const usersRes = await userService.searchUsers(trimmed);
        setUsers(usersRes.data.users || []);
        setPosts([]);
      } else if (tab === 'posts' || tab === 'tags') {
        const queryWithHash = tab === 'tags' && !trimmed.startsWith('#') ? `#${trimmed}` : trimmed;
        const postsRes = await postService.searchPosts(queryWithHash);
        setPosts(postsRes.data.posts || []);
        setUsers([]);
      }
    } catch (err) {
      console.error('Search API failure:', err);
      setError('Failed to fetch search results. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to perform search on URL change (asynchronous to satisfy ESLint rule)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryParam) {
        performSearch(queryParam, tabParam);
      } else {
        setUsers([]);
        setPosts([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [queryParam, tabParam, performSearch]);

  // Handle Input Changes with Debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!val.trim()) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('q');
        return next;
      }, { replace: true });
      setUsers([]);
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      setSearchParams({ q: val, tab: tabParam }, { replace: true });
    }, 450);
  };

  // Switch tabs
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (query.trim()) {
      setSearchParams({ q: query.trim(), tab: newTab }, { replace: true });
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('tab', newTab);
        return next;
      }, { replace: true });
    }
  };

  // Follow/Unfollow handler
  const handleFollowToggle = async (userId) => {
    try {
      const res = await userService.toggleFollow(userId);
      const isNowFollowing = res.data.isFollowing;
      
      setToggledFollows(prev => ({
        ...prev,
        [userId]: isNowFollowing
      }));

      toast.success(isNowFollowing ? 'Followed user' : 'Unfollowed user');
    } catch {
      toast.error('Failed to update follow status.');
    }
  };

  // Quick hashtag tag click
  const handleTagClick = (tag) => {
    const term = tag.startsWith('#') ? tag.slice(1) : tag;
    setQuery(term);
    setActiveTab('tags');
    setSearchParams({ q: term, tab: 'tags' }, { replace: true });
  };

  const clearSearch = () => {
    setQuery('');
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      return next;
    }, { replace: true });
    setUsers([]);
    setPosts([]);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* ─── Header & Input ─────────────────────────────────────────── */}
      <div className="relative mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-4 flex items-center gap-2">
          <Search className="text-primary-500" size={24} /> Search
        </h1>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search users, posts, or tags..."
            className="w-full bg-dark-400 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder-zinc-500 focus:border-primary-500 focus:outline-none text-base transition-colors"
            autoFocus
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Tab Bar Filters ────────────────────────────────────────── */}
      <div className="flex border-b border-white/5 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 min-w-[80px] py-3 text-center text-sm font-medium relative whitespace-nowrap transition-colors duration-200 ${
                isSelected ? 'text-primary-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {isSelected && (
                <motion.div
                  layoutId="activeSearchTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Main Content Views ─────────────────────────────────────── */}
      {error && (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
          <AlertTriangle className="text-red-400 mb-2" size={32} />
          <p className="text-red-200 text-sm font-medium mb-4">{error}</p>
          <button
            onClick={() => performSearch(query, activeTab)}
            className="btn btn-secondary text-xs px-4 py-2"
          >
            Retry
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Loading skeletons */}
        {loading && !error && (
          <motion.div
            key="loading-skeletons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {(activeTab === 'all' || activeTab === 'people') && (
              <div className="space-y-3">
                <UserSkeleton />
                <UserSkeleton />
              </div>
            )}
            {(activeTab === 'all' || activeTab === 'posts' || activeTab === 'tags') && (
              <div className="space-y-6 pt-4">
                <PostSkeleton />
              </div>
            )}
          </motion.div>
        )}

        {/* Discovery Feed (Query is empty) */}
        {!query.trim() && !loading && !error && (
          <motion.div
            key="discovery-feed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Trending Tags */}
            <div>
              <h3 className="flex items-center gap-2 font-display font-semibold text-zinc-300 text-base mb-4">
                <TrendingUp size={16} className="text-primary-500" /> Trending Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="flex items-center gap-1 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white px-4 py-2 rounded-2xl text-sm transition-all"
                  >
                    <Hash size={13} className="text-zinc-500" />
                    <span>{tag.replace('#', '')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Suggested People */}
            <div>
              <h3 className="flex items-center gap-2 font-display font-semibold text-zinc-300 text-base mb-4">
                <Sparkles size={16} className="text-primary-500" /> People You Might Know
              </h3>
              {loadingSuggestions ? (
                <div className="space-y-3">
                  <UserSkeleton />
                  <UserSkeleton />
                </div>
              ) : suggestedUsers.length === 0 ? (
                <div className="card p-6 text-center text-zinc-500 text-sm">
                  No suggestions available right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedUsers.map((su) => {
                    const isFollowing = isUserFollowing(su._id);
                    return (
                      <div
                        key={su._id}
                        className="flex items-center justify-between p-4 card hover:bg-white/5 transition-colors"
                      >
                        <Link to={`/profile/${su.username}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                          <div className="avatar w-12 h-12 flex-shrink-0">
                            {su.avatar?.url ? (
                              <img src={su.avatar.url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold">
                                {su.username?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white group-hover:text-primary-300 truncate transition-colors text-sm">
                              {su.fullName}
                            </p>
                            <p className="text-zinc-500 text-xs truncate">@{su.username}</p>
                          </div>
                        </Link>
                        <button
                          onClick={() => handleFollowToggle(su._id)}
                          className={`btn text-xs px-4 py-2 ${
                            isFollowing
                              ? 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                              : 'btn-primary shadow-sm'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Search Results Display */}
        {query.trim() && !loading && !error && (
          <motion.div
            key={`results-${activeTab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* ALL TAB */}
            {activeTab === 'all' && (
              <div className="space-y-6">
                {/* User section */}
                {users.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      People
                    </h3>
                    <div className="space-y-3">
                      {users.slice(0, 3).map((su) => {
                        const isOwn = currentUser?._id === su._id;
                        const isFollowing = isUserFollowing(su._id);
                        return (
                          <div
                            key={su._id}
                            className="flex items-center justify-between p-4 card hover:bg-white/5 transition-colors"
                          >
                            <Link to={`/profile/${su.username}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                              <div className="avatar w-12 h-12 flex-shrink-0">
                                {su.avatar?.url ? (
                                  <img src={su.avatar.url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold">
                                    {su.username?.[0]?.toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white group-hover:text-primary-300 truncate transition-colors text-sm">
                                  {su.fullName}
                                </p>
                                <p className="text-zinc-500 text-xs truncate">@{su.username}</p>
                              </div>
                            </Link>
                            {!isOwn && (
                              <button
                                onClick={() => handleFollowToggle(su._id)}
                                className={`btn text-xs px-4 py-2 ${
                                  isFollowing
                                    ? 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                                    : 'btn-primary shadow-sm'
                                }`}
                              >
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {users.length > 3 && (
                        <button
                          onClick={() => handleTabChange('people')}
                          className="w-full text-center text-primary-400 hover:text-primary-300 font-medium text-xs py-2"
                        >
                          View all matching people ({users.length}) →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Posts section */}
                {posts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      Posts
                    </h3>
                    <div className="space-y-6">
                      {posts.map((post) => (
                        <PostCard key={post._id} post={post} />
                      ))}
                    </div>
                  </div>
                )}

                {users.length === 0 && posts.length === 0 && (
                  <div className="text-center py-16 bg-dark-400 rounded-2xl p-6">
                    <Compass className="text-zinc-600 mx-auto mb-3" size={40} />
                    <h4 className="text-white font-semibold text-base mb-1">No matches found</h4>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                      We couldn't find any people or posts matching "{query}". Double-check spelling or try other keywords.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PEOPLE TAB */}
            {activeTab === 'people' && (
              <div className="space-y-3">
                {users.length > 0 ? (
                  users.map((su) => {
                    const isOwn = currentUser?._id === su._id;
                    const isFollowing = isUserFollowing(su._id);
                    return (
                      <div
                        key={su._id}
                        className="flex items-center justify-between p-4 card hover:bg-white/5 transition-colors"
                      >
                        <Link to={`/profile/${su.username}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                          <div className="avatar w-12 h-12 flex-shrink-0">
                            {su.avatar?.url ? (
                              <img src={su.avatar.url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold">
                                {su.username?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-white group-hover:text-primary-300 truncate transition-colors text-sm">
                                {su.fullName}
                              </p>
                              {su.isVerified && (
                                <span className="w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center text-[9px] font-bold shadow-sm">
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-500 text-xs truncate">@{su.username} · {su.followers?.length || 0} followers</p>
                            {su.bio && <p className="text-zinc-400 text-xs mt-1 truncate max-w-md">{su.bio}</p>}
                          </div>
                        </Link>
                        {!isOwn && (
                          <button
                            onClick={() => handleFollowToggle(su._id)}
                            className={`btn text-xs px-4 py-2 ${
                              isFollowing
                                ? 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                                : 'btn-primary shadow-sm'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 bg-dark-400 rounded-2xl p-6">
                    <Compass className="text-zinc-600 mx-auto mb-3" size={40} />
                    <h4 className="text-white font-semibold text-base mb-1">No users found</h4>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                      No user accounts match "{query}".
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* POSTS TAB */}
            {activeTab === 'posts' && (
              <div className="space-y-6">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))
                ) : (
                  <div className="text-center py-16 bg-dark-400 rounded-2xl p-6">
                    <Compass className="text-zinc-600 mx-auto mb-3" size={40} />
                    <h4 className="text-white font-semibold text-base mb-1">No posts found</h4>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                      No posts match the query "{query}".
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAGS TAB */}
            {activeTab === 'tags' && (
              <div className="space-y-6">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))
                ) : (
                  <div className="text-center py-16 bg-dark-400 rounded-2xl p-6">
                    <Hash className="text-zinc-600 mx-auto mb-3" size={40} />
                    <h4 className="text-white font-semibold text-base mb-1">No hashtag posts found</h4>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                      We couldn't find any posts matching the hashtag #{query.replace('#', '')}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
