"""Create new use case diagram structure with main diagram + 5 relationship diagrams"""

new_usecase_section = """### 4.1 Use Case Modeling

#### 4.1.1 Main Use Case Diagram

```mermaid
graph TB
    subgraph SystemBoundary["CCIS-CodeHub System"]
        UC1[Manage Users]
        UC2[Access Learning System]
        UC3[Collaborate on Projects]
        UC4[Participate in Community]
        UC5[Interact with AI Mentor]
    end
    
    Student((Student))
    Instructor((Instructor))
    Admin((Administrator))
    
    %% Student interactions
    Student --> UC2
    Student --> UC3
    Student --> UC4
    Student --> UC5
    
    %% Instructor interactions
    Instructor --> UC2
    Instructor --> UC3
    Instructor --> UC4
    
    %% Admin interactions
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    
    style SystemBoundary fill:#f0f0ff,stroke:#333,stroke-width:3px
```

**Discussion:**

The main use case diagram presents a high-level view of the CCIS-CodeHub system, organized around five core functional modules. The diagram illustrates how three primary actors (Student, Instructor, and Administrator) interact with the system's main features. Students access the learning system for educational content, collaborate on projects with peers, participate in community discussions, and interact with the AI mentor for personalized assistance. Instructors utilize the learning system to manage educational content, facilitate project collaboration, and engage with the community to support students. Administrators have access to user management functions in addition to the core features available to other users.

This high-level organization demonstrates the system's modular architecture, where each major use case represents a distinct functional domain that can be developed, maintained, and scaled independently. The clear separation between user management, learning activities, project collaboration, community engagement, and AI-powered assistance reflects the comprehensive nature of the platform while maintaining simplicity in system interactions. The use of verb-based use case names ("Manage Users," "Access Learning System") follows UML best practices for clarity and action-oriented design.

#### 4.1.2 User Management Use Case Relationships

```mermaid
graph TB
    ManageUsers[Manage Users]
    CreateAccount[Create User Account]
    UpdateProfile[Update User Profile]
    AssignRoles[Assign User Roles]
    ResetPassword[Reset Password]
    DeactivateUser[Deactivate User]
    
    ViewAnalytics[View User Analytics]
    SendNotification[Send Notifications]
    
    StudentRole[Assign Student Role]
    InstructorRole[Assign Instructor Role]
    AdminRole[Assign Admin Role]
    
    ManageUsers -.include.-> CreateAccount
    ManageUsers -.include.-> UpdateProfile
    ManageUsers -.include.-> AssignRoles
    ManageUsers -.include.-> ResetPassword
    
    ManageUsers ..extend..> ViewAnalytics
    ManageUsers ..extend..> SendNotification
    ManageUsers ..extend..> DeactivateUser
    
    AssignRoles --> StudentRole
    AssignRoles --> InstructorRole
    AssignRoles --> AdminRole
    
    style ManageUsers fill:#ffcccc
    style ViewAnalytics fill:#ccffcc
    style SendNotification fill:#ccffcc
    style DeactivateUser fill:#ccffcc
```

**Discussion:**

The User Management use case details administrative functions for managing system users and their permissions. Include relationships connect essential functions such as "Create User Account," "Update User Profile," "Assign User Roles," and "Reset Password" which are mandatory operations within user management. Extension relationships show conditional features like "View User Analytics" for monitoring user engagement, "Send Notifications" for communication, and "Deactivate User" for account management. The generalization hierarchy for role assignment (Student, Instructor, Admin) ensures proper permission management and role-based access control throughout the system.

#### 4.1.3 Learning System Use Case Relationships

```mermaid
graph TB
    AccessLearning[Access Learning System]
    ViewModules[View Learning Modules]
    TakeQuiz[Take Quiz]
    TrackProgress[Track Progress]
    ViewSlides[View Content Slides]
    DownloadMaterials[Download Materials]
    
    EarnCertificate[Earn Certificate]
    ViewRecommendations[View Recommendations]
    BookmarkContent[Bookmark Content]
    
    CreateContent[Create Learning Content]
    ManageQuizzes[Manage Quizzes]
    GradeAssessments[Grade Assessments]
    
    AccessLearning -.include.-> ViewModules
    AccessLearning -.include.-> TakeQuiz
    AccessLearning -.include.-> TrackProgress
    AccessLearning -.include.-> ViewSlides
    
    AccessLearning ..extend..> EarnCertificate
    AccessLearning ..extend..> ViewRecommendations
    AccessLearning ..extend..> BookmarkContent
    
    ViewModules -.include.-> DownloadMaterials
    
    %% Instructor-specific
    CreateContent --> ManageQuizzes
    CreateContent --> GradeAssessments
    
    style AccessLearning fill:#ffcccc
    style EarnCertificate fill:#ccffcc
    style ViewRecommendations fill:#ccffcc
    style BookmarkContent fill:#ccffcc
```

**Discussion:**

The Learning System use case illustrates how students and instructors interact with educational content. Core activities include viewing learning modules, taking quizzes, tracking progress, and viewing content slides, all connected through include relationships as essential learning functions. Extensions provide enhanced features like earning certificates upon completion, viewing personalized content recommendations, and bookmarking important materials. Instructor-specific functions like content creation, quiz management, and assessment grading are shown as specialized activities that support the overall learning ecosystem.

#### 4.1.4 Project Collaboration Use Case Relationships

```mermaid
graph TB
    CollabProject[Collaborate on Projects]
    CreateProject[Create Project]
    ManageTasks[Manage Tasks]
    ShareFiles[Share Files]
    UpdateProgress[Update Project Progress]
    
    InviteMembers[Invite Team Members]
    ReviewCode[Review Code]
    TrackMilestones[Track Milestones]
    ExportProject[Export Project Data]
    
    CreateProject -.include.-> InviteMembers
    CollabProject -.include.-> CreateProject
    CollabProject -.include.-> ManageTasks
    CollabProject -.include.-> ShareFiles
    CollabProject -.include.-> UpdateProgress
    
    CollabProject ..extend..> ReviewCode
    CollabProject ..extend..> TrackMilestones
    CollabProject ..extend..> ExportProject
    
    style CollabProject fill:#ffcccc
    style ReviewCode fill:#ccffcc
    style TrackMilestones fill:#ccffcc
    style ExportProject fill:#ccffcc
```

**Discussion:**

Project Collaboration use case demonstrates team-based workflow management for student projects. Essential functions connected through include relationships are creating projects, managing tasks, sharing files, and updating progress — all fundamental to collaborative work. Creating a project necessarily includes inviting team members. Extensions add value through code review capabilities for peer learning, milestone tracking for project management, and data export for external reporting. This structure supports both individual contributions and team coordination within the CCIS academic environment.

#### 4.1.5 Community Use Case Relationships

```mermaid
graph TB
    ParticipateComm[Participate in Community]
    CreatePost[Create Post]
    CommentOnPost[Comment on Posts]
    FollowUsers[Follow Users]
    ShareResources[Share Resources]
    
    JoinStudyGroup[Join Study Group]
    AccessGlobalChat[Access Global Chat]
    SearchContent[Search Community Content]
    ReportContent[Report Inappropriate Content]
    ReceiveNotifications[Receive Notifications]
    
    QuestionPost[Ask Question]
    ResourcePost[Share Resource]
    ProjectPost[Share Project Update]
    
    ParticipateComm -.include.-> CreatePost
    ParticipateComm -.include.-> CommentOnPost
    ParticipateComm -.include.-> FollowUsers
    ParticipateComm -.include.-> ShareResources
    
    ParticipateComm ..extend..> JoinStudyGroup
    ParticipateComm ..extend..> AccessGlobalChat
    ParticipateComm ..extend..> SearchContent
    ParticipateComm ..extend..> ReportContent
    ParticipateComm ..extend..> ReceiveNotifications
    
    CreatePost --> QuestionPost
    CreatePost --> ResourcePost
    CreatePost --> ProjectPost
    
    style ParticipateComm fill:#ffcccc
    style JoinStudyGroup fill:#ccffcc
    style AccessGlobalChat fill:#ccffcc
    style SearchContent fill:#ccffcc
    style ReportContent fill:#ccffcc
    style ReceiveNotifications fill:#ccffcc
```

**Discussion:**

The Community use case captures social learning and peer interaction features. Core activities through include relationships are creating posts, commenting, following users, and sharing resources — essential for building a collaborative learning community. Extensions enhance engagement through study groups for focused collaboration, global chat rooms for program-specific discussions (BSIT, BSCS, BSIS), content search for knowledge discovery, content reporting for community moderation, and notifications to keep users informed. The generalization of post types (questions, resources, project updates) shows diverse knowledge-sharing patterns within the CCIS student community.

#### 4.1.6 AI Mentor Use Case Relationships

```mermaid
graph TB
    InteractAI[Interact with AI Mentor]
    AskQuestion[Ask Question]
    GetCodeHelp[Get Code Assistance]
    RequestExplanation[Request Explanation]
    ViewHistory[View Chat History]
    
    SwitchAIModel[Switch AI Model]
    SaveConversation[Save Conversation]
    ShareWithInstructor[Share Chat with Instructor]
    GetRecommendations[Get Learning Recommendations]
    
    InteractAI -.include.-> AskQuestion
    InteractAI -.include.-> GetCodeHelp
    InteractAI -.include.-> RequestExplanation
    InteractAI -.include.-> ViewHistory
    
    InteractAI ..extend..> SwitchAIModel
    InteractAI ..extend..> SaveConversation
    InteractAI ..extend..> ShareWithInstructor
    InteractAI ..extend..> GetRecommendations
    
    style InteractAI fill:#ffcccc
    style SwitchAIModel fill:#ccffcc
    style SaveConversation fill:#ccffcc
    style ShareWithInstructor fill:#ccffcc
    style GetRecommendations fill:#ccffcc
```

**Discussion:**

The AI Mentor use case illustrates intelligent tutoring capabilities powered by OpenAI GPT-4 and Google Gemini. Essential interactions through include relationships are asking questions, getting code assistance, requesting explanations, and viewing conversation history — fundamental for personalized learning support. Extensions provide advanced features like switching between AI models (GPT-4 vs Gemini) for different capabilities, saving important conversations for future reference, sharing chats with instructors for additional support, and receiving AI-powered learning recommendations based on progress and interests. This use case demonstrates how artificial intelligence enhances the traditional learning experience with 24/7 availability and personalized assistance.

"""

# Read the file
with open('software_engineering_documentation.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of section 4.1
import re
# Find from "### 4.1 Use Case Modeling" to "### 4.2 Structural Modeling"
pattern = r'### 4\.1 Use Case Modeling.*?(?=### 4\.2 Structural Modeling)'
match = re.search(pattern, content, re.DOTALL)

if match:
    content = content[:match.start()] + new_usecase_section + content[match.end():]
    
    with open('software_engineering_documentation.md', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Successfully updated Use Case Modeling section!")
    print("\n📊 New Structure:")
    print("   4.1.1 - Main Use Case Diagram (5 high-level use cases)")
    print("   4.1.2 - User Management Relationships")
    print("   4.1.3 - Learning System Relationships")
    print("   4.1.4 - Project Collaboration Relationships")
    print("   4.1.5 - Community Relationships")
    print("   4.1.6 - AI Mentor Relationships")
    print("\n🎯 Each diagram shows:")
    print("   ✓ Include relationships (mandatory functions)")
    print("   ✓ Extend relationships (optional features)")
    print("   ✓ Generalization (specialized variations)")
    print("   ✓ Detailed discussion for each")
else:
    print("❌ Could not find section 4.1")
