"""Update UML Diagrams Viewer HTML with new use case diagrams - FIXED"""

# Read the current HTML file
with open('docs/UML_Diagrams_Viewer.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# New use case diagrams section
new_usecase_section = """    <div class="diagram-container">
        <h2>1. Main Use Case Diagram</h2>
        <p class="description">High-level overview showing the 5 core functional modules and how three actors (Student, Instructor, Administrator) interact with the CCIS-CodeHub system.</p>
        <button class="download-btn" onclick="downloadDiagram('usecase-main', 'UseCase-Main')">Download PNG</button>
        <div class="mermaid" id="usecase-main">
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
            
            Student --> UC2
            Student --> UC3
            Student --> UC4
            Student --> UC5
            
            Instructor --> UC2
            Instructor --> UC3
            Instructor --> UC4
            
            Admin --> UC1
            Admin --> UC2
            Admin --> UC3
            Admin --> UC4
            
            style SystemBoundary fill:#f0f0ff,stroke:#333,stroke-width:3px
        </div>
    </div>

    <div class="diagram-container">
        <h2>2. User Management Use Case</h2>
        <p class="description">User management functions including account creation, role assignment, and administrative features.</p>
        <button class="download-btn" onclick="downloadDiagram('usecase-user-mgmt', 'UseCase-UserManagement')">Download PNG</button>
        <div class="mermaid" id="usecase-user-mgmt">
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
        </div>
    </div>

    <div class="diagram-container">
        <h2>3. Learning System Use Case</h2>
        <p class="description">Learning interactions including viewing modules, quizzes, progress tracking, and certific ates.</p>
        <button class="download-btn" onclick="downloadDiagram('usecase-learning', 'UseCase-LearningSystem')">Download PNG</button>
        <div class="mermaid" id="usecase-learning">
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
            
            CreateContent --> ManageQuizzes
            CreateContent --> GradeAssessments
            
            style AccessLearning fill:#ffcccc
            style EarnCertificate fill:#ccffcc
            style ViewRecommendations fill:#ccffcc
            style BookmarkContent fill:#ccffcc
        </div>
    </div>

    <div class="diagram-container">
        <h2>4. Project Collaboration Use Case</h2>
        <p class="description">Team management features including tasks, file sharing, code review, and milestones.</p>
        <button class="download-btn" onclick="downloadDiagram('usecase-projects', 'UseCase-ProjectCollaboration')">Download PNG</button>
        <div class="mermaid" id="usecase-projects">
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
        </div>
    </div>

    <div class="diagram-container">
        <h2>5. Community Use Case</h2>
        <p class="description">Social learning including posts, comments, study groups, global chat, and peer interactions.</p>
        <button class="download-btn" onclick="downloadDiagram('usecase-community', 'UseCase-Community')">Download PNG</button>
        <div class="mermaid" id="usecase-community">
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
        </div>
    </div>

    <div class="diagram-container">
        <h2>6. AI Mentor Use Case</h2>
        <p class="description">AI tutoring features including questions, code assistance, history, and model switching (GPT-4/Gemini).</p>
        <button class="download-btn" onclick="downloadDiagram('usecase-ai', 'UseCase-AIMentor')">Download PNG</button>
        <div class="mermaid" id="usecase-ai">
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
        </div>
    </div>
"""

# Find the Class Diagram section (it starts with "2. Class Diagram - System Structure")
class_diagram_marker = '    <div class="diagram-container">\r\n        <h2>2. Class Diagram - System Structure</h2>'

if class_diagram_marker not in html_content:
    class_diagram_marker = '    <div class="diagram-container">\n        <h2>2. Class Diagram - System Structure</h2>'

class_diagram_start = html_content.find(class_diagram_marker)

if class_diagram_start > 0:
    # Find the first diagram container
    first_container = html_content.find('    <div class="diagram-container">')
    
    if first_container > 0:
        # Extract parts
        before_diagrams = html_content[:first_container]
        after_usecases = html_content[class_diagram_start:]
        
        # Renumber subsequent diagrams
        after_usecases = after_usecases.replace('<h2>2. Class Diagram - System Structure</h2>', '<h2>7. Class Diagram - System Structure</h2>')
        after_usecases = after_usecases.replace('<h2>3. Entity Relationship Diagram (ERD)</h2>', '<h2>8. Entity Relationship Diagram (ERD)</h2>')
        after_usecases = after_usecases.replace('<h2>4. Activity Diagram', '<h2>9. Activity Diagram')
        after_usecases = after_usecases.replace('<h2>5. Sequence Diagram', '<h2>10. Sequence Diagram')
        after_usecases = after_usecases.replace('<h2>6. Architecture Diagram', '<h2>11. Architecture Diagram')
        after_usecases = after_usecases.replace('<h2>7. Deployment Diagram', '<h2>12. Deployment Diagram')
        
        new_html = before_diagrams + new_usecase_section + '\n' + after_usecases
        
        with open('docs/UML_Diagrams_Viewer.html', 'w', encoding='utf-8') as f:
            f.write(new_html)
        
        print("✅ Successfully updated UML Diagrams Viewer!")
        print("\n📊 New Use Case Diagrams (1-6):")
        print("   1. Main Use Case Diagram")
        print("   2. User Management Use Case")
        print("   3. Learning System Use Case")
        print("   4. Project Collaboration Use Case")
        print("   5. Community Use Case")
        print("   6. AI Mentor Use Case")
        print("\n📋 Other diagrams renumbered (7-12):")
        print("   7. Class Diagram")
        print("   8. Entity Relationship Diagram")
        print("   9-12. Activity, Sequence, Architecture, Deployment")
        print("\n✨ Total: 12 diagrams in the HTML viewer!")
        print("\n🌐 Opening updated viewer in browser...")
    else:
        print("❌ Could not find first diagram container")
else:
    print(f"❌ Could not find Class Diagram section")
    print(f"Searched for: {class_diagram_marker[:50]}...")
