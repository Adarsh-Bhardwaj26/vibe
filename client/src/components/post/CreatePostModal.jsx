import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Video, MapPin, Hash, Smile, Loader2, Upload, Sparkles, Wand2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { createPost } from '../../redux/slices/postsSlice';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { aiService } from '../../services';

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export default function CreatePostModal({ onClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { creating } = useSelector((state) => state.posts);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'ai'
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratingImage, setAiGeneratingImage] = useState(false);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

  const handleGenerateCaption = async () => {
    setIsGeneratingAI(true);
    try {
      let base64Image = null;
      // If there's an image attached, send the first one to the AI
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        base64Image = await fileToBase64(files[0]);
      }
      const res = await aiService.generateCaption(base64Image);
      if (res.data?.caption) {
        setCaption((prev) => prev ? prev + '\n\n' + res.data.caption : res.data.caption);
        toast.success('AI caption generated!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate caption. Ensure API key is set.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const onDrop = useCallback((accepted) => {
    if (files.length + accepted.length > MAX_FILES) {
      toast.error(`Max ${MAX_FILES} files allowed.`);
      return;
    }
    const validFiles = accepted.filter((f) => f.size <= MAX_SIZE);
    setFiles((prev) => [...prev, ...validFiles]);
    const newPreviews = validFiles.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' : 'image',
      name: f.name,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
    },
    multiple: true,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerateAIImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt first.');
      return;
    }
    setAiGeneratingImage(true);
    try {
      const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPrompt)}?width=1080&height=1080&nologo=true`;
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      
      if (!blob.type.startsWith('image/')) {
        throw new Error('Invalid image format returned');
      }

      const extension = blob.type.split('/')[1] || 'jpeg';
      const file = new File([blob], `ai-generated.${extension}`, { type: blob.type });
      
      setFiles([file]);
      setPreviews([{
        url: URL.createObjectURL(file),
        type: 'image',
        name: `ai-generated.${extension}`,
      }]);
      setActiveTab('upload');
      setAiPrompt('');
      toast.success('AI Image generated successfully!');
    } catch (error) {
      toast.error('Failed to generate image.');
    } finally {
      setAiGeneratingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && files.length === 0) {
      toast.error('Add a caption or media to post.');
      return;
    }

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('location', location);
    files.forEach((file) => formData.append('media', file));

    const result = await dispatch(createPost(formData));
    if (createPost.fulfilled.match(result)) {
      toast.success('Post created! 🚀');
      onClose();
    } else {
      toast.error(result.payload || 'Failed to create post.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg card shadow-card max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-display font-bold text-white">Create Post</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="avatar w-10 h-10">
              {user?.avatar?.url ? (
                <img src={user.avatar.url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{user?.fullName}</p>
              <p className="text-zinc-500 text-xs">@{user?.username}</p>
            </div>
          </div>

          {/* Caption */}
          <textarea
            id="post-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind? Use #hashtags to reach more people..."
            className="w-full bg-transparent text-white placeholder-zinc-600 resize-none text-base outline-none min-h-[120px]"
            maxLength={2200}
          />

          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={handleGenerateCaption}
              disabled={isGeneratingAI}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-all disabled:opacity-50"
            >
              {isGeneratingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isGeneratingAI ? 'Generating...' : 'AI Auto-Caption'}
            </button>
            <div className="text-xs text-zinc-600">{caption.length}/2200</div>
          </div>

          {/* Tabs for Upload vs AI */}
          <div className="flex border-b border-white/5 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-sm font-semibold flex justify-center items-center gap-2 ${activeTab === 'upload' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Upload size={16} /> Upload Media
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2 text-sm font-semibold flex justify-center items-center gap-2 ${activeTab === 'ai' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Wand2 size={16} /> AI Generate
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-primary-500 bg-primary-500/5' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <input {...getInputProps()} id="media-upload" />
              <Upload size={24} className="mx-auto mb-2 text-zinc-500" />
              <p className="text-zinc-400 text-sm">
                {isDragActive ? 'Drop files here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-zinc-600 text-xs mt-1">Images & Videos · Max 50MB each · Up to 10 files</p>
            </div>
          ) : (
            <div className="bg-dark-100 rounded-xl p-4 border border-white/5 space-y-3">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prompt</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="A futuristic cyberpunk city with neon lights, highly detailed, 4k..."
                className="w-full bg-dark-50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:border-primary-500 focus:outline-none resize-none h-20"
              />
              <button
                type="button"
                onClick={handleGenerateAIImage}
                disabled={aiGeneratingImage || !aiPrompt.trim()}
                className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {aiGeneratingImage ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {aiGeneratingImage ? 'Generating Masterpiece...' : 'Generate Image'}
              </button>
            </div>
          )}

          {/* Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-dark-400">
                  {preview.type === 'video' ? (
                    <video src={preview.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center hover:bg-black"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5">
            <MapPin size={16} className="text-zinc-500 flex-shrink-0" />
            <input
              id="post-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location..."
              className="bg-transparent text-white text-sm placeholder-zinc-600 flex-1 outline-none"
            />
          </div>

          {/* Submit */}
          <button
            id="submit-post-btn"
            type="submit"
            disabled={creating || (!caption.trim() && files.length === 0)}
            className="btn-primary w-full py-3"
          >
            {creating ? (
              <><Loader2 size={18} className="animate-spin" /> Publishing...</>
            ) : (
              'Share Post 🚀'
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
