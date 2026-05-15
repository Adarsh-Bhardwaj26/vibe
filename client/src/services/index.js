import api from './api';

// ─── Auth Services ────────────────────────────────────────────────────────────
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refreshToken: (token) => api.post('/auth/refresh', { refreshToken: token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.patch(`/auth/reset-password/${token}`, { password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
};

// ─── User Services ────────────────────────────────────────────────────────────
export const userService = {
  getProfile: (username) => api.get(`/users/${username}`),
  updateProfile: (data) => api.put('/users/profile/update', data),
  updateAvatar: (formData) => api.patch('/users/profile/avatar', formData),
  updateCoverImage: (formData) => api.patch('/users/profile/cover', formData),
  changePassword: (data) => api.patch('/users/profile/password', data),
  toggleFollow: (userId) => api.post(`/users/follow/${userId}`),
  searchUsers: (q, page = 1) => api.get(`/users/search?q=${q}&page=${page}`),
  getSuggestedUsers: () => api.get('/users/suggested'),
  getFollowers: (userId) => api.get(`/users/${userId}/followers`),
  getFollowing: (userId) => api.get(`/users/${userId}/following`),
};

// ─── Post Services ────────────────────────────────────────────────────────────
export const postService = {
  createPost: (formData) => api.post('/posts', formData),
  getFeed: (page = 1) => api.get(`/posts/feed?page=${page}`),
  getExplore: (page = 1, hashtag = '') => api.get(`/posts/explore?page=${page}${hashtag ? `&hashtag=${hashtag}` : ''}`),
  getPost: (id) => api.get(`/posts/${id}`),
  getUserPosts: (userId, page = 1) => api.get(`/posts/user/${userId}?page=${page}`),
  deletePost: (id) => api.delete(`/posts/${id}`),
  editPost: (id, data) => api.patch(`/posts/${id}`, data),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  toggleSave: (id) => api.post(`/posts/${id}/save`),
  addComment: (id, text) => api.post(`/posts/${id}/comment`, { text }),
  deleteComment: (postId, commentId) => api.delete(`/posts/${postId}/comment/${commentId}`),
  replyToComment: (postId, commentId, text) => api.post(`/posts/${postId}/comment/${commentId}/reply`, { text }),
  getSavedPosts: () => api.get('/posts/saved'),
  searchPosts: (q, page = 1) => api.get(`/posts/search?q=${q}&page=${page}`),
  reportPost: (id) => api.post(`/posts/${id}/report`),
};

// ─── Chat Services ────────────────────────────────────────────────────────────
export const chatService = {
  getConversations: () => api.get('/chat/conversations'),
  createConversation: (userId) => api.post(`/chat/conversations/${userId}`),
  createGroupConversation: (data) => api.post('/chat/conversations/group', data),
  getMessages: (conversationId, page = 1) => api.get(`/chat/conversations/${conversationId}/messages?page=${page}`),
  sendMessage: (conversationId, data) => api.post(`/chat/conversations/${conversationId}/messages`, data),
  sendMediaMessage: (conversationId, formData) =>
    api.post(`/chat/conversations/${conversationId}/messages`, formData),
  deleteMessage: (messageId, deleteFor = 'me') => api.delete(`/chat/messages/${messageId}?deleteFor=${deleteFor}`),
  addReaction: (messageId, emoji) => api.post(`/chat/messages/${messageId}/reaction`, { emoji }),
};

// ─── Notification Services ────────────────────────────────────────────────────
export const notificationService = {
  getNotifications: (page = 1) => api.get(`/notifications?page=${page}`),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/all/read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// ─── AI Services ────────────────────────────────────────────────────────────
export const aiService = {
  generateCaption: (base64Image) => api.post('/ai/generate-caption', { base64Image }),
  generateSmartReplies: (messageText) => api.post('/ai/smart-replies', { messageText }),
  generateBio: (keywords) => api.post('/ai/generate-bio', { keywords }),
};

// ─── Story Services ─────────────────────────────────────────────────────────
export const storyService = {
  getFeedStories: () => api.get('/stories/feed'),
  createStory: (formData) => api.post('/stories', formData),
  viewStory: (id) => api.patch(`/stories/${id}/view`),
};
