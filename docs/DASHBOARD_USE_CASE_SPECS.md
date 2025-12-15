# Dashboard System - Detailed Use Case Specifications

## System Overview

The Dashboard is a web application that provides role-specific information and analytics. Users can view personalized statistics, progress, and relevant information based on their role (Student, Instructor, or Admin).

---

## 📐 PlantUML Use Case Diagram

```plantuml
@startuml Dashboard_UseCase
!theme plain
skinparam linetype ortho
skinparam backgroundColor #FEFEFE
skinparam actor {
    BackgroundColor #FFE5B4
    BorderColor #FF8C00
}

title Dashboard System - Use Case Diagram

actor Student as "👤 Student"
actor Instructor as "👨‍🏫 Instructor"
actor Admin as "👨‍💼 Admin"

rectangle "Dashboard System" {
    usecase UC_Auth as "Authenticate User"
    usecase UC_VerifyRole as "Verify User Role"
    usecase UC_LoadDash as "Load Dashboard"
    
    usecase UC_ViewStats as "View Personal Statistics"
    usecase UC_ViewEnrollments as "View My Enrollments"
    usecase UC_ViewProgress as "View Learning Progress"
    usecase UC_ViewActivity as "View Recent Activity"
    usecase UC_AccessQuickLinks as "Access Quick Links"
    usecase UC_ViewRecommendations as "View Recommendations"
    usecase UC_ViewAchievements as "View Achievements/Badges"
    usecase UC_ViewStreaks as "View Learning Streaks"
    
    usecase UC_ViewTeachStats as "View Teaching Statistics"
    usecase UC_ViewStudents as "View Enrolled Students"
    usecase UC_ViewStudentProg as "View Student Progress"
    usecase UC_ViewAssignments as "View Assignments/Tasks"
    usecase UC_ViewGradingQueue as "View Grading Queue"
    usecase UC_AccessAnalytics as "Access Teaching Analytics"
    usecase UC_ViewCourseMetrics as "View Course Metrics"
    usecase UC_ViewModeration as "View Posts Needing Moderation"
    
    usecase UC_ViewSysStats as "View System Statistics"
    usecase UC_ViewUserMetrics as "View User Metrics"
    usecase UC_ViewActiveUsers as "View Active Users"
    usecase UC_MonitorHealth as "Monitor System Health"
    usecase UC_ViewErrors as "View Error Alerts"
    usecase UC_ViewServerStatus as "View Server Status"
    usecase UC_AccessAdminTools as "Access Admin Tools"
    usecase UC_ViewSysAlerts as "View System-wide Alerts"
    
    usecase UC_ViewProfile as "View Profile Info"
    usecase UC_EditProfile as "Edit Profile"
    usecase UC_ViewPrefs as "View User Preferences"
    usecase UC_UpdateSettings as "Update Dashboard Settings"
    usecase UC_ChangeNotif as "Change Notification Preferences"
    
    usecase UC_StartLesson as "Start New Lesson"
    usecase UC_CreatePost as "Create Community Post"
    usecase UC_StartProject as "Start New Project"
    usecase UC_SendMessage as "Send Message/Chat"
    usecase UC_ViewNotif as "View Notifications"
    usecase UC_AccessAI as "Access AI Mentor"
    
    usecase UC_ViewCharts as "View Performance Charts"
    usecase UC_GenerateReport as "Generate Report"
    usecase UC_ExportData as "Export Dashboard Data"
    usecase UC_ViewTrends as "View Trends Over Time"
    usecase UC_CompareMetrics as "Compare Performance Metrics"
}

%% Student relationships
Student --> UC_Auth
UC_Auth ..> UC_VerifyRole : includes
UC_VerifyRole ..> UC_LoadDash : includes
UC_LoadDash --> UC_ViewStats
UC_LoadDash --> UC_ViewEnrollments
UC_LoadDash --> UC_ViewProgress
UC_LoadDash --> UC_ViewActivity
UC_LoadDash --> UC_ViewRecommendations
UC_LoadDash --> UC_AccessQuickLinks

Student --> UC_ViewProfile
Student --> UC_EditProfile
Student --> UC_ViewPrefs
Student --> UC_UpdateSettings

Student --> UC_StartLesson
Student --> UC_CreatePost
Student --> UC_StartProject
Student --> UC_ViewNotif
Student --> UC_AccessAI

Student --> UC_ViewAchievements
Student --> UC_ViewStreaks

%% Instructor relationships
Instructor --> UC_Auth
UC_Auth ..> UC_VerifyRole : includes
UC_VerifyRole ..> UC_LoadDash : includes
UC_LoadDash --> UC_ViewTeachStats
UC_LoadDash --> UC_ViewStudents
UC_LoadDash --> UC_ViewStudentProg
UC_LoadDash --> UC_ViewAssignments
UC_LoadDash --> UC_ViewGradingQueue
UC_LoadDash --> UC_AccessAnalytics
UC_LoadDash --> UC_ViewCourseMetrics
UC_LoadDash --> UC_ViewModeration

Instructor --> UC_ViewProfile
Instructor --> UC_EditProfile
Instructor --> UC_CreatePost
Instructor --> UC_ViewNotif

%% Admin relationships
Admin --> UC_Auth
UC_Auth ..> UC_VerifyRole : includes
UC_VerifyRole ..> UC_LoadDash : includes
UC_LoadDash --> UC_ViewSysStats
UC_LoadDash --> UC_ViewUserMetrics
UC_LoadDash --> UC_ViewActiveUsers
UC_LoadDash --> UC_MonitorHealth
UC_LoadDash --> UC_ViewErrors
UC_LoadDash --> UC_ViewServerStatus
UC_LoadDash --> UC_AccessAdminTools
UC_LoadDash --> UC_ViewSysAlerts

Admin --> UC_ViewProfile
Admin --> UC_ViewNotif

%% Analytics relationships
UC_ViewStats ..> UC_ViewCharts : includes
UC_ViewTeachStats ..> UC_ViewCharts : includes
UC_ViewSysStats ..> UC_ViewCharts : includes

UC_ViewProgress -.-> UC_ViewTrends : extends
UC_AccessAnalytics -.-> UC_GenerateReport : extends
UC_GenerateReport ..> UC_ExportData : includes

%% Notification relationships
UC_ViewActivity -.-> UC_ViewNotif : extends
UC_ChangeNotif -.-> UC_UpdateSettings : extends

@enduml
```

---

## 📊 Use Case Details

### Authentication & Access Control
| Use Case | Actor | Description |
|----------|-------|-------------|
| **Authenticate User** | All | Verify user credentials via login |
| **Verify User Role** | System | Check user role (Student/Instructor/Admin) |
| **Load Dashboard** | System | Display role-appropriate dashboard view |

### Student Dashboard
| Use Case | Description |
|----------|-------------|
| **View Personal Statistics** | Points, level, streaks, achievements count |
| **View My Enrollments** | List of enrolled career paths/courses |
| **View Learning Progress** | Completion percentages, modules completed |
| **View Recent Activity** | Recent posts, projects, community activities |
| **Access Quick Links** | Shortcuts to frequently used features |
| **View Recommendations** | AI-suggested next steps for learning |
| **View Achievements/Badges** | Earned badges and certifications |
| **View Learning Streaks** | Consecutive learning days counter |

### Instructor Dashboard
| Use Case | Description |
|----------|-------------|
| **View Teaching Statistics** | Student count, course metrics, analytics |
| **View Enrolled Students** | List of all students in courses |
| **View Student Progress** | Individual student completion rates |
| **View Assignments/Tasks** | Pending assignments to review |
| **View Grading Queue** | Ungraded quizzes and submissions |
| **Access Teaching Analytics** | Detailed course performance data |
| **View Course Metrics** | Engagement, completion, dropout rates |
| **View Posts Needing Moderation** | Community posts awaiting review |

### Admin Dashboard
| Use Case | Description |
|----------|-------------|
| **View System Statistics** | Total users, courses, posts, system metrics |
| **View User Metrics** | Active users, signups, engagement stats |
| **View Active Users** | Currently online users list |
| **Monitor System Health** | CPU, memory, database, storage status |
| **View Error Alerts** | System errors and warnings |
| **View Server Status** | Uptime, response times, performance |
| **Access Admin Tools** | User management, moderation tools |
| **View System-wide Alerts** | Critical system notifications |

### Personal Management
| Use Case | Description |
|----------|-------------|
| **View Profile Info** | Personal profile information |
| **Edit Profile** | Update name, bio, contact details |
| **View User Preferences** | Saved preferences and settings |
| **Update Dashboard Settings** | Customize dashboard layout/widgets |
| **Change Notification Preferences** | Control notification types/frequency |

### Quick Actions
| Use Case | Description |
|----------|-------------|
| **Start New Lesson** | Quick access to begin learning |
| **Create Community Post** | Quick post creation shortcut |
| **Start New Project** | Quick project creation button |
| **Send Message/Chat** | Quick access to messaging |
| **View Notifications** | Latest notifications display |
| **Access AI Mentor** | Quick AI assistant access |

### Analytics & Reports
| Use Case | Description |
|----------|-------------|
| **View Performance Charts** | Visualize performance metrics |
| **Generate Report** | Create custom analytics report |
| **Export Dashboard Data** | Download data as CSV/PDF |
| **View Trends Over Time** | Historical trends and patterns |
| **Compare Performance Metrics** | Compare across time periods |

---

## 🔄 Relationship Details

### Includes (<<includes>>) - Mandatory
- Authenticate User **includes** Verify User Role
- Verify User Role **includes** Load Dashboard
- Generate Report **includes** Export Dashboard Data

### Extends (<<extends>>) - Optional/Conditional
- View Progress **extends** View Trends (optional analytics)
- Access Analytics **extends** Generate Report (conditional)
- View Activity **extends** View Notifications (activity triggers notifications)
- Change Notification Preferences **extends** Update Settings (nested setting)

---

## 💻 API Endpoints Reference