import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFeed } from '../redux/slices/postsSlice';
import PostCard from '../components/post/PostCard';
import PostSkeleton from '../components/post/PostSkeleton';
import SuggestedUsers from '../components/user/SuggestedUsers';
import StoriesRow from '../components/ui/StoriesRow';
import { useInView } from 'react-intersection-observer';

export default function HomePage() {
  const dispatch = useDispatch();
  const { feed, feedPagination, loading } = useSelector((state) => state.posts);
  const { user } = useSelector((state) => state.auth);
  const pageRef = useRef(1);
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    pageRef.current = 1;
    dispatch(fetchFeed(1));
  }, [dispatch]);

  useEffect(() => {
    if (inView && feedPagination.hasMore && !loading) {
      pageRef.current += 1;
      dispatch(fetchFeed(pageRef.current));
    }
  }, [inView]);

  return (
    <div className="flex justify-center max-w-[1500px] mx-auto px-6 py-8 gap-12 xl:gap-20">
      {/* ─── Feed ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-3xl mx-auto w-full">
        {/* Stories */}
        <StoriesRow />

        {/* Posts */}
        <div className="space-y-6 mt-8">
          {loading && feed.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
          ) : feed.length === 0 ? (
            <EmptyFeed />
          ) : (
            <AnimatePresence initial={false}>
              {feed.map((post, idx) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="h-4">
            {loading && feed.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {!feedPagination.hasMore && feed.length > 0 && (
            <p className="text-center text-zinc-600 text-sm py-8">
              You've seen all posts! 🎉 Follow more people to see more.
            </p>
          )}
        </div>
      </div>

      {/* ─── Sidebar (Suggested Users) ────────────────────────────── */}
      <div className="hidden xl:block w-[420px] flex-shrink-0">
        <div className="sticky top-6">
          <SuggestedUsers />
        </div>
      </div>
    </div>
  );
}

function EmptyFeed() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-20"
    >
      <div className="text-6xl mb-4">✨</div>
      <h3 className="text-xl font-bold text-white mb-2">Your feed is empty</h3>
      <p className="text-zinc-500 mb-6">Follow people to see their posts here.</p>
      <a href="/explore" className="btn-primary">Explore posts</a>
    </motion.div>
  );
}
