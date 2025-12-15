"""Update Organizational Feasibility section for 2-member student team"""

# Read the file
with open('software_engineering_documentation.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Define old section
old_org_feasibility = """### 3.2 Organizational Feasibility

The development team possesses the necessary technical skills and experience to successfully implement and maintain the CCIS-CodeHub system. Team members have demonstrated proficiency in full-stack development using the chosen technology stack, as evidenced by the comprehensive system already developed. The project aligns perfectly with the educational goals of the College of Computer and Information Sciences, supporting both curriculum delivery and practical skill development for students.

Stakeholder support is evident through the system's focus on addressing real educational needs within the institution. Faculty and administrative buy-in can be expected due to the system's potential to enhance learning outcomes and provide valuable analytics on student progress. The project also serves as a practical learning experience for students involved in its development, creating a sustainable model for ongoing maintenance and enhancement through academic collaboration and student projects."""

# Define new section
new_org_feasibility = """### 3.2 Organizational Feasibility

This project is developed as a Software Engineering course requirement at SNSU CCIS by a dedicated two-member student development team. The lead programmer brings strong full-stack development capabilities, demonstrating proficiency in the chosen technology stack including Django, React, TypeScript, and modern web development practices. The team structure, while compact, is appropriate for an academic capstone project and allows for focused development with clear role assignments and efficient communication. Both team members possess the technical foundation required for implementing the system's core functionalities, supported by faculty guidance and access to comprehensive learning resources.

The project's organizational feasibility is strengthened by its alignment with SNSU CCIS educational objectives and curriculum requirements. As a Software Engineering project, CCIS-CodeHub serves dual purposes: fulfilling academic requirements while addressing genuine educational needs within the institution. Faculty advisors provide technical oversight and domain expertise, ensuring the project maintains academic rigor and practical relevance. The scope has been carefully designed to be achievable within the academic timeline by a two-member team, focusing on core features while utilizing established frameworks and APIs to minimize development complexity. The project demonstrates organizational viability through its clear documentation, structured development approach, and potential for future enhancement by subsequent student cohorts as part of ongoing academic initiatives."""

# Replace
content = content.replace(old_org_feasibility, new_org_feasibility)

# Write back
with open('software_engineering_documentation.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully updated Organizational Feasibility section!")
print("\n📝 Changes made:")
print("   • Updated to reflect 2-member student team")
print("   • Identified you as the lead programmer")
print("   • Emphasized Software Engineering project context")
print("   • Maintained feasibility arguments for academic project")
print("   • Added faculty advisor mentorship aspect")
print("   • Scope designed for 2-person team capability")
print("\n🎓 Now accurately represents your academic project!")
