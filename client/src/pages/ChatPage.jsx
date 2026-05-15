import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, Plus, MoreVertical, ArrowLeft, Image, Smile, Paperclip, Sparkles, Loader2, Mic, Square, Phone, Video } from 'lucide-react';
import { fetchConversations, fetchMessages, addMessage, setActiveConversation } from '../redux/slices/chatSlice';
import { chatService, aiService } from '../services';
import { useSocket } from '../context/SocketContext';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import VideoCallModal from '../components/call/VideoCallModal';

export default function ChatPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { conversations, activeConversation, messages, typingUsers, onlineUsers, loading } = useSelector((state) => state.chat);
  const { socket, joinConversation, leaveConversation, emitTypingStart, emitTypingStop } = useSocket() || {};

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // AI Smart Replies
  const [smartReplies, setSmartReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Voice Notes
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Video / Audio Call — declared early so useEffect below can reference it
  const [callState, setCallState] = useState(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!socket) return;
    const onCallOffer = ({ fromUser, offer, callType }) => {
      setCallState(prev => {
        if (prev) {
          socket.emit('call_reject', { toUserId: fromUser._id });
          return prev;
        }
        return { remoteUser: fromUser, callType, isCaller: false, offer };
      });
    };
    socket.on('call_offer', onCallOffer);
    return () => socket.off('call_offer', onCallOffer);
  }, [socket]);

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  useEffect(() => {
    if (conversationId) {
      const conv = conversations.find((c) => c._id === conversationId);
      if (conv) {
        dispatch(setActiveConversation(conv));
        dispatch(fetchMessages({ conversationId, page: 1 }));
        joinConversation?.(conversationId);
        setMobileChatOpen(true);
      }
    }
    return () => {
      if (conversationId) leaveConversation?.(conversationId);
    };
  }, [conversationId, conversations]);

  const currentMessages = activeConversation ? (messages[activeConversation._id] || []) : [];
  const activeTypingUsers = activeConversation ? (typingUsers[activeConversation._id] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Check if we should generate smart replies
    if (currentMessages.length > 0) {
      const lastMsg = currentMessages[currentMessages.length - 1];
      const isMine = lastMsg.sender?._id === user?._id || lastMsg.sender === user?._id;
      
      if (!isMine && lastMsg.content && !lastMsg.isDeleted) {
        setLoadingReplies(true);
        aiService.generateSmartReplies(lastMsg.content)
          .then(res => {
            if (res.data?.replies) setSmartReplies(res.data.replies);
          })
          .catch(err => console.error("Smart replies failed:", err))
          .finally(() => setLoadingReplies(false));
      } else {
        setSmartReplies([]);
      }
    }
  }, [messages[activeConversation?._id]]);

  const getConversationPartner = (conv) => {
    if (!conv || conv.isGroup) return null;
    return conv.participants?.find((p) => p._id !== user?._id) || conv.participants?.[0];
  };

  const handleStartCall = (callType) => {
    const partner = getConversationPartner(activeConversation);
    if (!partner) return;
    if (!onlineUsers.includes(partner._id)) {
      toast.error(`${partner.username} is offline.`);
      return;
    }
    setCallState({ remoteUser: partner, callType, isCaller: true, offer: null });
  };

  const handleSelectConversation = (conv) => {
    dispatch(setActiveConversation(conv));
    navigate(`/chat/${conv._id}`);
    dispatch(fetchMessages({ conversationId: conv._id, page: 1 }));
    joinConversation?.(conv._id);
    setMobileChatOpen(true);
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      emitTypingStart?.(activeConversation._id);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      emitTypingStop?.(activeConversation._id);
    }, 1500);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() && !isRecording && !activeConversation) return;
    setSending(true);
    emitTypingStop?.(activeConversation._id);
    setIsTyping(false);
    setSmartReplies([]); // clear chips when user sends a message
    try {
      await chatService.sendMessage(activeConversation._id, { content: messageText.trim() });
      setMessageText('');
    } catch (err) {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voicenote.webm', { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('media', file);
        formData.append('messageType', 'audio');
        
        setSending(true);
        try {
          await chatService.sendMediaMessage(activeConversation._id, formData);
        } catch (error) {
          toast.error('Failed to send voice note.');
        } finally {
          setSending(false);
        }
        
        // Stop all tracks to turn off the microphone light
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Microphone access denied or unavailable.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;
    const formData = new FormData();
    formData.append('media', file);
    formData.append('messageType', file.type.startsWith('video') ? 'video' : 'image');
    try {
      await chatService.sendMediaMessage(activeConversation._id, formData);
    } catch {
      toast.error('Failed to send media.');
    }
    e.target.value = '';
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const partner = getConversationPartner(conv);
    const name = conv.isGroup ? conv.groupName : (partner?.fullName || partner?.username || '');
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isOnline = (conv) => {
    const partner = getConversationPartner(conv);
    return partner && onlineUsers.includes(partner._id);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Conversation List ─────────────────────────────────────── */}
      <div className={`w-full lg:w-96 flex-shrink-0 border-r border-white/5 bg-dark-50 flex flex-col ${mobileChatOpen ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white text-xl">Messages</h2>
            <button onClick={() => navigate('/search')} className="btn-icon">
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="chat-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-3 w-28 rounded" />
                  <div className="skeleton h-2 w-40 rounded" />
                </div>
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm px-4">
              <p className="text-4xl mb-3">💬</p>
              No conversations yet. Start chatting!
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const partner = getConversationPartner(conv);
              const online = isOnline(conv);
              const isActive = activeConversation?._id === conv._id;
              const displayName = conv.isGroup ? conv.groupName : (partner?.fullName || partner?.username);
              const lastMsg = conv.lastMessage;

              return (
                <button
                  id={`conv-${conv._id}`}
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-all ${isActive ? 'bg-primary-600/10 border-r-2 border-primary-500' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="avatar w-12 h-12">
                      {(conv.isGroup ? conv.groupAvatar?.url : partner?.avatar?.url) ? (
                        <img src={conv.isGroup ? conv.groupAvatar.url : partner.avatar.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold text-lg">
                          {displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    {online && <div className="online-dot" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white text-sm truncate">{displayName}</p>
                      {lastMsg && (
                        <p className="text-zinc-600 text-xs ml-2 flex-shrink-0">
                          {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
                        </p>
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs truncate mt-0.5">
                      {lastMsg?.isDeleted ? 'Message deleted' : (lastMsg?.content || '📎 Media')}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Chat Window ──────────────────────────────────────────────── */}
      {activeConversation ? (
        <div className={`flex-1 flex flex-col ${!mobileChatOpen ? 'hidden lg:flex' : 'flex'}`}>
          {/* Chat header */}
          {(() => {
            const partner = getConversationPartner(activeConversation);
            const online = partner && onlineUsers.includes(partner._id);
            const displayName = activeConversation.isGroup ? activeConversation.groupName : (partner?.fullName || partner?.username);
            return (
              <div className="flex items-center gap-4 px-5 py-4 border-b border-white/5 bg-dark-50">
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="lg:hidden btn-icon"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="relative">
                  <div className="avatar w-10 h-10">
                    {(activeConversation.isGroup ? activeConversation.groupAvatar?.url : partner?.avatar?.url) ? (
                      <img src={activeConversation.isGroup ? activeConversation.groupAvatar.url : partner.avatar.url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 font-bold">
                        {displayName?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  {online && <div className="online-dot" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-zinc-500">
                    {online ? '● Online' : partner?.lastActive ? `Last seen ${formatDistanceToNow(new Date(partner.lastActive), { addSuffix: true })}` : 'Offline'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!activeConversation.isGroup && (
                    <>
                      <button
                        onClick={() => handleStartCall('audio')}
                        className="btn-icon"
                        title="Audio Call"
                      >
                        <Phone size={18} />
                      </button>
                      <button
                        onClick={() => handleStartCall('video')}
                        className="btn-icon"
                        title="Video Call"
                      >
                        <Video size={18} />
                      </button>
                    </>
                  )}
                  <button className="btn-icon"><MoreVertical size={18} /></button>
                </div>
              </div>
            );
          })()}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">
            {currentMessages.map((msg, i) => {
              const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;
              const showAvatar = !isMine && (i === 0 || currentMessages[i - 1]?.sender?._id !== msg.sender?._id);

              return (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <div className={`avatar w-7 h-7 flex-shrink-0 ${showAvatar ? 'visible' : 'invisible'}`}>
                      {msg.sender?.avatar?.url ? (
                        <img src={msg.sender.avatar.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 text-xs font-bold">
                          {msg.sender?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={isMine ? 'chat-bubble-sent' : 'chat-bubble-received'}>
                    {msg.isDeleted ? (
                      <p className="italic opacity-50 text-sm">{msg.content}</p>
                    ) : msg.media?.url ? (
                      msg.messageType === 'audio' || msg.media.type === 'audio' ? (
                        <audio src={msg.media.url} controls className="max-w-[200px] h-10" />
                      ) : msg.media.type === 'image' ? (
                        <img src={msg.media.url} className="rounded-xl max-w-[200px]" alt="media" />
                      ) : (
                        <video src={msg.media.url} controls className="rounded-xl max-w-[200px]" />
                      )
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/50' : 'text-zinc-600'}`}>
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </p>
                  </div>
                </motion.div>
              );
            })}

            {/* Typing indicator */}
            {activeTypingUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="chat-bubble-received py-2">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Smart Replies */}
          <AnimatePresence>
            {smartReplies.length > 0 && !loadingReplies && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="px-5 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide bg-dark-50"
              >
                <Sparkles size={14} className="text-primary-400 flex-shrink-0" />
                {smartReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMessageText(reply);
                    }}
                    className="flex-shrink-0 bg-primary-600/10 hover:bg-primary-600/20 text-primary-300 border border-primary-500/20 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                  >
                    {reply}
                  </button>
                ))}
              </motion.div>
            )}
            {loadingReplies && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-5 py-2 flex items-center gap-2 bg-dark-50"
              >
                <Loader2 size={14} className="text-primary-400 animate-spin" />
                <span className="text-xs text-primary-400">AI is thinking...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message input */}
          <div className="px-5 py-4 border-t border-white/5 bg-dark-50">
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-icon flex-shrink-0">
                <Image size={18} />
              </button>
              <input
                id="message-input"
                value={messageText}
                onChange={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                disabled={isRecording}
                placeholder={isRecording ? "Recording voice note..." : "Type a message..."}
                className={`flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:border-primary-500 focus:outline-none transition-colors ${isRecording ? 'animate-pulse text-red-400 font-semibold placeholder-red-400' : ''}`}
              />
              {messageText.trim() ? (
                <motion.button
                  id="send-btn"
                  type="submit"
                  disabled={sending}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 w-10 h-10 bg-primary-600 hover:bg-primary-500 rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors"
                >
                  <Send size={16} className="text-white" />
                </motion.button>
              ) : isRecording ? (
                <motion.button
                  type="button"
                  onClick={handleStopRecording}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 w-10 h-10 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-xl flex items-center justify-center transition-colors animate-pulse"
                >
                  <Square size={16} fill="currentColor" />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={sending}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  <Mic size={18} />
                </motion.button>
              )}
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-bold text-white mb-2">Your Messages</h3>
          <p className="text-zinc-500 mb-6">Select a conversation or start a new one.</p>
        </div>
      )}

      {/* ─── Video / Audio Call Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {callState && (
          <VideoCallModal
            key="video-call"
            socket={socket}
            currentUser={user}
            remoteUser={callState.remoteUser}
            callType={callState.callType}
            isCaller={callState.isCaller}
            incomingOffer={callState.offer}
            onClose={() => setCallState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
