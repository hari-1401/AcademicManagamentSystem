from pydantic import BaseModel
from typing import List, Dict

class ManualQuizQuestion(BaseModel):
    question: str
    options: Dict[str, str]  # {"A": "option1", "B": "option2", ...}
    correct_answer: str

class CreateManualQuizRequest(BaseModel):
    subjectId: str
    title: str
    questions: List[ManualQuizQuestion]
