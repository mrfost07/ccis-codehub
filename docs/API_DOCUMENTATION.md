# 📡 API Documentation - CodeHub

## Base URL

```
Development: http://localhost:8000/api
Production: https://api.codehub.com/api
```

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

### Token Refresh

Access tokens expire after 1 hour. Use the refresh token to get a new access token:

```http
POST /api/auth/refresh/
Content-Type: application/json

{
  "refresh": "your-refresh-token"
}
```

---

## Endpoints

### Authentication

#### Register
```http
POST /api/auth/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "username": "johndoe",
  "role": "student"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "student"
  }
}
```

#### Login
```http
POST /api/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### Logout
```http
POST /api/auth/logout/
Authorization: Bearer <token>
```

---

### Users

#### Get User Profile
```http
GET /api/users/{user_id}/
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/users/{user_id}/
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Software developer",
  "skills": ["Python", "React", "Django"]
}
```

---

### Learning

#### List Courses
```http
GET /api/courses/
Authorization: Bearer <token>
Query Parameters:
  - category: string (optional)
  - difficulty: string (optional)
  - search: string (optional)
  - page: integer (optional)
  - page_size: integer (optional)
```

#### Get Course
```http
GET /api/courses/{course_id}/
Authorization: Bearer <token>
```

#### Create Course (Instructor/Admin)
```http
POST /api/courses/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Python Fundamentals",
  "description": "Learn Python from scratch",
  "category": "Programming",
  "difficulty": "beginner",
  "duration": 120
}
```

#### Submit Exercise
```http
POST /api/exercises/{exercise_id}/submit/
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "def add(a, b):\n    return a + b"
}
```

**Response:**
```json
{
  "success": true,
  "test_results": [
    {
      "test_case": "add(1, 2)",
      "expected": 3,
      "actual": 3,
      "passed": true
    }
  ],
  "feedback": "Great job! All tests passed."
}
```

---

### Community

#### List Posts
```http
GET /api/posts/
Authorization: Bearer <token>
Query Parameters:
  - user_id: uuid (optional)
  - tags: array (optional)
  - page: integer (optional)
```

#### Create Post
```http
POST /api/posts/
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Check out this amazing React hook!",
  "post_type": "text",
  "tags": ["react", "javascript"]
}
```

#### Add Comment
```http
POST /api/posts/{post_id}/comments/
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great post!",
  "parent_id": null
}
```

#### React to Post
```http
POST /api/posts/{post_id}/reactions/
Authorization: Bearer <token>
Content-Type: application/json

{
  "reaction_type": "like"
}
```

---

### Projects

#### List Projects
```http
GET /api/projects/
Authorization: Bearer <token>
```

#### Create Project
```http
POST /api/projects/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Awesome Project",
  "description": "A project description",
  "visibility": "public"
}
```

#### Get Project Tasks
```http
GET /api/projects/{project_id}/tasks/
Authorization: Bearer <token>
```

#### Create Task
```http
POST /api/projects/{project_id}/tasks/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add login and registration",
  "assignee_id": "user-uuid",
  "status": "todo",
  "priority": "high"
}
```

#### Update Task Status
```http
PUT /api/tasks/{task_id}/
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress"
}
```

---

### Competitions

#### List Competitions
```http
GET /api/competitions/
Authorization: Bearer <token>
```

#### Create Competition (Instructor/Admin)
```http
POST /api/competitions/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "CodeHub Hackathon 2024",
  "description": "Build something amazing!",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-07T23:59:59Z",
  "prize_pool": "$10,000"
}
```

#### Get Leaderboard
```http
GET /api/competitions/{competition_id}/leaderboard/
Authorization: Bearer <token>
```

---

### AI Mentor

#### Chat with AI Mentor
```http
POST /api/ai/chat/
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "How do I implement authentication in Django?",
  "context_type": "learning",
  "context_id": "course-uuid"
}
```

**Response:**
```json
{
  "response": "To implement authentication in Django, you can use Django's built-in authentication system...",
  "suggestions": [
    "Check out the Django authentication documentation",
    "Try the authentication tutorial in the Learning section"
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": {
    "email": ["This field is required."]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "error": "Resource not found."
}
```

### 500 Internal Server Error
```json
{
  "error": "An internal server error occurred."
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated users:** 1000 requests per hour
- **Unauthenticated users:** 100 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

---

## WebSocket Events

### Connection
```javascript
const socket = new WebSocket('ws://api.codehub.com/ws/notifications/');

socket.onopen = () => {
  // Send authentication
  socket.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
};
```

### Events

#### Task Updated
```json
{
  "type": "task_updated",
  "data": {
    "task_id": "uuid",
    "status": "in_progress",
    "updated_by": "user-uuid"
  }
}
```

#### Comment Added
```json
{
  "type": "comment_added",
  "data": {
    "post_id": "uuid",
    "comment": {
      "id": "uuid",
      "author": "user-uuid",
      "content": "Great post!"
    }
  }
}
```

---

## OpenAPI/Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:8000/api/schema/swagger-ui/
```

Schema definition:
```
http://localhost:8000/api/schema/
```

---

## Support

For API support, please:
1. Check the [documentation](./README.md)
2. Search [existing issues](https://github.com/your-org/CCIS-CodeHub/issues)
3. Create a new issue with the `api` label

