
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
        print('\n'.join(full_text))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    print("\n" + "="*50 + "\n")

file_path = r"C:\Users\fosta\OneDrive\Desktop\Software Engineering\Docs\Documentation_SoftEng\Fostanes & Arbois\Documentation\Doc_SYSTEM_CCISCODEHUB.docx"
read_docx(file_path)
