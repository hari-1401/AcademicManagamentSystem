from docx import Document
from typing import List, Dict
import re
from app.services.ai_service import ai_service


class DocumentService:
    async def extract_topics_from_docx(self, file_path: str) -> List[str]:
        """Extract topics/paragraphs from Word document"""
        doc = Document(file_path)
        topics = []
        
        for para in doc.paragraphs:
            text = para.text.strip()
            # Filter out empty paragraphs and very short ones
            if text and len(text) > 20:
                topics.append(text)
        
        return topics
    
    async def classify_topics_with_ai(self, topics: List[str], subject_name: str) -> List[Dict[str, str]]:
        """Use AI to classify and generate proper case study topics from paragraphs"""
        classified_topics = []
        
        for i, topic_text in enumerate(topics):
            prompt = f"""
Based on this paragraph from {subject_name} syllabus, generate a concise case study topic title (max 100 characters):

Paragraph: {topic_text[:500]}

Return ONLY the topic title, nothing else.
"""
            topic_title = await ai_service._call_gemini(prompt)
            classified_topics.append({
                "title": topic_title.strip(),
                "description": topic_text[:200] + "..." if len(topic_text) > 200 else topic_text,
                "original_text": topic_text
            })
        
        return classified_topics
    
    async def extract_and_classify(self, file_path: str, subject_name: str) -> List[Dict[str, str]]:
        """Complete pipeline: extract from docx and classify topics"""
        raw_topics = await self.extract_topics_from_docx(file_path)
        
        if not raw_topics:
            raise ValueError("No topics found in document")
        
        classified = await self.classify_topics_with_ai(raw_topics, subject_name)
        return classified


document_service = DocumentService()
