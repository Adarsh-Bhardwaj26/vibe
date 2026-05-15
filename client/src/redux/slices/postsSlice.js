import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postService } from '../../services';

// ─── Async Thunks ─────────────────────────────────────────────────────────────
export const fetchFeed = createAsyncThunk('posts/fetchFeed', async (page, { rejectWithValue }) => {
  try {
    const res = await postService.getFeed(page);
    return { ...res.data, page };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load feed.');
  }
});

export const fetchExplorePosts = createAsyncThunk('posts/fetchExplore', async ({ page, hashtag } = {}, { rejectWithValue }) => {
  try {
    const res = await postService.getExplore(page, hashtag);
    return { ...res.data, page };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createPost = createAsyncThunk('posts/createPost', async (formData, { rejectWithValue }) => {
  try {
    const res = await postService.createPost(formData);
    return res.data.post;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create post.');
  }
});

export const toggleLike = createAsyncThunk('posts/toggleLike', async (postId, { rejectWithValue }) => {
  try {
    const res = await postService.toggleLike(postId);
    return { postId, ...res.data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const toggleSave = createAsyncThunk('posts/toggleSave', async (postId, { rejectWithValue }) => {
  try {
    const res = await postService.toggleSave(postId);
    return { postId, ...res.data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deletePost = createAsyncThunk('posts/deletePost', async (postId, { rejectWithValue }) => {
  try {
    await postService.deletePost(postId);
    return postId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────
const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    feed: [],
    explore: [],
    feedPagination: { page: 1, hasMore: true },
    loading: false,
    creating: false,
    error: null,
  },
  reducers: {
    clearPosts: (state) => {
      state.feed = [];
      state.feedPagination = { page: 1, hasMore: true };
    },
    addCommentToPost: (state, action) => {
      const { postId, comment } = action.payload;
      const post = state.feed.find((p) => p._id === postId);
      if (post) post.comments.push(comment);
    },
  },
  extraReducers: (builder) => {
    // Fetch Feed
    builder.addCase(fetchFeed.pending, (state) => { state.loading = true; });
    builder.addCase(fetchFeed.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload.page === 1) {
        state.feed = action.payload.posts;
      } else {
        state.feed = [...state.feed, ...action.payload.posts];
      }
      state.feedPagination = {
        page: action.payload.page,
        hasMore: action.payload.pagination?.hasMore ?? false,
      };
    });
    builder.addCase(fetchFeed.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Explore
    builder.addCase(fetchExplorePosts.fulfilled, (state, action) => {
      if (action.payload.page === 1) {
        state.explore = action.payload.posts;
      } else {
        state.explore = [...state.explore, ...action.payload.posts];
      }
    });

    // Create
    builder.addCase(createPost.pending, (state) => { state.creating = true; });
    builder.addCase(createPost.fulfilled, (state, action) => {
      state.creating = false;
      state.feed.unshift(action.payload);
    });
    builder.addCase(createPost.rejected, (state, action) => {
      state.creating = false;
      state.error = action.payload;
    });

    // Like
    builder.addCase(toggleLike.fulfilled, (state, action) => {
      const { postId, isLiked, likesCount } = action.payload;
      const update = (arr) => {
        const post = arr.find((p) => p._id === postId);
        if (post) { post.isLiked = isLiked; post.likesCount = likesCount; }
      };
      update(state.feed);
      update(state.explore);
    });

    // Save
    builder.addCase(toggleSave.fulfilled, (state, action) => {
      const { postId, isSaved } = action.payload;
      const update = (arr) => {
        const post = arr.find((p) => p._id === postId);
        if (post) post.isSaved = isSaved;
      };
      update(state.feed);
      update(state.explore);
    });

    // Delete
    builder.addCase(deletePost.fulfilled, (state, action) => {
      state.feed = state.feed.filter((p) => p._id !== action.payload);
      state.explore = state.explore.filter((p) => p._id !== action.payload);
    });
  },
});

export const { clearPosts, addCommentToPost } = postsSlice.actions;
export default postsSlice.reducer;
