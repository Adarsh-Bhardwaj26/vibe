import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import {
  addMessage,
  setTypingUser,
  setOnlineUsers,
  setUserOnline,
  setUserOffline,
} from '../redux/slices/chatSlice';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { activeConversation } = useSelector((state) => state.chat);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token = localStorage.getItem('accessToken');
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      socket.emit('get_online_users');
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    // ─── Presence ────────────────────────────────────────────────────────
    socket.on('online_users', (users) => {
      dispatch(setOnlineUsers(users));
    });
    socket.on('user_online', ({ userId }) => {
      dispatch(setUserOnline(userId));
    });
    socket.on('user_offline', ({ userId }) => {
      dispatch(setUserOffline(userId));
    });

    // ─── Messages ─────────────────────────────────────────────────────────
    socket.on('new_message', (message) => {
      dispatch(addMessage({ conversationId: message.conversation, message }));

      // Toast if not in that conversation
      if (activeConversation?._id !== message.conversation) {
        toast.custom(
          (t) => (
            <div className={`${t.visible ? 'animate-slide-up' : 'opacity-0'} flex items-center gap-3 bg-dark-400 border border-white/10 rounded-xl px-4 py-3 shadow-card`}>
              <img
                src={message.sender?.avatar?.url || '/default-avatar.png'}
                className="w-9 h-9 rounded-full object-cover"
                alt=""
              />
              <div>
                <p className="text-sm font-semibold text-white">{message.sender?.username}</p>
                <p className="text-xs text-zinc-400 truncate max-w-[180px]">{message.content || '📎 Media'}</p>
              </div>
            </div>
          ),
          { duration: 4000 }
        );
      }
    });

    // ─── Typing ───────────────────────────────────────────────────────────
    socket.on('typing_start', ({ userId, conversationId }) => {
      dispatch(setTypingUser({ conversationId, userId, isTyping: true }));
    });
    socket.on('typing_stop', ({ userId, conversationId }) => {
      dispatch(setTypingUser({ conversationId, userId, isTyping: false }));
    });

    // ─── Notifications ────────────────────────────────────────────────────
    socket.on('notification', ({ type, sender, message }) => {
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-slide-up' : 'opacity-0'} flex items-center gap-3 bg-dark-400 border border-white/10 rounded-xl px-4 py-3 shadow-card`}>
            <img
              src={sender?.avatar?.url || '/default-avatar.png'}
              className="w-9 h-9 rounded-full object-cover"
              alt=""
            />
            <p className="text-sm text-white">{message}</p>
          </div>
        ),
        { duration: 4000 }
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?._id]);

  const joinConversation = (conversationId) => {
    socketRef.current?.emit('join_conversation', conversationId);
  };

  const leaveConversation = (conversationId) => {
    socketRef.current?.emit('leave_conversation', conversationId);
  };

  const emitTypingStart = (conversationId) => {
    socketRef.current?.emit('typing_start', { conversationId });
  };

  const emitTypingStop = (conversationId) => {
    socketRef.current?.emit('typing_stop', { conversationId });
  };

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, joinConversation, leaveConversation, emitTypingStart, emitTypingStop }}
    >
      {children}
    </SocketContext.Provider>
  );
};
