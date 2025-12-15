"""Fix Mermaid diagrams with oval shapes, correct syntax, and better UI"""

# 1. Main Use Case Diagram
main_diagram = """```mermaid
graph TB
    subgraph SystemBoundary["CCIS-CodeHub System"]
        direction TB
        UC1([Manage Profile])
        UC2([View Dashboard])
        UC3([Access Learning System])
        UC4([Collaborate on Projects])
        UC5([Participate in Community])
        UC6([Interact with AI Mentor])
    end
    
    Student((Student))
    Instructor((Instructor))
    Admin((Administrator))
    
    %% Relationships
    Student --> UC1
    Instructor --> UC1
    Admin --> UC1
    
    Student --> UC2
    Instructor --> UC2
    Admin --> UC2
    
    Student --> UC3
    Instructor --> UC3
    
    Student --> UC4
    Instructor --> UC4
    
    Student --> UC5
    Instructor --> UC5
    Admin --> UC5
    
    Student --> UC6
    Instructor --> UC6
    
    style SystemBoundary fill:#f0f0ff,stroke:#333,stroke-width:3px
    classDef usecase fill:#fff,stroke:#333,stroke-width:2px;
    class UC1,UC2,UC3,UC4,UC5,UC6 usecase;
```"""

# 2. User Management
user_mgmt_diagram = """```mermaid
graph TB
    ManageUsers([Manage Users])
    CreateAccount([Create User Account])
    UpdateProfile([Update User Profile])
    AssignRoles([Assign User Roles])
    ResetPassword([Reset Password])
    DeactivateUser([Deactivate User])
    
    ViewAnalytics([View User Analytics])
    SendNotification([Send Notifications])
    
    StudentRole([Assign Student Role])
    InstructorRole([Assign Instructor Role])
    AdminRole([Assign Admin Role])
    
    %% Include: Base -> Included
    ManageUsers -. <<include>> .-> CreateAccount
    ManageUsers -. <<include>> .-> UpdateProfile
    ManageUsers -. <<include>> .-> AssignRoles
    ManageUsers -. <<include>> .-> ResetPassword
    
    %% Extend: Extension -> Base
    ViewAnalytics -. <<extend>> .-> ManageUsers
    SendNotification -. <<extend>> .-> ManageUsers
    DeactivateUser -. <<extend>> .-> ManageUsers
    
    %% Generalization: Child -> Parent
    StudentRole --|> AssignRoles
    InstructorRole --|> AssignRoles
    AdminRole --|> AssignRoles
    
    classDef base fill:#ffcccc,stroke:#333,stroke-width:2px;
    classDef extend fill:#ccffcc,stroke:#333,stroke-width:2px;
    classDef default fill:#fff,stroke:#333,stroke-width:2px;
    
    class ManageUsers base;
    class ViewAnalytics,SendNotification,DeactivateUser extend;
```"""

# 3. Learning System
learning_diagram = """```mermaid
graph TB
    AccessLearning([Access Learning System])
    ViewModules([View Learning Modules])
    TakeQuiz([Take Quiz])
    TrackProgress([Track Progress])
    ViewSlides([View Content Slides])
    DownloadMaterials([Download Materials])
    
    EarnCertificate([Earn Certificate])
    ViewRecommendations([View Recommendations])
    BookmarkContent([Bookmark Content])
    
    CreateContent([Create Learning Content])
    ManageQuizzes([Manage Quizzes])
    GradeAssessments([Grade Assessments])
    
    %% Include
    AccessLearning -. <<include>> .-> ViewModules
    AccessLearning -. <<include>> .-> TakeQuiz
    AccessLearning -. <<include>> .-> TrackProgress
    AccessLearning -. <<include>> .-> ViewSlides
    
    %% Extend
    EarnCertificate -. <<extend>> .-> AccessLearning
    ViewRecommendations -. <<extend>> .-> AccessLearning
    BookmarkContent -. <<extend>> .-> AccessLearning
    
    %% Include
    ViewModules -. <<include>> .-> DownloadMaterials
    
    %% Association
    CreateContent --> ManageQuizzes
    CreateContent --> GradeAssessments
    
    classDef base fill:#ffcccc,stroke:#333,stroke-width:2px;
    classDef extend fill:#ccffcc,stroke:#333,stroke-width:2px;
    classDef default fill:#fff,stroke:#333,stroke-width:2px;
    
    class AccessLearning base;
    class EarnCertificate,ViewRecommendations,BookmarkContent extend;
```"""

# 4. Project Collaboration
project_diagram = """```mermaid
graph TB
    CollabProject([Collaborate on Projects])
    CreateProject([Create Project])
    ManageTasks([Manage Tasks])
    ShareFiles([Share Files])
    UpdateProgress([Update Project Progress])
    
    InviteMembers([Invite Team Members])
    ReviewCode([Review Code])
    TrackMilestones([Track Milestones])
    ExportProject([Export Project Data])
    
    %% Include
    CreateProject -. <<include>> .-> InviteMembers
    CollabProject -. <<include>> .-> CreateProject
    CollabProject -. <<include>> .-> ManageTasks
    CollabProject -. <<include>> .-> ShareFiles
    CollabProject -. <<include>> .-> UpdateProgress
    
    %% Extend
    ReviewCode -. <<extend>> .-> CollabProject
    TrackMilestones -. <<extend>> .-> CollabProject
    ExportProject -. <<extend>> .-> CollabProject
    
    classDef base fill:#ffcccc,stroke:#333,stroke-width:2px;
    classDef extend fill:#ccffcc,stroke:#333,stroke-width:2px;
    classDef default fill:#fff,stroke:#333,stroke-width:2px;
    
    class CollabProject base;
    class ReviewCode,TrackMilestones,ExportProject extend;
```"""

# 5. Community
community_diagram = """```mermaid
graph TB
    ParticipateComm([Participate in Community])
    CreatePost([Create Post])
    CommentOnPost([Comment on Posts])
    FollowUsers([Follow Users])
    ShareResources([Share Resources])
    
    JoinStudyGroup([Join Study Group])
    AccessGlobalChat([Access Global Chat])
    SearchContent([Search Community Content])
    ReportContent([Report Inappropriate Content])
    ReceiveNotifications([Receive Notifications])
    
    QuestionPost([Ask Question])
    ResourcePost([Share Resource])
    ProjectPost([Share Project Update])
    
    %% Include
    ParticipateComm -. <<include>> .-> CreatePost
    ParticipateComm -. <<include>> .-> CommentOnPost
    ParticipateComm -. <<include>> .-> FollowUsers
    ParticipateComm -. <<include>> .-> ShareResources
    
    %% Extend
    JoinStudyGroup -. <<extend>> .-> ParticipateComm
    AccessGlobalChat -. <<extend>> .-> ParticipateComm
    SearchContent -. <<extend>> .-> ParticipateComm
    ReportContent -. <<extend>> .-> ParticipateComm
    ReceiveNotifications -. <<extend>> .-> ParticipateComm
    
    %% Generalization
    QuestionPost --|> CreatePost
    ResourcePost --|> CreatePost
    ProjectPost --|> CreatePost
    
    classDef base fill:#ffcccc,stroke:#333,stroke-width:2px;
    classDef extend fill:#ccffcc,stroke:#333,stroke-width:2px;
    classDef default fill:#fff,stroke:#333,stroke-width:2px;
    
    class ParticipateComm base;
    class JoinStudyGroup,AccessGlobalChat,SearchContent,ReportContent,ReceiveNotifications extend;
```"""

# 6. AI Mentor
ai_diagram = """```mermaid
graph TB
    InteractAI([Interact with AI Mentor])
    AskQuestion([Ask Question])
    GetCodeHelp([Get Code Assistance])
    RequestExplanation([Request Explanation])
    ViewHistory([View Chat History])
    
    SwitchAIModel([Switch AI Model])
    SaveConversation([Save Conversation])
    ShareWithInstructor([Share Chat with Instructor])
    GetRecommendations([Get Learning Recommendations])
    
    %% Include
    InteractAI -. <<include>> .-> AskQuestion
    InteractAI -. <<include>> .-> GetCodeHelp
    InteractAI -. <<include>> .-> RequestExplanation
    InteractAI -. <<include>> .-> ViewHistory
    
    %% Extend
    SwitchAIModel -. <<extend>> .-> InteractAI
    SaveConversation -. <<extend>> .-> InteractAI
    ShareWithInstructor -. <<extend>> .-> InteractAI
    GetRecommendations -. <<extend>> .-> InteractAI
    
    classDef base fill:#ffcccc,stroke:#333,stroke-width:2px;
    classDef extend fill:#ccffcc,stroke:#333,stroke-width:2px;
    classDef default fill:#fff,stroke:#333,stroke-width:2px;
    
    class InteractAI base;
    class SwitchAIModel,SaveConversation,ShareWithInstructor,GetRecommendations extend;
```"""

# Update software_engineering_documentation.md
with open('software_engineering_documentation.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Helper to replace diagram content
import re
def replace_diagram(content, header, new_diagram):
    # Pattern to find the mermaid block after a specific header
    # Looks for header, then some text, then ```mermaid ... ```
    pattern = re.compile(f"({header}.*?)(```mermaid\n.*?```)", re.DOTALL)
    match = pattern.search(content)
    if match:
        return content.replace(match.group(2), new_diagram.strip())
    return content

content = replace_diagram(content, "#### 4.1.1 Main Use Case Diagram", main_diagram)
content = replace_diagram(content, "#### 4.1.2 User Management Use Case Relationships", user_mgmt_diagram)
content = replace_diagram(content, "#### 4.1.3 Learning System Use Case Relationships", learning_diagram)
content = replace_diagram(content, "#### 4.1.4 Project Collaboration Use Case Relationships", project_diagram)
content = replace_diagram(content, "#### 4.1.5 Community Use Case Relationships", community_diagram)
content = replace_diagram(content, "#### 4.1.6 AI Mentor Use Case Relationships", ai_diagram)

with open('software_engineering_documentation.md', 'w', encoding='utf-8') as f:
    f.write(content)

# Update docs/UML_Diagrams_Viewer.html
with open('docs/UML_Diagrams_Viewer.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Helper for HTML replacement - finding by ID or surrounding div
def replace_html_diagram(content, div_id, new_diagram_inner):
    # Remove ```mermaid wrapper for HTML
    inner = new_diagram_inner.replace("```mermaid", "").replace("```", "").strip()
    pattern = re.compile(f'(<div class="mermaid" id="{div_id}">)(.*?)(</div>)', re.DOTALL)
    match = pattern.search(content)
    if match:
        return content.replace(match.group(2), "\n" + inner + "\n")
    return content

html_content = replace_html_diagram(html_content, "usecase-main", main_diagram)
html_content = replace_html_diagram(html_content, "usecase-user-mgmt", user_mgmt_diagram)
html_content = replace_html_diagram(html_content, "usecase-learning", learning_diagram)
html_content = replace_html_diagram(html_content, "usecase-projects", project_diagram)
html_content = replace_html_diagram(html_content, "usecase-community", community_diagram)
html_content = replace_html_diagram(html_content, "usecase-ai", ai_diagram)

with open('docs/UML_Diagrams_Viewer.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("✅ Successfully updated all use case diagrams with:")
print("   • Oval shapes ([ ])")
print("   • Correct syntax (<<include>>, <<extend>>)")
print("   • Improved UI styling (classDef)")
print("   • Updated both documentation and HTML viewer")
