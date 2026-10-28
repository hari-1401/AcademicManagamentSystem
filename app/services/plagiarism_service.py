from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from app.config import settings

class PlagiarismService:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
    
    async def check_plagiarism(self, submission_text: str, other_submissions: list) -> dict:
        if not other_submissions:
            return {"similarity_score": 0.0, "compared_with": []}
        
        # Prepare texts
        texts = [submission_text] + [sub["text"] for sub in other_submissions]
        
        try:
            # Vectorize
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Calculate cosine similarity
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
            
            # Find max similarity
            max_similarity = float(np.max(similarities)) * 100 if len(similarities) > 0 else 0.0
            
            # Get IDs of similar submissions
            threshold = settings.PLAGIARISM_THRESHOLD / 100
            similar_indices = np.where(similarities > threshold)[0]
            compared_with = [other_submissions[i]["id"] for i in similar_indices]
            
            return {
                "similarity_score": round(max_similarity, 2),
                "compared_with": compared_with
            }
        except Exception as e:
            return {"similarity_score": 0.0, "compared_with": []}
    
    def calculate_penalty(self, plagiarism_score: float) -> float:
        if plagiarism_score > settings.PLAGIARISM_THRESHOLD:
            return settings.PLAGIARISM_PENALTY_PERCENT
        return 0.0

plagiarism_service = PlagiarismService()
