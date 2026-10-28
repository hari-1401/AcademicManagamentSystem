from pydantic import BaseModel

class UpdateQuizMarksRequest(BaseModel):
    quizId: str
    totalMarks: int
