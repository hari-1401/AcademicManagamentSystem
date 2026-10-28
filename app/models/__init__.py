from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    password: str
    role: str  # admin, staff, student
    name: str
    regNo: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    isActive: bool = True

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Subject(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    subjectId: str
    name: str
    staffId: str
    syllabusText: Optional[str] = None
    totalStudents: int = 0
    addedStudents: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Quiz(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    subjectId: str
    staffId: str
    title: str
    questions: List[Dict]
    totalMarks: int
    deadline: Optional[datetime] = None
    isApproved: bool = False
    isAssigned: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class QuizSubmission(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    quizId: str
    studentId: str
    answers: Dict[str, str]
    marks: Optional[float] = None
    submittedAt: datetime = Field(default_factory=datetime.utcnow)
    isLate: bool = False
    penaltyApplied: float = 0

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class CaseStudy(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    subjectId: str
    staffId: str
    studentId: str
    topic: str
    deadline: datetime
    isApproved: bool = False
    isAssigned: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class CaseSubmission(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    caseStudyId: str
    studentId: str
    pdfPath: str
    extractedText: str
    evaluation: Optional[Dict] = None
    marks: Optional[float] = None
    plagiarismScore: Optional[float] = None
    submittedAt: datetime = Field(default_factory=datetime.utcnow)
    isLate: bool = False
    penaltyApplied: float = 0

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class LateRequest(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    studentId: str
    assignmentId: str
    assignmentType: str  # quiz, case_study
    reason: str
    status: str = "Pending"  # Pending, Approved, Rejected
    penaltyPercent: float = 0
    requestedAt: datetime = Field(default_factory=datetime.utcnow)
    respondedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PlagiarismReport(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    submissionId: str
    studentId: str
    similarityScore: float
    comparedWith: List[str]
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
