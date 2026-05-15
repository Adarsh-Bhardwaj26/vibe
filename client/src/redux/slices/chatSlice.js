import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chatService } from '../../services';

export const fetchConversations = createAsyncThunk('chat/fetchConversations', async (_, { rejectWithValue }) => {
  try {
    const res = await chatService.getConversations();
    return res.data.conversations;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async ({ conversationId, page = 1 }, { rejectWithValue }) => {
  try {
    const res = await chatService.getMessages(conversationId, page);
    return { conversationId, messages: res.data.messages, page, pagination: res.data.pagination };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    activeConversation: null,
    messages: {},      // { [conversationId]: Message[] }
    typingUsers: {},   // { [conversationId]: userId[] }
    onlineUsers: [],
    loading: false,
    messagesLoading: false,
  },
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    addMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      // Avoid duplicates
      if (!state.messages[conversationId].find((m) => m._id === message._id)) {
        state.messages[conversationId].push(message);
      }
      // Update conversation last message
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.lastMessage = message;
        conv.updatedAt = message.createdAt;
        // Bubble to top
        state.conversations = [conv, ...state.conversations.filter((c) => c._id !== conversationId)];
      }
    },
    setTypingUser: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) state.typingUsers[conversationId] = [];
      if (isTyping) {
        if (!state.typingUsers[conversationId].includes(userId)) {
          state.typingUsers[conversationId].push(userId);
        }
      } else {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter((id) => id !== userId);
      }
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setUserOnline: (state, action) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    setUserOffline: (state, action) => {
      state.onlineUsers = state.onlineUsers.filter((id) => id !== action.payload);
    },
    deleteMessage: (state, action) => {
      const { conversationId, messageId } = action.payload;
      if (state.messages[conversationId]) {
        const msg = state.messages[conversationId].find((m) => m._id === messageId);
        if (msg) msg.isDeleted = true;
      }
    },
    addConversation: (state, action) => {
      const exists = state.conversations.find((c) => c._id === action.payload._id);
      if (!exists) state.conversations.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchConversations.pending, (state) => { state.loading = true; });
    builder.addCase(fetchConversations.fulfilled, (state, action) => {
      state.loading = false;
      state.conversations = action.payload;
    });
    builder.addCase(fetchConversations.rejected, (state) => { state.loading = false; });

    builder.addCase(fetchMessages.pending, (state) => { state.messagesLoading = true; });
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      state.messagesLoading = false;
      const { conversationId, messages, page } = action.payload;
      if (page === 1) {
        state.messages[conversationId] = messages;
      } else {
        state.messages[conversationId] = [...messages, ...(state.messages[conversationId] || [])];
      }
    });
    builder.addCase(fetchMessages.rejected, (state) => { state.messagesLoading = false; });
  },
});

export const {
  setActiveConversation,
  addMessage,
  setTypingUser,
  setOnlineUsers,
  setUserOnline,
  setUserOffline,
  deleteMessage,
  addConversation,
} = chatSlice.actions;
export default chatSlice.reducer;
