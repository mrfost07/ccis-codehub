# 🎓 CCIS-CodeHub

> **AI-Driven Learning Platform for SNSU College of Computing and Information Sciences**

An advanced full-stack learning management system designed specifically for **BSIT**, **BSCS**, and **BSIS** students at Surigao del Norte State University.

---

## ✨ Features

### 📚 Learning Management
- **Career Paths** - Structured learning paths for different programs
- **Interactive Modules** - Videos, text content, and hands-on exercises  
- **Quizzes & Assessments** - Auto-graded quizzes with instant feedback
- **Progress Tracking** - Monitor your learning journey
- **Certificates** - Earn certificates upon completion

### 👥 Project Collaboration
- **Team Projects** - Collaborate with classmates on real projects
- **Kanban Boards** - Visual task management
- **Code Reviews** - Peer review system with AI assistance
- **File Sharing** - Share project files and resources
- **Activity Tracking** - Keep everyone updated

### 💬 Community
- **Discussion Forums** - Ask questions and share knowledge
- **Showcase Projects** - Share your work with the community
- **Social Features** - Follow, like, and comment
- **Trending Topics** - See what's popular
- **Reputation System** - Earn badges and points

### 🤖 AI Mentor
- **24/7 AI Assistance** - Powered by Google Gemini
- **Code Analysis** - Get feedback on your code
- **Learning Guidance** - Personalized learning recommendations
- **Bug Detection** - AI-powered debugging help
- **Best Practices** - Learn industry standards

### 🏆 Coding Competitions
- **Challenges** - Test your skills in timed challenges
- **Leaderboards** - Compete with peers
- **Multiple Languages** - Python, JavaScript, Java, and more
- **Instant Feedback** - Automated test cases
- **Achievement System** - Unlock badges and rewards

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm/yarn

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd CCIS-CodeHub
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

3. **Frontend Setup**
```bash
cd frontend
npm install
```

4. **Environment Configuration**
```bash
# Copy example files
cp backend/.env_example backend/.env
cp frontend/.env_example frontend/.env
```

5. **Start Development Servers**
```bash
# Terminal 1 - Backend
cd backend
.\venv\Scripts\activate
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Or use Quick Start Scripts

```bash
# Windows
START_ALL.bat

# Individual servers
start-backend.bat
start-frontend.bat
```

---

## 🌐 Access

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Register new account |
| **Backend API** | http://localhost:8000/api | - |
| **Admin Panel** | http://localhost:8000/admin | See .env file |
| **API Documentation** | http://localhost:8000/api/schema/swagger-ui/ | - |

---

## 🏗️ Technology Stack

### Backend
- **Framework**: Django 4.2.7
- **API**: Django REST Framework 3.14.0
- **Database**: PostgreSQL / SQLite
- **Authentication**: JWT (Simple JWT)
- **WebSockets**: Django Channels 4.0.0
- **AI Integration**: Google Generative AI (Gemini)
- **Task Queue**: Celery 5.3.4
- **Cache**: Redis

### Frontend
- **Framework**: React 18.2.0
- **Language**: TypeScript
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.3.6
- **State Management**: Zustand 4.4.7
- **Data Fetching**: TanStack React Query 5.12.2
- **Routing**: React Router DOM 6.20.1
- **Forms**: React Hook Form 7.49.2
- **Code Editor**: Monaco Editor 0.44.0
- **Icons**: Lucide React 0.294.0

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Web Server**: Daphne (ASGI)
- **Documentation**: drf-spectacular

---

## 📁 Project Structure

```
CCIS-CodeHub/
├── backend/                    # Django backend
│   ├── apps/
│   │   ├── accounts/          # User management
│   │   ├── learning/          # Learning management
│   │   ├── projects/          # Project collaboration
│   │   ├── community/         # Social features
│   │   ├── ai_mentor/         # AI integration
│   │   └── competitions/      # Coding competitions
│   ├── core/                  # Main Django settings
│   ├── venv/                  # Python virtual environment
│   └── manage.py
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   ├── services/          # API services
│   │   ├── store/             # State management
│   │   ├── styles/            # Global styles
│   │   └── utils/             # Utilities
│   └── package.json
│
├── docs/                      # Documentation
├── docker/                    # Docker configs
├── .env_example               # Environment template
└── README.md
```

---

## 📚 API Endpoints

### Authentication
```
POST   /api/auth/register/     # Register new user
POST   /api/auth/login/        # Login
GET    /api/auth/profile/      # Get profile
PUT    /api/auth/profile/      # Update profile
```

### Learning
```
GET    /api/learning/career-paths/              # List career paths
GET    /api/learning/career-paths/{slug}/       # Get career path
POST   /api/learning/career-paths/{slug}/enroll/ # Enroll
GET    /api/learning/modules/                   # List modules
POST   /api/learning/modules/{id}/complete/     # Mark complete
GET    /api/learning/quizzes/{id}/              # Get quiz
POST   /api/learning/quizzes/{id}/start/        # Start quiz
POST   /api/learning/quizzes/{id}/submit/       # Submit answers
GET    /api/learning/progress/                  # Get progress
```

### Projects
```
GET    /api/projects/projects/                  # List projects
POST   /api/projects/projects/                  # Create project
GET    /api/projects/projects/{slug}/           # Get project
POST   /api/projects/projects/{slug}/add_member/ # Add member
GET    /api/projects/tasks/                     # List tasks
POST   /api/projects/tasks/                     # Create task
GET    /api/projects/reviews/                   # Code reviews
POST   /api/projects/reviews/                   # Request review
```

[View full API documentation →](http://localhost:8000/api/schema/swagger-ui/)

---

## 🎯 Key Features Implementation Status

| Feature | Status | Description |
|---------|--------|-------------|
| User Authentication | ✅ Complete | JWT-based authentication |
| Learning Paths | ✅ Complete | Career paths for BSIT/BSCS/BSIS |
| Quizzes | ✅ Complete | Auto-graded assessments |
| Projects | ✅ Complete | Team collaboration |
| Community | ✅ Models Ready | Social features |
| AI Mentor | ✅ Models Ready | Gemini integration |
| Competitions | ✅ Models Ready | Coding challenges |
| Admin Panel | ✅ Complete | Full content management |
| API Documentation | ✅ Complete | Swagger/ReDoc |
| Responsive UI | ✅ Complete | Mobile-friendly |

---

## 🔧 Configuration

### Backend (.env)
```env
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
GOOGLE_GEMINI_API_KEY=your-gemini-key
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_AI_MODEL_DEFAULT=gemini
```

### Get Free API Keys
- **Gemini AI**: https://makersuite.google.com/app/apikey (FREE)
- **Firebase**: https://console.firebase.google.com/ (FREE tier)
- **GitHub OAuth**: https://github.com/settings/developers (FREE)

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
# or
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

---

## 📦 Deployment

### Docker
```bash
docker-compose up --build
```

### Manual Deployment
See `docs/DEPLOYMENT.md` for detailed instructions.

---

## 🤝 Contributing

This is an academic project for SNSU CCIS students. Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📖 Documentation

- [System Recreation Guide](SYSTEM_RECREATION.md) - Complete architecture
- [Startup Guide](STARTUP_GUIDE.md) - How to start the system
- [Build Summary](BUILD_COMPLETE_SUMMARY.md) - What's been built
- [Quick Reference](QUICK_REFERENCE.md) - Common commands
- [Final Status](FINAL_STATUS.md) - Current state

---

## 🎓 For SNSU CCIS Students

This platform is designed to help you:
- **Learn** - Structured courses for your program
- **Collaborate** - Work on projects with classmates
- **Connect** - Build your network
- **Compete** - Test your skills
- **Grow** - Get AI-powered guidance

### Programs Supported
- **BSIT** - Information Technology
- **BSCS** - Computer Science
- **BSIS** - Information Systems

---

## 📊 Project Statistics

- **Total Models**: 44+
- **API Endpoints**: 30+
- **Frontend Pages**: 8
- **Django Apps**: 6
- **Lines of Code**: ~6,500+
- **Dependencies**: 70+

---

## 🏆 Features Roadmap

### ✅ Completed
- User authentication system
- Learning management with quizzes
- Project collaboration tools
- Admin panel
- REST API
- Frontend UI
- Database models

### 🚧 In Progress
- Complete Community API
- Complete AI Mentor integration
- Complete Competitions API
- Real-time WebSocket features

### 📝 Planned
- Mobile app
- Advanced analytics
- Certificate generation
- Email notifications
- Advanced AI features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Surigao del Norte State University**  
College of Computing and Information Sciences

---

## 📞 Support

For issues or questions:
- Check the [Documentation](docs/)
- Open an [Issue](issues/)
- Contact CCIS Department

---

## 🙏 Acknowledgments

- SNSU CCIS Faculty
- Google Generative AI (Gemini)
- Open Source Community
- All contributing students

---

## ⭐ Show Your Support

If this project helped you, give it a ⭐️!

---

**Built with ❤️ for SNSU CCIS Students**

🚀 Happy Learning! 🎓
