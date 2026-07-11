import PyPDF2
import sys

try:
    pdf_path = r"C:\Users\fosta\OneDrive\Desktop\THESIS\DEVELOPING AN ADAPTIVE SIGNATURE RECOGNITION SYSTEM WITH GNN, VAE, AND SIAMESE NETWORK.pdf"
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
    with open(r"C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\tmp_pdf_extracted.txt", "w", encoding="utf-8") as out:
        out.write(text)
    print("PDF extraction successful.")
except Exception as e:
    print(f"Error extracting PDF: {e}")
