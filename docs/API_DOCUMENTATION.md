# API Integration Documentation

## Overview

CCIS CodeHub uses RESTful APIs to connect the React frontend with the Django backend and integrate external services. All internal API endpoints use the base URL `/api/`.

---

## Types of APIs Used

### 1. Internal REST APIs

Built with Django REST Framework, these APIs handle all core platform functionality.

| Module | Path | Purpose |
|--------|------|---------|
| **Authentication** | `/api/auth/` | User login, registration, profile management |
| **Learning** | `/api/learning/` | Career paths, modules, quizzes, enrollments |
| **Projects** | `/api/projects/` | Project and task management, teams |
| **Community** | `/api/community/` | Posts, comments, follows, chat |
| **AI Mentor** | `/api/ai/` | AI chat sessions, code analysis |
| **Admin** | `/api/admin/` | Dashboard analytics, user management |

### 2. External APIs

| API | Provider | Purpose |
|-----|----------|---------|
| **OAuth 2.0** | Google | User authentication via Google accounts |
| **OpenRouter API** | OpenRouter | AI-powered mentoring using Gemini models |
| **Gemini API** | Google | Direct AI integration (fallback) |
| **Neon Database** | Neon | PostgreSQL serverless database hosting |
| **GitHub API** | GitHub | Repository synchronization |

---

## External API Configuration

### Google OAuth 2.0
Used for user authentication with Google accounts.

| Setting | Environment Variable |
|---------|---------------------|
| Client ID | `GOOGLE_CLIENT_ID` |
| Client Secret | `GOOGLE_CLIENT_SECRET` |
| Scopes | `email`, `profile`, `openid` |

### OpenRouter AI API
Primary AI service for the AI Mentor feature.

| Setting | Environment Variable |
|---------|---------------------|
| API Key | `OPENROUTER_API_KEY` |
| Model | `OPENROUTER_MODEL` (default: `google/gemini-2.0-flash-exp:free`) |

### Google Gemini API
Fallback AI service for direct Google AI access.

| Setting | Environment Variable |
|---------|---------------------|
| API Key | `GOOGLE_GEMINI_API_KEY` |

### Neon Database
Serverless PostgreSQL database with authentication integration.

| Setting | Environment Variable |
|---------|---------------------|
| Database URL | `DATABASE_URL` |
| Auth URL | `NEON_AUTH_URL` |
| JWKS URL | `NEON_AUTH_JWKS_URL` |

### GitHub API
For repository sync and code import.

| Setting | Environment Variable |
|---------|---------------------|
| Access Token | `GITHUB_ACCESS_TOKEN` |

---

## Authentication

The system uses **JWT (JSON Web Token)** authentication:

1. User logs in → Server returns JWT token
2. Client stores token in browser storage
3. All API requests include: `Authorization: Bearer <token>`
4. Server validates token before processing

---

## API Modules

### Authentication API (`/api/auth/`)
Handles user identity: registration, login, profile updates, Google OAuth, and user search.

### Learning API (`/api/learning/`)
Manages educational content: career paths, learning modules, quizzes, enrollments, progress tracking, and certificates.

### Projects API (`/api/projects/`)
Enables collaboration: project CRUD, tasks, branches, commits, pull requests, teams, and invitations.

### Community API (`/api/community/`)
Provides social features: posts, comments, likes, follows, real-time chat, and organizations.

### AI Mentor API (`/api/ai/`)
Delivers AI assistance: conversation sessions, message handling, code analysis, and learning recommendations.

### Admin API (`/api/admin/`)
Supports administration: analytics dashboard, user management, and content moderation.

---

## Communication Methods

| Method | Usage |
|--------|-------|
| **HTTP REST** | Standard request-response for data operations |
| **WebSocket** | Real-time chat and notifications |

---

## Security Features

- **JWT Authentication** - Token-based access control
- **Role-Based Access** - Student, Instructor, Admin permissions
- **HTTPS** - Encrypted data transmission
- **Rate Limiting** - Protection against API abuse

---

## Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Summary

The platform integrates internal REST APIs for core functionality, Google OAuth for authentication, OpenRouter/Gemini for AI mentoring, Neon for database hosting, and GitHub for code synchronization. All APIs follow RESTful conventions with JWT security.
