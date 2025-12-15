"""
PDF Documentation Generator for CCIS-CodeHub
Generates a professional PDF from the software engineering documentation
"""

import os
import subprocess
from pathlib import Path

def generate_pdf_documentation():
    """
    Generate PDF documentation from markdown files
    """
    print("=" * 60)
    print("CCIS-CodeHub PDF Documentation Generator")
    print("=" * 60)
    print()
    
    # Define paths
    project_root = Path(__file__).parent.parent
    docs_dir = project_root / "docs"
    main_doc = project_root / "software_engineering_documentation.md"
    additional_diagrams = docs_dir / "additional_diagrams.md"
    output_pdf = project_root / "CCIS-CodeHub_Software_Engineering_Documentation.pdf"
    
    print(f"📁 Project Root: {project_root}")
    print(f"📄 Main Documentation: {main_doc}")
    print(f"📄 Additional Diagrams: {additional_diagrams}")
    print(f"📄 Output PDF: {output_pdf}")
    print()
    
    # Check if files exist
    if not main_doc.exists():
        print("❌ ERROR: Main documentation file not found!")
        return False
    
    print("✅ Documentation files found")
    print()
    
    # Method 1: Try using markdown-pdf (Node.js based)
    print("Attempting Method 1: markdown-pdf (Node.js)")
    print("-" * 60)
    
    try:
        # Check if markdown-pdf is installed
        result = subprocess.run(['npm', 'list', '-g', 'markdown-pdf'], 
                              capture_output=True, text=True)
        
        if 'markdown-pdf' not in result.stdout:
            print("📦 Installing markdown-pdf...")
            install_result = subprocess.run(['npm', 'install', '-g', 'markdown-pdf'],
                                          capture_output=True, text=True)
            if install_result.returncode != 0:
                print("⚠️  Could not install markdown-pdf")
                print("   Error:", install_result.stderr)
            else:
                print("✅ markdown-pdf installed successfully")
        
        # Generate PDF using markdown-pdf
        print("🔄 Generating PDF...")
        cmd = ['markdown-pdf', str(main_doc), '-o', str(output_pdf)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0 and output_pdf.exists():
            print(f"✅ PDF generated successfully using markdown-pdf!")
            print(f"📄 Output: {output_pdf}")
            print(f"📊 File size: {output_pdf.stat().st_size / 1024:.2f} KB")
            return True
        else:
            print("⚠️  markdown-pdf method failed")
            if result.stderr:
                print("   Error:", result.stderr)
                
    except FileNotFoundError:
        print("⚠️  npm not found. Skipping markdown-pdf method.")
    except Exception as e:
        print(f"⚠️  Error with markdown-pdf: {e}")
    
    print()
    
    # Method 2: Try using pandoc
    print("Attempting Method 2: Pandoc")
    print("-" * 60)
    
    try:
        # Check if pandoc is installed
        result = subprocess.run(['pandoc', '--version'], 
                              capture_output= True, text=True)
        
        if result.returncode == 0:
            print("✅ Pandoc found")
            print("🔄 Generating PDF with Pandoc...")
            
            # Create a combined markdown file
            combined_md = project_root / "combined_documentation.md"
            
            with open(combined_md, 'w', encoding='utf-8') as outfile:
                # Write main documentation
                with open(main_doc, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
                    outfile.write('\n\n---\n\n')
                
                # Write additional diagrams if exists
                if additional_diagrams.exists():
                    with open(additional_diagrams, 'r', encoding='utf-8') as infile:
                        outfile.write(infile.read())
            
            print(f"✅ Combined markdown created: {combined_md}")
            
            # Pandoc command with professional styling
            cmd = [
                'pandoc',
                str(combined_md),
                '-o', str(output_pdf),
                '--pdf-engine=xelatex',
                '-V', 'geometry:margin=1in',
                '-V', 'fontsize=12pt',
                '-V', 'documentclass=report',
                '-V', 'papersize=letter',
                '--toc',
                '--toc-depth=3',
                '--number-sections',
                '--highlight-style=tango'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0 and output_pdf.exists():
                print(f"✅ PDF generated successfully using Pandoc!")
                print(f"📄 Output: {output_pdf}")
                print(f"📊 File size: {output_pdf.stat().st_size / 1024:.2f} KB")
                
                # Clean up combined file
                combined_md.unlink()
                print("🧹 Cleaned up temporary files")
                return True
            else:
                print("⚠️  Pandoc PDF generation failed")
                if result.stderr:
                    print("   Error:", result.stderr)
                    
    except FileNotFoundError:
        print("⚠️  Pandoc not found. Please install Pandoc:")
        print("      Windows: https://pandoc.org/installing.html")
        print("      Or use: choco install pandoc")
    except Exception as e:
        print(f"⚠️  Error with Pandoc: {e}")
    
    print()
    
    # Method 3: Alternative - Print instructions
    print("Alternative Method: Manual PDF Generation")
    print("-" * 60)
    print("📝 INSTRUCTIONS:")
    print()
    print("1. Open the HTML viewer files in your browser:")
    print(f"   - {docs_dir / 'UML_Diagrams_Viewer.html'}")
    print(f"   - {docs_dir / 'Sequence_Diagrams_Viewer.html'}")
    print()
    print("2. Press Ctrl+P (or Cmd+P on Mac) to print")
    print("3. Select 'Save as PDF' as the printer")
    print("4. Adjust settings:")
    print("   - Layout: Portrait or Landscape (for wide diagrams)")
    print("   - Margins: Default or None")
    print("   - Background graphics: Enabled")
    print()
    print("5. For the main documentation:")
    print("   - Open in VS Code with Markdown Preview")
    print("   - Or use any Markdown to PDF converter online")
    print("   - Recommended: https://www.markdowntopdf.com/")
    print()
    print("=" * 60)
    print("📌 RECOMMENDED TOOLS TO INSTALL:")
    print("=" * 60)
    print()
    print("Option 1: Pandoc (Best quality)")
    print("  Windows: choco install pandoc")
    print("  Or download from: https://pandoc.org/installing.html")
    print()
    print("Option 2: Node.js markdown-pdf")
    print("  npm install -g markdown-pdf")
    print()
    print("Option 3: Python weasyprint")
    print("  pip install weasyprint")
    print("  pip install markdown")
    print()
    
    return False

def create_html_to_pdf_script():
    """Create a simple HTML to PDF converter script"""
    script_path = Path(__file__).parent.parent / "generate_diagram_pdfs.bat"
    
    script_content = """@echo off
REM PDF Generation Script for CCIS-CodeHub Documentation

echo ============================================================
echo CCIS-CodeHub Diagram PDF Generator
echo ============================================================
echo.

echo Opening diagram viewers in browser...
echo You can print these to PDF using Ctrl+P
echo.

REM Open HTML files in default browser
start "" "docs\\UML_Diagrams_Viewer.html"
timeout /t 2 /nobreak >nul
start "" "docs\\Sequence_Diagrams_Viewer.html"

echo.
echo ============================================================
echo INSTRUCTIONS:
echo ============================================================
echo 1. Both HTML files are now open in your browser
echo 2. Press Ctrl+P to open print dialog
echo 3. Select "Save as PDF" or "Microsoft Print to PDF"
echo 4. Choose destination and save
echo.
echo TIP: For better quality diagrams:
echo - Enable "Background graphics"
echo - Use "Landscape" orientation for wide diagrams
echo - Set margins to "None" or "Minimum"
echo.
echo ============================================================

pause
"""
    
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    print(f"\n✅ Created batch script: {script_path}")
    print("   Run this script to open diagram viewers for PDF export")

if __name__ == "__main__":
    try:
        success = generate_pdf_documentation()
        
        if not success:
            create_html_to_pdf_script()
            print("\n" + "=" * 60)
            print("SUMMARY")
            print("=" * 60)
            print("❌ Automatic PDF generation not available")
            print("✅ Created helper scripts for manual generation")
            print("✅ HTML diagram viewers ready")
            print()
            print("📌 Next steps:")
            print("1. Install Pandoc for automatic PDF generation")
            print("2. Or use the HTML viewers and print to PDF")
            print("3. Run 'generate_diagram_pdfs.bat' for diagrams")
            print("=" * 60)
        else:
            print("\n✅ PDF documentation generated successfully!")
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Generation cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
