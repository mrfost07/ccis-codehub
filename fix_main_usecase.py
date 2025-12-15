"""Fix main use case diagram - Change Manage Users to Manage Profile and add Dashboard"""

# Read the documentation file
with open('software_engineering_documentation.md', 'r', encoding='utf-8') as f:
    doc_content = f.read()

# Update the main use case diagram
old_main_diagram = """```mermaid
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
```"""

new_main_diagram = """```mermaid
graph TB
    subgraph SystemBoundary["CCIS-CodeHub System"]
    UC1[Manage Profile]
    UC2[View Dashboard]
    UC3[Access Learning System]
    UC4[Collaborate on Projects]
    UC5[Participate in Community]
    UC6[Interact with AI Mentor]
    end
    
    Student((Student))
    Instructor((Instructor))
    Admin((Administrator))
    
    %% All users manage their own profiles
    Student --> UC1
    Instructor --> UC1
    Admin --> UC1
    
    %% All users view dashboards
    Student --> UC2
    Instructor --> UC2
    Admin --> UC2
    
    %% Learning System
    Student --> UC3
    Instructor --> UC3
    
    %% Projects
    Student --> UC4
    Instructor --> UC4
    
    %% Community
    Student --> UC5
    Instructor --> UC5
    Admin --> UC5
    
    %% AI Mentor
    Student --> UC6
    Instructor --> UC6
    
    style SystemBoundary fill:#f0f0ff,stroke:#333,stroke-width:3px
```"""

doc_content = doc_content.replace(old_main_diagram, new_main_diagram)

# Update the discussion to reflect the changes
old_discussion = """The main use case diagram presents a high-level view of the CCIS-CodeHub system, organized around five core functional modules."""

new_discussion = """The main use case diagram presents a high-level view of the CCIS-CodeHub system, organized around six core functional modules."""

doc_content = doc_content.replace(old_discussion, new_discussion)

# Update mention of modules
old_modules = """This high-level organization demonstrates the system's modular architecture, where each major use case represents a distinct functional domain"""

new_modules = """This high-level organization demonstrates the system's modular architecture with six main features: profile management (for all users to manage their personal information), dashboard viewing (for overview of activities and analytics), learning system access, project collaboration, community participation, and AI mentor interaction. Each major use case represents a distinct functional domain"""

doc_content = doc_content.replace(old_modules, new_modules)

# Write back to documentation
with open('software_engineering_documentation.md', 'w', encoding='utf-8') as f:
    f.write(doc_content)

# Now update the HTML viewer
with open('docs/UML_Diagrams_Viewer.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find and replace the main use case diagram in HTML
old_html_diagram = """            graph TB
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
            
            style SystemBoundary fill:#f0f0ff,stroke:#333,stroke-width:3px"""

new_html_diagram = """            graph TB
            subgraph SystemBoundary["CCIS-CodeHub System"]
            UC1[Manage Profile]
            UC2[View Dashboard]
            UC3[Access Learning System]
            UC4[Collaborate on Projects]
            UC5[Participate in Community]
            UC6[Interact with AI Mentor]
            end
            
            Student((Student))
            Instructor((Instructor))
            Admin((Administrator))
            
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
            
            style SystemBoundary fill:#f0f0ff,stroke:#333,stroke-width:3px"""

html_content = html_content.replace(old_html_diagram, new_html_diagram)

# Update the description
old_desc = """<p class="description">High-level overview showing the 5 core functional modules and how three actors (Student, Instructor, Administrator) interact with the CCIS-CodeHub system.</p>"""

new_desc = """<p class="description">High-level overview showing the 6 core functional modules: Manage Profile, View Dashboard, Access Learning System, Collaborate on Projects, Participate in Community, and Interact with AI Mentor.</p>"""

html_content = html_content.replace(old_desc, new_desc)

# Write back to HTML
with open('docs/UML_Diagrams_Viewer.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("✅ Successfully updated Main Use Case Diagram!")
print("\n📝 Changes made:")
print("   ✓ Changed 'Manage Users' → 'Manage Profile'")
print("   ✓ Added 'View Dashboard' as new use case")
print("   ✓ Updated from 5 to 6 core modules")
print("\n👥 Actor interactions:")
print("   • Manage Profile: Student, Instructor, Admin (all users)")
print("   • View Dashboard: Student, Instructor, Admin (all users)")
print("   • Access Learning: Student, Instructor")
print("   • Projects: Student, Instructor")
print("   • Community: Student, Instructor, Admin")
print("   • AI Mentor: Student, Instructor")
print("\n📄 Files updated:")
print("   ✓ software_engineering_documentation.md")
print("   ✓ docs/UML_Diagrams_Viewer.html")
