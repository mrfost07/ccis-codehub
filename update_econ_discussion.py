"""Update Economic Feasibility discussion section with correct numbers"""

# Read the file
with open('software_engineering_documentation.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the discussion text with updated numbers
old_discussion = """The economic analysis demonstrates strong financial viability for the CCIS-CodeHub system with a positive return on investment beginning in the first year. The total three-year investment of $39,350 generates benefits worth $257,000, resulting in a net benefit of $217,650 and an overall ROI of 553%. The payback period is less than four months, indicating rapid cost recovery through immediate savings and improved operational efficiency."""

new_discussion = """The economic analysis demonstrates strong financial viability for the CCIS-CodeHub system with a positive return on investment beginning in the first year. The total three-year investment of $63,000 generates benefits worth $270,000, resulting in a net benefit of $207,000 and an overall ROI of 329%. The payback period is approximately six months, indicating rapid cost recovery through immediate savings and improved operational efficiency."""

content = content.replace(old_discussion, new_discussion)

# Write back
with open('software_engineering_documentation.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Updated Economic Feasibility discussion!")
print("\n📊 New numbers in discussion:")
print("   • Total 3-year costs: $63,000 (was $39,350)")
print("   • Total 3-year benefits: $270,000 (was $257,000)")
print("   • Net benefit: $207,000 (was $217,650)")
print("   • Overall ROI: 329% (was 553%)")
print("   • Payback period: ~6 months (was <4 months)")
