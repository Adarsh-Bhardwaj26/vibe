import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { postService, chatService } from '../services';
import PostCard from '../components/post/PostCard';
import { Loader2 } from 'lucide-react';

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postService.getPost(id)
      .then((res) => setPost(res.data.post))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-4xl mb-3">🔍</p>
        <p>Post not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <PostCard post={post} />
    </div>
  );
}
