# Panne - AI-Powered Collaboration Platform

Panne is an intelligent, fluid, and reliable digital workspace that combines real-time collaboration with AI-powered assistance. Built with modern web technologies, it provides a seamless experience for creating, editing, and sharing documents with advanced features like version control, real-time collaboration, and AI integration.

## 🚀 Features

- **AI Assistant**: Powered by Google Gemini for intelligent suggestions, summaries, and writing improvements
- **Real-time Collaboration**: Live cursors, instant sync, and conflict-free editing using Y.js/Hocuspocus
- **Rich Text Editor**: Professional editing with Tiptap, supporting formatting, code blocks, images, and checklists
- **Version History**: Automatic versioning with visual diff comparisons
- **Secure Authentication**: JWT-based authentication with HttpOnly cookies
- **Media Management**: Cloudinary integration for image uploads and optimization
- **Responsive Design**: Mobile-first design with accessibility (WCAG 2.1 AA) compliance
- **Internationalization**: Multi-language support with i18next

## 🛠 Tech Stack

### Frontend
- **React 18+** with Vite for fast development
- **React Router** for client-side routing
- **React Query** for server state management
- **Tiptap** (ProseMirror) for rich text editing
- **Framer Motion** for smooth animations
- **Socket.IO Client** for real-time features
- **i18next** for internationalization
- **Modular CSS** with CSS custom properties

### Backend
- **Node.js** with Express.js
- **PostgreSQL** (Neon) for database
- **Socket.IO** + **Hocuspocus** for real-time collaboration
- **JWT** authentication with secure cookies
- **Cloudinary** for media storage
- **Google Gemini AI** integration
- **bcryptjs** for password hashing

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database (we recommend [Neon](https://neon.tech))
- **Cloudinary** account for media storage
- **Google Gemini API** key for AI features

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd panne
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host:5432/database_name

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Google Gemini AI Configuration
GEMINI_API_KEY=your_google_gemini_api_key

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

#### Database Setup
```bash
# Run database migrations
npm run migrate
```

#### Start Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:5000`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Environment Configuration
```bash
cp .env.example .env
```

Edit the `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

#### Start Frontend Development Server
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## 🔧 Development Scripts

### Backend Scripts
```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm run migrate     # Run database migrations
```

### Frontend Scripts
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

## 📁 Project Structure

```
panne/
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── scripts/         # Database migrations
│   ├── .env.example     # Environment variables template
│   ├── package.json     # Backend dependencies
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── global.css   # Global styles and CSS variables
│   │   ├── i18n.js      # Internationalization setup
│   │   ├── App.jsx      # Main App component
│   │   └── main.jsx     # React entry point
│   ├── .env.example     # Frontend environment template
│   ├── package.json     # Frontend dependencies
│   └── vite.config.js   # Vite configuration
└── README.md           # This file
```

## 🔐 Authentication Flow

1. Users register/login with email and password
2. Backend generates JWT token and sets secure HttpOnly cookie
3. Frontend automatically includes cookie in requests
4. Protected routes verify JWT token via middleware
5. User data is cached using React Query

## 🤝 Real-time Collaboration

The collaboration system uses:
- **Y.js** for Conflict-free Replicated Data Types (CRDTs)
- **Hocuspocus** server for document synchronization
- **Socket.IO** for presence and cursor tracking
- **WebSocket** connections for real-time updates

## 🎨 Styling Guidelines

- Use CSS custom properties defined in `global.css`
- Each component has its own `.css` file
- Follow BEM naming convention for CSS classes
- Responsive design with mobile-first approach
- Accessibility-first design principles

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Notes
- `GET /api/notes` - Get all notes
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note (soft delete)

### Notebooks
- `GET /api/notebooks` - Get all notebooks
- `POST /api/notebooks` - Create notebook
- `PUT /api/notebooks/:id` - Update notebook
- `DELETE /api/notebooks/:id` - Delete notebook

### AI
- `POST /api/ai/query` - Send AI query

### Upload
- `POST /api/upload/image` - Upload image
- `POST /api/upload/signature` - Get Cloudinary signature

## 🚀 Deployment

### Backend Deployment
1. Set up PostgreSQL database (Neon recommended)
2. Configure environment variables
3. Run migrations: `npm run migrate`
4. Deploy to your preferred platform (Heroku, Railway, etc.)

### Frontend Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your preferred platform (Vercel, Netlify, etc.)
3. Configure environment variables for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Tiptap](https://tiptap.dev/) for the excellent rich text editor
- [Y.js](https://github.com/yjs/yjs) for CRDT implementation
- [Hocuspocus](https://tiptap.dev/hocuspocus) for collaboration backend
- [Framer Motion](https://www.framer.com/motion/) for animations
- [React Query](https://tanstack.com/query) for server state management

## 📞 Support

If you have any questions or need help, please:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

---

Built with ❤️ for better collaboration.