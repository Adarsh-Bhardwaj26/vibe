# 🌟 Vibe — Social Media & Real-Time Chat Platform

<div align="center">

![Vibe Banner](https://placehold.co/1200x400/0f0f0f/7c3aed?text=Vibe+%E2%80%94+Connect.+Share.+Inspire.&font=raleway)

**A production-grade social media + real-time chat application**  
*Instagram × Discord × WhatsApp — built with the MERN stack*

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=nodedotjs)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://mongodb.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socketdotio)](https://socket.io)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

</div>

---

## ✨ Features

### 🔐 Authentication
- Register/Login with JWT (access + refresh token rotation)
- Email verification flow
- Forgot/reset password via email
- Persistent sessions with HTTP-only cookies
- Role-based access control (user, moderator, admin)

### 👤 User Profiles
- Avatar & cover image upload (Cloudinary)
- Bio, location, website, social links
- Followers/following system
- Activity stats (posts, followers, following)
- Edit profile

### 📱 Social Feed
- Home feed (posts from followed users)
- Create posts with up to 10 images/videos (drag-and-drop)
- Like/unlike posts
- Comment & reply system
- Save/bookmark posts
- Infinite scroll
- Share posts
- Report posts
- Hashtag support

### 🔍 Explore
- Masonry-style grid layout
- Trending hashtag filters
- Debounced user & post search
- Search results (people + posts)

### 💬 Real-Time Chat (Socket.io)
- One-to-one & group conversations
- Real-time messaging
- Typing indicators
- Online/offline presence
- Media sharing (images/videos)
- Message reactions (emoji)
- Message delete (for me / for everyone)
- Unread message count
- Toast notifications for new messages

### 🔔 Notifications
- Real-time notifications (via socket)
- Like, comment, reply, follow, message, mention events
- Mark as read / mark all read
- Delete notifications

### 🛡️ Admin Dashboard
- Platform statistics (users, posts, reports)
- User management (activate/deactivate)
- Content moderation (reported posts)
- Force-remove content

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion |
| **State** | Redux Toolkit, Redux Persist |
| **Routing** | React Router v6 |
| **HTTP Client** | Axios (with interceptors) |
| **Real-time** | Socket.io Client |
| **Icons** | Lucide React |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas + Mongoose |
| **Auth** | JWT (access + refresh), bcryptjs |
| **File Upload** | Multer + Cloudinary |
| **Email** | Nodemailer |
| **Security** | Helmet, express-rate-limit, CORS |
| **Deployment** | Vercel (frontend), Render (backend), MongoDB Atlas |

---

## 📁 Project Structure

```
vibe/
├── server/                    # Express.js Backend
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── cloudinary.js      # Cloudinary config
│   ├── controllers/
│   │   ├── authController.js  # Auth logic
│   │   ├── userController.js  # User management
│   │   ├── postController.js  # Post CRUD + social
│   │   ├── chatController.js  # Conversations + messages
│   │   ├── notificationController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT protect, restrictTo
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Message.js
│   │   ├── Conversation.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── postRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── adminRoutes.js
│   ├── sockets/
│   │   └── socketHandler.js   # Socket.io event handlers
│   ├── utils/
│   │   ├── tokenUtils.js
│   │   ├── emailService.js
│   │   ├── cloudinaryHelper.js
│   │   ├── multerConfig.js
│   │   └── AppError.js
│   ├── .env                   # Environment variables
│   └── server.js              # Entry point
│
└── client/                    # React Frontend
    ├── src/
    │   ├── components/
    │   │   ├── post/          # PostCard, CreatePostModal, Skeleton
    │   │   ├── user/          # SuggestedUsers
    │   │   ├── chat/          # Chat UI components
    │   │   ├── notifications/ # Notification components
    │   │   └── ui/            # StoriesRow, shared UI
    │   ├── pages/
    │   │   ├── auth/          # Login, Register
    │   │   ├── HomePage.jsx
    │   │   ├── ExplorePage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   ├── ChatPage.jsx
    │   │   ├── NotificationsPage.jsx
    │   │   ├── SettingsPage.jsx
    │   │   ├── PostDetailPage.jsx
    │   │   └── AdminPage.jsx
    │   ├── layouts/
    │   │   └── MainLayout.jsx # Sidebar + mobile nav
    │   ├── redux/
    │   │   ├── store.js
    │   │   └── slices/        # auth, posts, chat slices
    │   ├── services/          # Axios API service layer
    │   ├── context/
    │   │   └── SocketContext.jsx
    │   ├── hooks/             # Custom hooks
    │   └── utils/
    ├── .env
    └── vite.config.js
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)
- Gmail account for SMTP (or any SMTP provider)

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/vibe.git
cd vibe
```

### 2. Setup the Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 3. Setup the Frontend

```bash
cd client
npm install
cp .env.example .env
# .env should already have defaults for local dev
npm run dev
```

The app will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api/v1`
- Health check: `http://localhost:5000/health`

---

## 🔧 Environment Variables

### Server (`server/.env`)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=Vibe <noreply@vibe.app>
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/logout` | Logout |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `GET` | `/api/v1/auth/me` | Get current user |
| `GET` | `/api/v1/auth/verify-email/:token` | Verify email |
| `POST` | `/api/v1/auth/forgot-password` | Forgot password |
| `PATCH` | `/api/v1/auth/reset-password/:token` | Reset password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/users/:username` | Get user profile |
| `PUT` | `/api/v1/users/profile/update` | Update profile |
| `PATCH` | `/api/v1/users/profile/avatar` | Update avatar |
| `PATCH` | `/api/v1/users/profile/cover` | Update cover image |
| `POST` | `/api/v1/users/follow/:userId` | Follow/unfollow |
| `GET` | `/api/v1/users/search?q=...` | Search users |
| `GET` | `/api/v1/users/suggested` | Suggested users |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/posts/feed` | Get home feed |
| `GET` | `/api/v1/posts/explore` | Explore posts |
| `POST` | `/api/v1/posts` | Create post |
| `GET` | `/api/v1/posts/:id` | Get single post |
| `PATCH` | `/api/v1/posts/:id` | Edit post |
| `DELETE` | `/api/v1/posts/:id` | Delete post |
| `POST` | `/api/v1/posts/:id/like` | Toggle like |
| `POST` | `/api/v1/posts/:id/save` | Toggle save |
| `POST` | `/api/v1/posts/:id/comment` | Add comment |
| `DELETE` | `/api/v1/posts/:id/comment/:commentId` | Delete comment |
| `POST` | `/api/v1/posts/:id/comment/:commentId/reply` | Reply to comment |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/chat/conversations` | Get all conversations |
| `POST` | `/api/v1/chat/conversations/:userId` | Create/get DM |
| `POST` | `/api/v1/chat/conversations/group` | Create group chat |
| `GET` | `/api/v1/chat/conversations/:id/messages` | Get messages |
| `POST` | `/api/v1/chat/conversations/:id/messages` | Send message |
| `DELETE` | `/api/v1/chat/messages/:id` | Delete message |

---

## 🌐 Deployment

### Frontend → Vercel

```bash
# In the client directory
npm run build

# Or deploy via Vercel CLI
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_API_URL` → your Render backend URL
- `VITE_SOCKET_URL` → your Render backend URL

### Backend → Render

1. Push code to GitHub
2. Create new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repo
4. Set root directory to `server`
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Add all environment variables from `server/.env`

### Database → MongoDB Atlas

1. Create free cluster at [MongoDB Atlas](https://mongodb.com/atlas)
2. Create database user
3. Whitelist Render's IPs (or 0.0.0.0/0 for simplicity)
4. Copy connection string to `MONGO_URI`

---

## 🔌 Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_conversation` | Client→Server | Join a chat room |
| `leave_conversation` | Client→Server | Leave a chat room |
| `typing_start` | Client→Server | User started typing |
| `typing_stop` | Client→Server | User stopped typing |
| `new_message` | Server→Client | New message received |
| `typing_start` | Server→Client | Someone is typing |
| `typing_stop` | Server→Client | Someone stopped typing |
| `user_online` | Server→Client | User came online |
| `user_offline` | Server→Client | User went offline |
| `notification` | Server→Client | New notification |
| `online_users` | Server→Client | List of online users |

---

## 🎨 Design System

The design uses a curated dark theme with:
- **Primary**: Violet (`#8b5cf6`)
- **Accent**: Pink (`#ec4899`), Orange (`#f97316`)
- **Background**: Deep dark (`#09090b`, `#18181b`)
- **Glassmorphism**: Backdrop blur + white/5 backgrounds
- **Typography**: Inter (body) + Plus Jakarta Sans (headings)
- **Animations**: Framer Motion for smooth transitions

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built with ❤️ by the Vibe team</p>
  <p>If this helped you land a job, give it a ⭐</p>
</div>
