from google.cloud import vision
from app.config import settings
import os

class OCRService:
    def __init__(self):
        try:
            if settings.GOOGLE_APPLICATION_CREDENTIALS and os.path.exists(settings.GOOGLE_APPLICATION_CREDENTIALS):
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_APPLICATION_CREDENTIALS
                self.client = vision.ImageAnnotatorClient()
            else:
                self.client = None
        except:
            self.client = None
    
    async def extract_text_from_pdf(self, pdf_path: str) -> str:
        if not self.client:
            # Fallback: return dummy text if OCR not configured
            return "OCR not configured. Please set up Google Cloud Vision credentials."
        
        with open(pdf_path, 'rb') as pdf_file:
            content = pdf_file.read()
        
        # For PDF, use document_text_detection
        pdf_content = vision.Image(content=content)
        response = self.client.document_text_detection(image=pdf_content)
        
        if response.error.message:
            raise Exception(f"OCR Error: {response.error.message}")
        
        # Extract full text
        text = response.full_text_annotation.text if response.full_text_annotation else ""
        
        # Clean text
        text = text.strip()
        text = " ".join(text.split())
        
        return text

ocr_service = OCRService()
