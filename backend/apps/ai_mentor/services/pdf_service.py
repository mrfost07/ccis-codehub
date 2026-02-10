"""
PDF Parsing Service
Extracts text from PDF files for AI processing
"""

import PyPDF2
from typing import Optional

class PDFService:
    @staticmethod
    def extract_text(file_obj, max_pages: int = 20) -> Optional[str]:
        """
        Extract text from a PDF file object
        
        Args:
            file_obj: The uploaded file object (InMemoryUploadedFile)
            max_pages: Maximum number of pages to read (to prevent overload)
            
        Returns:
            Extracted text string or None if extraction fails
        """
        try:
            reader = PyPDF2.PdfReader(file_obj)
            text = ""
            
            # Limit pages to process
            num_pages = min(len(reader.pages), max_pages)
            
            for i in range(num_pages):
                page = reader.pages[i]
                text += page.extract_text() + "\n\n"
                
            return text.strip()
            
        except Exception as e:
            print(f"Error extracting PDF text: {str(e)}")
            return None
