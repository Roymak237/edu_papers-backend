# Edu Papers Backend

A Node.js backend API for the Edu Papers Flutter application.

## Features

- User authentication (login)
- Paper management (upload, approve, view)
- AI chat functionality
- Admin panel for paper moderation.

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/users` - Get all users

### Papers
- `GET /api/papers` - Get all papers
- `GET /api/papers/:id` - Get paper by ID
- `POST /api/papers` - Upload new paper
- `PUT /api/papers/:id/status` - Update paper status (admin)
- `GET /api/papers/uploaded/:userId` - Get papers uploaded by user
- `GET /api/papers/admin/pending` - Get pending papers (admin)

### AI Chat
- `POST /api/ai/chat` - Send message and get AI response
- `GET /api/ai/messages` - Get all messages
- `DELETE /api/ai/messages` - Clear messages

### Health Check
- `GET /api/health` - Server health status

## Sample Data

The backend includes sample users and papers for testing:
- Users: john_doe (student), admin (admin)
- Papers: Sample mathematics, biology, and chemistry papers

## Environment Variables

- `PORT` - Server port (default: 3000)