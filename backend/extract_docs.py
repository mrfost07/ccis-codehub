import docx
import sys
import os

try:
    import PyPDF2
except ImportError:
    os.system('pip install PyPDF2')
    import PyPDF2

def extract_docx(file_path):
    print(f"Extracting DOCX: {file_path}")
    doc = docx.Document(file_path)
    return '\n'.join([para.text for para in doc.paragraphs])

def extract_pdf(file_path):
    print(f"Extracting PDF: {file_path}")
    text = []
    with open(file_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            text.append(page.extract_text())
    return '\n'.join(text)

docx_path = r"C:\Users\fosta\OneDrive\Desktop\Software Engineering\softeng2\SoftEng2_CCIS-CodeHub.docx"
pdf_path = r"C:\Users\fosta\OneDrive\Desktop\THESIS\DEVELOPING AN ADAPTIVE SIGNATURE RECOGNITION SYSTEM WITH GNN, VAE, AND SIAMESE NETWORK.pdf"

try:
    docx_text = extract_docx(docx_path)
    with open("docx_extracted.txt", "w", encoding="utf-8") as f:
        f.write(docx_text)
    print("Saved docx_extracted.txt")
except Exception as e:
    print(f"Error DOCX: {e}")

try:
    pdf_text = extract_pdf(pdf_path)
    with open("pdf_extracted.txt", "w", encoding="utf-8") as f:
        f.write(pdf_text)
    print("Saved pdf_extracted.txt")
except Exception as e:
    print(f"Error PDF: {e}")
