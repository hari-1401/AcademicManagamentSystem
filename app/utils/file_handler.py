from fastapi import UploadFile, HTTPException
from app.config import settings
import os
import uuid
from docx import Document

async def validate_document(file: UploadFile):
    allowed_extensions = ['.pdf', '.docx', '.doc']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")
    
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    
    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB")
    
    await file.seek(0)
    return content

async def validate_pdf(file: UploadFile):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    
    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB")
    
    await file.seek(0)
    return content

async def save_document(file: UploadFile, folder: str) -> str:
    content = await validate_document(file)
    
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(folder, filename)
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    return filepath

async def save_pdf(file: UploadFile, folder: str) -> str:
    content = await validate_pdf(file)
    
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(folder, filename)
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    return filepath

def extract_text_from_docx(filepath: str) -> str:
    doc = Document(filepath)
    return "\n".join([para.text for para in doc.paragraphs])
