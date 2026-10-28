from pydantic import BaseModel
from typing import List, Dict

class QuestionSchema(BaseModel):
    question: str
    options: Dict[str, str]
    correct_answer: str

class EditQuizRequest(BaseModel):
    quizId: str
    title: str
    questions: List[QuestionSchema]
