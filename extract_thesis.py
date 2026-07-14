import sys
print("Running extractor...")
try:
    import docx
except ImportError:
    print("pip install python-docx required")
    sys.exit(1)

def extract(path):
    try:
        doc = docx.Document(path)
        fullText = []
        for para in doc.paragraphs:
            fullText.append(para.text)
        
        out_path = r"C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\docx_extracted_thesis.txt"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(fullText))
        print(f"Successfully extracted to {out_path}")
    except Exception as e:
        print(f"Error extracting docx: {e}")

extract(r"C:\Users\fosta\OneDrive\Desktop\THESIS\MyThesis-1\ThesisCCIS-Codehub.docx")
