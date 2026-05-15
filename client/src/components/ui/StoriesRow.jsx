import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { PlusCircle, Loader2, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { storyService } from '../../services';
import toast from 'react-hot-toast';

const STORY_COLORS = [
  'from-primary-500 to-accent-pink',
  'from-accent-orange to-yellow-400',
  'from-cyan-500 to-primary-500',
  'from-emerald-500 to-cyan-500',
  'from-accent-pink to-accent-orange',
];

export default function StoriesRow() {
  const { user } = useSelector((state) => state.auth);
  const [groupedStories, setGroupedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Viewer state
  const [activeGroupIndex, setActiveGroupIndex] = useState(-1);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const fileInputRef = useRef(null);

  const loadStories = async () => {
    try {
      const res = await storyService.getFeedStories();
      setGroupedStories(res.data.groupedStories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('media', file);
    try {
      await storyService.createStory(formData);
      toast.success('Story posted!');
      loadStories();
    } catch (err) {
      toast.error('Failed to post story.');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const openViewer = async (groupIndex) => {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0);
    // Mark first story as viewed
    const storyId = groupedStories[groupIndex].stories[0]._id;
    await storyService.viewStory(storyId).catch(() => {});
  };

  const nextStory = async () => {
    const group = groupedStories[activeGroupIndex];
    if (activeStoryIndex < group.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
      await storyService.viewStory(group.stories[activeStoryIndex + 1]._id).catch(() => {});
    } else if (activeGroupIndex < groupedStories.length - 1) {
      setActiveGroupIndex(prev => prev + 1);
      setActiveStoryIndex(0);
      await storyService.viewStory(groupedStories[activeGroupIndex + 1].stories[0]._id).catch(() => {});
    } else {
      setActiveGroupIndex(-1); // Close viewer
    }
  };

  const prevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else if (activeGroupIndex > 0) {
      setActiveGroupIndex(prev => prev - 1);
      setActiveStoryIndex(groupedStories[activeGroupIndex - 1].stories.length - 1);
    }
  };

  return (
    <>
      <div className="card p-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
          {/* Create Story Button */}
          <div 
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
          >
            <div className="relative w-14 h-14 rounded-full border-2 border-dashed border-white/20 hover:border-primary-500 transition-colors flex items-center justify-center bg-white/5">
              {uploading ? (
                <Loader2 size={20} className="text-primary-500 animate-spin" />
              ) : user?.avatar?.url ? (
                <img src={user.avatar.url} className="w-12 h-12 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold text-lg">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              )}
              {!uploading && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center border-2 border-dark-50">
                  <PlusCircle size={12} className="text-white" />
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate w-14 text-center">Your story</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleUpload} />
          </div>

          {/* User Stories */}
          {groupedStories.map((group, i) => {
            const hasUnviewed = group.stories.some(s => !s.viewers?.includes(user?._id));
            return (
              <div key={group.author._id} onClick={() => openViewer(i)} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer">
                <div className={`w-14 h-14 rounded-full p-0.5 bg-gradient-to-br ${hasUnviewed ? STORY_COLORS[i % STORY_COLORS.length] : 'from-zinc-600 to-zinc-700'}`}>
                  <div className="w-full h-full rounded-full bg-dark-400 border-2 border-dark-50 flex items-center justify-center overflow-hidden">
                    {group.author.avatar?.url ? (
                      <img src={group.author.avatar.url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">{group.author.username[0].toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-zinc-400 truncate w-14 text-center">{group.author.username}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {activeGroupIndex >= 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-md">
          <button onClick={() => setActiveGroupIndex(-1)} className="absolute top-6 right-6 text-white hover:text-zinc-300 z-10">
            <X size={32} />
          </button>
          
          {/* Navigation */}
          <button onClick={prevStory} className="absolute left-4 md:left-20 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4">
            <ChevronLeft size={48} />
          </button>
          <button onClick={nextStory} className="absolute right-4 md:right-20 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4">
            <ChevronRight size={48} />
          </button>

          {/* Content */}
          <div className="relative w-full max-w-[400px] h-[80vh] md:h-[90vh] bg-dark-50 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center gap-3">
              <div className="flex gap-1 absolute top-2 left-2 right-2">
                {groupedStories[activeGroupIndex].stories.map((_, idx) => (
                  <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div className={`h-full bg-white ${idx <= activeStoryIndex ? 'w-full' : 'w-0'}`} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <img src={groupedStories[activeGroupIndex].author.avatar?.url || `https://ui-avatars.com/api/?name=${groupedStories[activeGroupIndex].author.username}&background=random`} className="w-8 h-8 rounded-full" />
                <p className="text-white font-semibold text-sm shadow-black drop-shadow-md">{groupedStories[activeGroupIndex].author.username}</p>
              </div>
            </div>

            {/* Media */}
            {groupedStories[activeGroupIndex].stories[activeStoryIndex].media.type === 'video' ? (
              <video 
                src={groupedStories[activeGroupIndex].stories[activeStoryIndex].media.url} 
                autoPlay 
                playsInline
                className="w-full h-full object-contain bg-black"
                onEnded={nextStory}
              />
            ) : (
              <img 
                src={groupedStories[activeGroupIndex].stories[activeStoryIndex].media.url} 
                className="w-full h-full object-contain bg-black"
                onClick={nextStory}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
