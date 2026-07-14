
import docx
import sys
import os

def read_docx(file_path):
    print(f"--- Reading {file_path} ---")
    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        
        output_path = file_path.replace(".docx", "_Extracted.txt")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write('\n'.join(full_text))
        print(f"Successfully wrote content to {output_path}")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    print("\n" + "="*50 + "\n")

files = [
    r"C:\Users\fosta\OneDrive\Desktop\Software Engineering\softeng2\SoftEng2_CCIS-CodeHub.docx"
]

for f in files:
    read_docx(f)
