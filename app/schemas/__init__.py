from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr

# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str

# Admin Schemas
class AddStaffRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    department: Optional[str] = None

class CreateDepartmentRequest(BaseModel):
    departmentName: str
    departmentCode: str
    description: Optional[str] = None

class AddStudentRequest(BaseModel):
    email: EmailStr
    name: str
    regNo: str
    password: str
    className: Optional[str] = None  # e.g., "CSE-A", "ECE-B"

class CreateClassRequest(BaseModel):
    className: str  # e.g., "CSE-A", "ECE-B"
    semester: str  # e.g., "5th Semester", "Fall 2024"
    department: str  # e.g., "Computer Science"

class AddStudentsToClassRequest(BaseModel):
    className: str
    students: List[Dict[str, str]]  # [{"email": "", "name": "", "regNo": "", "password": ""}]

class AddClassToSubjectRequest(BaseModel):
    subjectId: str
    className: str

class ChangeDeadlineRequest(BaseModel):
    assignmentId: str
    assignmentType: str
    newDeadline: datetime

# Staff Schemas
class UploadSyllabusRequest(BaseModel):
    subjectId: str
    subjectName: str
    totalStudents: int

class CreateSubjectRequest(BaseModel):
    subjectId: str
    subjectName: str
    className: str
    semester: str
    modules: List[str]
    topics: List[str]
    totalStudents: int

class GenerateQuizRequest(BaseModel):
    subjectId: str
    title: str
    numQuestions: int = 50

class ApproveQuizRequest(BaseModel):
    quizId: str

class AssignQuizRequest(BaseModel):
    quizId: str
    deadline: datetime
    timeLimit: Optional[int] = None  # Time limit in minutes, None = no timer

class AddStudentToSubjectRequest(BaseModel):
    subjectId: str
    email: EmailStr
    name: str
    regNo: str

class ApproveLateRequest(BaseModel):
    requestId: str
    penaltyPercent: float = 0

class RejectLateRequest(BaseModel):
    requestId: str

class GenerateCaseStudyRequest(BaseModel):
    subjectId: str

class GenerateCaseStudyFromDocxRequest(BaseModel):
    subjectId: str

class ModuleTopics(BaseModel):
    moduleName: str
    topics: List[str]

class GenerateCaseStudyFromModulesRequest(BaseModel):
    subjectId: str
    modules: List[ModuleTopics]
    assignmentMode: str
    singleTopic: Optional[str] = None
    manualAssignments: Optional[Dict[str, str]] = None

class PreviewCaseStudyRequest(BaseModel):
    subjectId: str
    modules: List[ModuleTopics]
    assignmentMode: str
    singleTopic: Optional[str] = None
    manualAssignments: Optional[Dict[str, str]] = None

class AssignmentData(BaseModel):
    studentId: str
    topic: str
    module: Optional[str] = None

class UpdateCaseStudyTopicRequest(BaseModel):
    caseStudyId: str
    newTopic: str
    newModule: Optional[str] = None

class UpdateCaseStudyDeadlineRequest(BaseModel):
    subjectId: str
    newDeadline: datetime

class ConfirmCaseStudyAssignmentRequest(BaseModel):
    subjectId: str
    batchName: str
    assignments: List[AssignmentData]

class AssignCaseStudyRequest(BaseModel):
    subjectId: str
    batchName: str
    deadline: datetime
    caseStudyType: str  # "written" or "typed"
    minPages: int

class ManualCaseStudyRequest(BaseModel):
    subjectId: str
    studentId: str
    topic: str

class ManualMarkUpdateRequest(BaseModel):
    submissionId: str
    submissionType: str
    newMarks: float

# Student Schemas
class SubmitQuizRequest(BaseModel):
    quizId: str
    answers: Dict[str, str]
    tabSwitchCount: Optional[int] = 0
    autoSubmitted: Optional[bool] = False
    tabSwitchCount: Optional[int] = 0
    autoSubmitted: Optional[bool] = False

class JoinSubjectRequest(BaseModel):
    enrollmentToken: str
    email: EmailStr
    name: str
    regNo: str

class RequestLateApprovalRequest(BaseModel):
    assignmentId: str
    assignmentType: str
    reason: str

# Response Schemas
class QuizResponse(BaseModel):
    id: str
    title: str
    totalMarks: int
    deadline: Optional[datetime]
    isAssigned: bool
    questions: List[Dict]

class SubmissionResponse(BaseModel):
    id: str
    studentId: str
    studentName: str
    marks: Optional[float]
    submittedAt: datetime
    isLate: bool
    plagiarismScore: Optional[float]

class CaseStudyResponse(BaseModel):
    id: str
    topic: str
    deadline: datetime
    isAssigned: bool
