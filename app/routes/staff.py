from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.schemas import (
    UploadSyllabusRequest, GenerateQuizRequest, ApproveQuizRequest,
    AssignQuizRequest, AddStudentToSubjectRequest, ApproveLateRequest,
    RejectLateRequest, GenerateCaseStudyRequest, AssignCaseStudyRequest,
    ManualMarkUpdateRequest, CreateSubjectRequest, ManualCaseStudyRequest,
    GenerateCaseStudyFromDocxRequest, GenerateCaseStudyFromModulesRequest,
    PreviewCaseStudyRequest, UpdateCaseStudyTopicRequest, ConfirmCaseStudyAssignmentRequest,
    UpdateCaseStudyDeadlineRequest, AddClassToSubjectRequest
)
from app.schemas.manual_quiz import CreateManualQuizRequest
from app.schemas.update_quiz_marks import UpdateQuizMarksRequest
from app.schemas.edit_quiz import EditQuizRequest
from app.utils.auth import require_role
from app.utils.file_handler import save_pdf
from app.database import get_database
from app.services.ai_service import ai_service
from app.services.quiz_generator import generate_quiz as ai_generate_quiz
from app.services.ocr_service import ocr_service
from app.services.email_service import email_service
from app.services.document_service import document_service
import random
import os
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/staff", tags=["Staff"])

@router.post("/create-subject")
async def create_subject(
    request: CreateSubjectRequest,
    user: dict = Depends(require_role(["staff"]))
):
    db = await get_database()
    
    # Generate enrollment token
    from app.utils.auth import generate_enrollment_token
    enrollment_token = generate_enrollment_token()
    
    # Format syllabus text from modules and topics
    syllabus_text = f"Subject: {request.subjectName}\n"
    syllabus_text += f"Class: {request.className}\n"
    syllabus_text += f"Semester: {request.semester}\n\n"
    syllabus_text += "Modules:\n"
    for i, module in enumerate(request.modules, 1):
        syllabus_text += f"{i}. {module}\n"
    
    syllabus_text += "\nTopics:\n"
    for i, topic in enumerate(request.topics, 1):
        syllabus_text += f"{i}. {topic}\n"
    
    # Create subject
    subject_data = {
        "subjectId": request.subjectId,
        "name": request.subjectName,
        "className": request.className,
        "semester": request.semester,
        "staffId": str(user["_id"]),
        "syllabusText": syllabus_text,
        "modules": request.modules,
        "topics": request.topics,
        "totalStudents": request.totalStudents,
        "addedStudents": 0,
        "enrollmentToken": enrollment_token,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.subjects.insert_one(subject_data)
    
    # Generate enrollment link
    enrollment_link = f"http://localhost:8000/student/join/{enrollment_token}"
    
    return {
        "message": "Subject created successfully",
        "subjectId": str(result.inserted_id),
        "enrollmentToken": enrollment_token,
        "enrollmentLink": enrollment_link,
        "syllabusText": syllabus_text
    }

@router.post("/upload-syllabus")
async def upload_syllabus(
    file: UploadFile = File(...),
    subjectId: str = Form(...),
    subjectName: str = Form(...),
    className: str = Form(None),
    semester: str = Form(None),
    totalStudents: str = Form(...),
    user: dict = Depends(require_role(["staff"]))
):
    db = await get_database()
    
    try:
        total_students_int = int(totalStudents)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="totalStudents must be a number")
    
    pdf_path = await save_pdf(file, "uploads/syllabus")
    syllabus_text = await ocr_service.extract_text_from_pdf(pdf_path)
    
    from app.utils.auth import generate_enrollment_token
    enrollment_token = generate_enrollment_token()
    
    subject_data = {
        "subjectId": subjectId,
        "name": subjectName,
        "className": className,
        "semester": semester,
        "staffId": str(user["_id"]),
        "syllabusText": syllabus_text,
        "syllabusPath": pdf_path,
        "totalStudents": total_students_int,
        "addedStudents": 0,
        "enrollmentToken": enrollment_token,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.subjects.insert_one(subject_data)
    enrollment_link = f"http://localhost:8000/student/join/{enrollment_token}"
    
    return {
        "message": "Syllabus uploaded successfully",
        "subjectId": str(result.inserted_id),
        "enrollmentToken": enrollment_token,
        "enrollmentLink": enrollment_link,
        "extractedTextLength": len(syllabus_text)
    }

@router.post("/generate-quiz")
async def generate_quiz(request: GenerateQuizRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    questions = await ai_generate_quiz(request.title, request.numQuestions)
    
    quiz_data = {
        "subjectId": request.subjectId,
        "staffId": str(user["_id"]),
        "title": request.title,
        "questions": questions,
        "totalMarks": len(questions),
        "isApproved": True,
        "isAssigned": False,
        "createdAt": datetime.utcnow()
    }

    result = await db.quizzes.insert_one(quiz_data)

    return {
        "message": "Quiz generated successfully",
        "quizId": str(result.inserted_id),
        "totalQuestions": len(questions),
        "questions": questions
    }

@router.post("/create-manual-quiz")
async def create_manual_quiz(request: CreateManualQuizRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    questions = [q.dict() for q in request.questions]
    
    quiz_data = {
        "subjectId": request.subjectId,
        "staffId": str(user["_id"]),
        "title": request.title,
        "questions": questions,
        "totalMarks": len(questions),
        "isApproved": True,
        "isAssigned": False,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.quizzes.insert_one(quiz_data)
    
    return {
        "message": "Manual quiz created successfully",
        "quizId": str(result.inserted_id),
        "totalQuestions": len(questions)
    }

@router.post("/approve-quiz")
async def approve_quiz(request: ApproveQuizRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    result = await db.quizzes.update_one(
        {"_id": ObjectId(request.quizId), "staffId": str(user["_id"])},
        {"$set": {"isApproved": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return {"message": "Quiz approved successfully"}

@router.post("/assign-quiz")
async def assign_quiz(request: AssignQuizRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    # Get quiz
    quiz = await db.quizzes.find_one({"_id": ObjectId(request.quizId)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if not quiz.get("isApproved"):
        raise HTTPException(status_code=400, detail="Quiz must be approved before assignment")
    
    # Update quiz with timeLimit
    update_data = {"isAssigned": True, "deadline": request.deadline}
    if request.timeLimit is not None:
        update_data["timeLimit"] = request.timeLimit
    
    await db.quizzes.update_one(
        {"_id": ObjectId(request.quizId)},
        {"$set": update_data}
    )
    
    # Get subject
    subject = await db.subjects.find_one({"subjectId": quiz["subjectId"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get enrolled students for this subject
    enrollments = await db.subject_enrollments.find({"subjectId": quiz["subjectId"]}).to_list(None)
    student_ids = [enrollment["studentId"] for enrollment in enrollments]
    
    # Send emails to enrolled students
    email_count = 0
    for student_id in student_ids:
        student = await db.users.find_one({"_id": ObjectId(student_id)})
        if student:
            await email_service.send_quiz_assignment(
                student["email"],
                student["name"],
                quiz["title"],
                request.deadline.strftime("%Y-%m-%d %H:%M")
            )
            email_count += 1
    
    return {"message": "Quiz assigned successfully", "studentsNotified": email_count}

@router.post("/add-class-to-subject")
async def add_class_to_subject(request: AddClassToSubjectRequest, user: dict = Depends(require_role(["staff"]))):
    """Add entire class to subject and send automated emails to all students"""
    db = await get_database()
    
    # Get subject
    subject = await db.subjects.find_one({"subjectId": request.subjectId, "staffId": str(user["_id"])})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get class
    class_doc = await db.classes.find_one({"className": request.className})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    students_in_class = class_doc.get("students", [])
    if not students_in_class:
        raise HTTPException(status_code=400, detail="No students in this class")
    
    added_count = 0
    already_enrolled = 0
    
    for student_info in students_in_class:
        student_id = student_info["studentId"]
        
        existing_enrollment = await db.subject_enrollments.find_one({
            "subjectId": request.subjectId,
            "studentId": student_id
        })
        
        if existing_enrollment:
            already_enrolled += 1
            continue
        
        await db.subject_enrollments.insert_one({
            "subjectId": request.subjectId,
            "studentId": student_id,
            "enrolledAt": datetime.utcnow()
        })
        
        student = await db.users.find_one({"_id": ObjectId(student_id)})
        if student:
            await email_service.send_subject_creation(
                student["email"],
                student["name"],
                subject["name"],
                user["name"]
            )
        
        added_count += 1
    
    # Update both addedStudents and totalStudents to reflect reality
    total_enrolled = await db.subject_enrollments.count_documents({"subjectId": request.subjectId})
    await db.subjects.update_one(
        {"subjectId": request.subjectId},
        {"$set": {"addedStudents": total_enrolled, "totalStudents": total_enrolled}}
    )
    
    return {
        "message": f"Added {added_count} students from {request.className} to {subject['name']}",
        "addedStudents": added_count,
        "alreadyEnrolled": already_enrolled,
        "totalStudents": len(students_in_class)
    }

@router.get("/available-classes")
async def get_available_classes(user: dict = Depends(require_role(["staff"]))):
    """Get all available classes that can be added to subjects"""
    db = await get_database()
    
    classes = await db.classes.find().to_list(None)
    
    result = []
    for cls in classes:
        result.append({
            "className": cls["className"],
            "semester": cls.get("semester", "N/A"),
            "department": cls.get("department", "N/A"),
            "totalStudents": len(cls.get("students", []))
        })
    
    return {"classes": result}

@router.post("/add-student-to-subject")
async def add_student_to_subject(request: AddStudentToSubjectRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    # Get subject
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if subject["addedStudents"] >= subject["totalStudents"]:
        raise HTTPException(status_code=400, detail="Maximum students already added")
    
    # Check if student exists by email
    student = await db.users.find_one({"email": request.email, "role": "student"})
    
    if student:
        # Student exists - check if regNo matches
        if student.get("regNo") != request.regNo:
            raise HTTPException(status_code=400, detail=f"Student exists with different registration number: {student.get('regNo')}")
        student_id = str(student["_id"])
    else:
        # Create new student with provided regNo
        from app.utils.auth import hash_password
        student_data = {
            "email": request.email,
            "name": request.name,
            "regNo": request.regNo,
            "password": hash_password("default123"),
            "role": "student",
            "createdAt": datetime.utcnow(),
            "isActive": True
        }
        result = await db.users.insert_one(student_data)
        student_id = str(result.inserted_id)
    
    # Check if already enrolled
    existing_enrollment = await db.subject_enrollments.find_one({
        "subjectId": request.subjectId,
        "studentId": student_id
    })
    
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="Student already enrolled in this subject")
    
    # Create enrollment
    await db.subject_enrollments.insert_one({
        "subjectId": request.subjectId,
        "studentId": student_id,
        "enrolledAt": datetime.utcnow()
    })
    
    # Update subject count
    await db.subjects.update_one(
        {"subjectId": request.subjectId},
        {"$inc": {"addedStudents": 1}}
    )
    
    # Send email notification to student
    student_data = student if student else await db.users.find_one({"_id": ObjectId(student_id)})
    if student_data:
        await email_service.send_subject_creation(
            student_data["email"],
            student_data["name"],
            subject["name"],
            user["name"]
        )
    
    return {"message": "Student added to subject successfully"}

@router.get("/view-submissions/{quiz_id}")
async def view_quiz_submissions(quiz_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    submissions = await db.quiz_submissions.find({"quizId": quiz_id}).to_list(None)
    
    result = []
    for sub in submissions:
        student = await db.users.find_one({"_id": ObjectId(sub["studentId"])})
        result.append({
            "id": str(sub["_id"]),
            "studentId": sub["studentId"],
            "studentName": student["name"] if student else "Unknown",
            "marks": sub.get("marks"),
            "submittedAt": sub["submittedAt"],
            "isLate": sub.get("isLate", False),
            "penaltyApplied": sub.get("penaltyApplied", 0)
        })
    
    return {"submissions": result}

@router.get("/case-submission-file/{case_study_id}")
async def get_case_submission_file(case_study_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    submission = await db.case_submissions.find_one({"caseStudyId": case_study_id})
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found")
    doc_path = submission.get("documentPath")
    if not doc_path or not os.path.exists(doc_path):
        raise HTTPException(status_code=404, detail="Submitted file not found on server")
    filename = os.path.basename(doc_path)
    # Detect media type
    if filename.lower().endswith(".pdf"):
        media_type = "application/pdf"
    else:
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(doc_path, media_type=media_type, filename=filename)

@router.get("/case-submission/{case_study_id}")
async def get_case_submission(case_study_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    submission = await db.case_submissions.find_one({"caseStudyId": case_study_id})
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found")
    student = await db.users.find_one({"_id": ObjectId(submission["studentId"])})
    return {
        "submissionId": str(submission["_id"]),
        "studentName": student["name"] if student else "Unknown",
        "marks": submission.get("marks"),
        "plagiarismScore": submission.get("plagiarismScore"),
        "evaluation": submission.get("evaluation"),
        "submittedAt": submission["submittedAt"],
        "isLate": submission.get("isLate", False),
        "extractedText": submission.get("extractedText", "")
    }

@router.post("/run-ai-correction/{case_study_id}")
async def run_ai_correction(case_study_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    case_study = await db.case_studies.find_one({"_id": ObjectId(case_study_id)})
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")
    submission = await db.case_submissions.find_one({"caseStudyId": case_study_id})
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found")
    from app.services.ai_service import ai_service
    evaluation = await ai_service.evaluate_case_study(case_study["topic"], submission["extractedText"])
    await db.case_submissions.update_one(
        {"_id": submission["_id"]},
        {"$set": {"evaluation": evaluation, "marks": evaluation.get("total_marks", submission.get("marks"))}}
    )
    return {"evaluation": evaluation, "marks": evaluation.get("total_marks")}

@router.post("/run-plagiarism/{case_study_id}")
async def run_plagiarism(case_study_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    submission = await db.case_submissions.find_one({"caseStudyId": case_study_id})
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found")
    other_submissions = await db.case_submissions.find({
        "caseStudyId": {"$ne": case_study_id},
        "_id": {"$ne": submission["_id"]}
    }).to_list(None)
    other_texts = [{"id": str(s["_id"]), "text": s.get("extractedText", "")} for s in other_submissions if s.get("extractedText")]
    from app.services.plagiarism_service import plagiarism_service
    result = await plagiarism_service.check_plagiarism(submission.get("extractedText", ""), other_texts)
    await db.case_submissions.update_one(
        {"_id": submission["_id"]},
        {"$set": {"plagiarismScore": result["similarity_score"]}}
    )
    return {"similarityScore": result["similarity_score"], "comparedWith": result.get("compared_with", [])}

@router.get("/view-case-submissions/{case_study_id}")
async def view_case_submissions(case_study_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    submissions = await db.case_submissions.find({"caseStudyId": case_study_id}).to_list(None)
    
    result = []
    for sub in submissions:
        student = await db.users.find_one({"_id": ObjectId(sub["studentId"])})
        result.append({
            "id": str(sub["_id"]),
            "studentId": sub["studentId"],
            "studentName": student["name"] if student else "Unknown",
            "marks": sub.get("marks"),
            "plagiarismScore": sub.get("plagiarismScore"),
            "submittedAt": sub["submittedAt"],
            "isLate": sub.get("isLate", False),
            "evaluation": sub.get("evaluation")
        })
    
    return {"submissions": result}

@router.put("/approve-late")
async def approve_late_request(request: ApproveLateRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    late_request = await db.late_requests.find_one({"_id": ObjectId(request.requestId)})
    if not late_request:
        raise HTTPException(status_code=404, detail="Late request not found")
    
    # Update request
    await db.late_requests.update_one(
        {"_id": ObjectId(request.requestId)},
        {"$set": {
            "status": "Approved",
            "penaltyPercent": request.penaltyPercent,
            "respondedAt": datetime.utcnow()
        }}
    )
    
    # Send email
    student = await db.users.find_one({"_id": ObjectId(late_request["studentId"])})
    if student:
        await email_service.send_late_request_response(
            student["email"],
            student["name"],
            "Approved",
            request.penaltyPercent
        )
    
    return {"message": "Late request approved"}

@router.put("/reject-late")
async def reject_late_request(request: RejectLateRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    late_request = await db.late_requests.find_one({"_id": ObjectId(request.requestId)})
    if not late_request:
        raise HTTPException(status_code=404, detail="Late request not found")
    
    # Update request
    await db.late_requests.update_one(
        {"_id": ObjectId(request.requestId)},
        {"$set": {
            "status": "Rejected",
            "respondedAt": datetime.utcnow()
        }}
    )
    
    # Send email
    student = await db.users.find_one({"_id": ObjectId(late_request["studentId"])})
    if student:
        await email_service.send_late_request_response(
            student["email"],
            student["name"],
            "Rejected"
        )
    
    return {"message": "Late request rejected"}

@router.post("/generate-case-study")
async def generate_case_study(request: GenerateCaseStudyRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    # Get subject
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get students enrolled in this subject
    subject_enrollments = await db.subject_enrollments.find({"subjectId": request.subjectId}).to_list(None)
    student_ids = [enrollment["studentId"] for enrollment in subject_enrollments]
    
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students enrolled in this subject")
    
    # Get existing topics for this subject
    existing_case_studies = await db.case_studies.find({"subjectId": request.subjectId}).to_list(None)
    existing_topics = [cs["topic"] for cs in existing_case_studies]
    
    # Generate unique topics for each student
    case_studies = []
    for student_id in student_ids:
        student = await db.users.find_one({"_id": ObjectId(student_id)})
        if not student:
            continue
            
        topic = await ai_service.generate_case_study_topic(subject["name"], existing_topics)
        existing_topics.append(topic)
        
        case_study_data = {
            "subjectId": request.subjectId,
            "staffId": str(user["_id"]),
            "studentId": student_id,
            "topic": topic,
            "deadline": datetime.utcnow(),
            "isApproved": False,
            "isAssigned": False,
            "createdAt": datetime.utcnow()
        }
        
        result = await db.case_studies.insert_one(case_study_data)
        case_studies.append({
            "id": str(result.inserted_id),
            "studentName": student["name"],
            "topic": topic
        })
    
    return {
        "message": "Case studies generated successfully",
        "totalStudents": len(case_studies),
        "caseStudies": case_studies
    }

@router.post("/generate-case-study-from-docx")
async def generate_case_study_from_docx(
    file: UploadFile = File(...),
    subjectId: str = None,
    user: dict = Depends(require_role(["staff"]))
):
    """Upload Word file, extract topics, and randomly assign to students"""
    db = await get_database()
    
    if not subjectId:
        raise HTTPException(status_code=400, detail="subjectId is required")
    
    # Validate file type
    if not file.filename.endswith(('.docx', '.doc')):
        raise HTTPException(status_code=400, detail="Only Word files (.docx, .doc) are supported")
    
    # Get subject
    subject = await db.subjects.find_one({"subjectId": subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get enrolled students
    subject_enrollments = await db.subject_enrollments.find({"subjectId": subjectId}).to_list(None)
    student_ids = [enrollment["studentId"] for enrollment in subject_enrollments]
    
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students enrolled in this subject")
    
    # Save Word file
    import uuid
    import os
    upload_dir = "uploads/case_study_topics"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{uuid.uuid4()}_{file.filename}")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Extract and classify topics
    try:
        classified_topics = await document_service.extract_and_classify(file_path, subject["name"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
    
    if len(classified_topics) < len(student_ids):
        raise HTTPException(
            status_code=400, 
            detail=f"Not enough topics ({len(classified_topics)}) for students ({len(student_ids)})"
        )
    
    # Randomly shuffle topics
    random.shuffle(classified_topics)
    
    # Assign topics to students
    case_studies = []
    for i, student_id in enumerate(student_ids):
        student = await db.users.find_one({"_id": ObjectId(student_id)})
        if not student:
            continue
        
        topic_data = classified_topics[i]
        
        case_study_data = {
            "subjectId": subjectId,
            "staffId": str(user["_id"]),
            "studentId": student_id,
            "topic": topic_data["title"],
            "description": topic_data["description"],
            "deadline": datetime.utcnow(),
            "isApproved": False,
            "isAssigned": False,
            "createdAt": datetime.utcnow()
        }
        
        result = await db.case_studies.insert_one(case_study_data)
        case_studies.append({
            "id": str(result.inserted_id),
            "studentName": student["name"],
            "regNo": student.get("regNo", "N/A"),
            "topic": topic_data["title"],
            "description": topic_data["description"]
        })
    
    return {
        "message": "Case studies generated from Word file and assigned randomly",
        "totalTopicsExtracted": len(classified_topics),
        "totalStudents": len(case_studies),
        "caseStudies": case_studies
    }

@router.post("/generate-case-study-from-modules")
async def generate_case_study_from_modules(
    request: GenerateCaseStudyFromModulesRequest,
    user: dict = Depends(require_role(["staff"]))
):
    """Generate case studies from module-based topics with flexible assignment modes"""
    db = await get_database()
    
    # Get subject
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get enrolled students
    subject_enrollments = await db.subject_enrollments.find({"subjectId": request.subjectId}).to_list(None)
    student_ids = [enrollment["studentId"] for enrollment in subject_enrollments]
    
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students enrolled in this subject")
    
    # Parse topics from modules
    all_topics = []
    for module in request.modules:
        module_name = module.moduleName
        topics = module.topics
        for topic in topics:
            all_topics.append({
                "module": module_name,
                "topic": topic.strip()
            })
    
    if not all_topics and request.assignmentMode != "same_for_all":
        raise HTTPException(status_code=400, detail="No topics provided")
    
    case_studies = []
    
    # Assignment Mode: Same topic for all students
    if request.assignmentMode == "same_for_all":
        if not request.singleTopic:
            raise HTTPException(status_code=400, detail="singleTopic is required for same_for_all mode")
        
        for student_id in student_ids:
            student = await db.users.find_one({"_id": ObjectId(student_id)})
            if not student:
                continue
            
            case_study_data = {
                "subjectId": request.subjectId,
                "staffId": str(user["_id"]),
                "studentId": student_id,
                "topic": request.singleTopic,
                "module": "All Students",
                "deadline": datetime.utcnow(),
                "isApproved": False,
                "isAssigned": False,
                "createdAt": datetime.utcnow()
            }
            
            result = await db.case_studies.insert_one(case_study_data)
            case_studies.append({
                "id": str(result.inserted_id),
                "studentName": student["name"],
                "regNo": student.get("regNo", "N/A"),
                "topic": request.singleTopic,
                "module": "All Students"
            })
    
    # Assignment Mode: Manual assignment
    elif request.assignmentMode == "manual":
        if not request.manualAssignments:
            raise HTTPException(status_code=400, detail="manualAssignments is required for manual mode")
        
        for student_id, topic in request.manualAssignments.items():
            student = await db.users.find_one({"_id": ObjectId(student_id)})
            if not student:
                continue
            
            # Find module for this topic
            module_name = "Custom"
            for topic_data in all_topics:
                if topic_data["topic"] == topic:
                    module_name = topic_data["module"]
                    break
            
            case_study_data = {
                "subjectId": request.subjectId,
                "staffId": str(user["_id"]),
                "studentId": student_id,
                "topic": topic,
                "module": module_name,
                "deadline": datetime.utcnow(),
                "isApproved": False,
                "isAssigned": False,
                "createdAt": datetime.utcnow()
            }
            
            result = await db.case_studies.insert_one(case_study_data)
            case_studies.append({
                "id": str(result.inserted_id),
                "studentName": student["name"],
                "regNo": student.get("regNo", "N/A"),
                "topic": topic,
                "module": module_name
            })
    
    # Assignment Mode: Random assignment
    else:  # random
        num_students = len(student_ids)
        num_topics = len(all_topics)
        
        # Handle case where students > topics (repeat topics)
        if num_students > num_topics:
            # Calculate how many times to repeat
            repeats = (num_students // num_topics) + 1
            extended_topics = all_topics * repeats
            random.shuffle(extended_topics)
            assigned_topics = extended_topics[:num_students]
        else:
            # More topics than students, shuffle and pick
            shuffled_topics = all_topics.copy()
            random.shuffle(shuffled_topics)
            assigned_topics = shuffled_topics[:num_students]
        
        for i, student_id in enumerate(student_ids):
            student = await db.users.find_one({"_id": ObjectId(student_id)})
            if not student:
                continue
            
            topic_data = assigned_topics[i]
            
            case_study_data = {
                "subjectId": request.subjectId,
                "staffId": str(user["_id"]),
                "studentId": student_id,
                "topic": topic_data["topic"],
                "module": topic_data["module"],
                "deadline": datetime.utcnow(),
                "isApproved": False,
                "isAssigned": False,
                "createdAt": datetime.utcnow()
            }
            
            result = await db.case_studies.insert_one(case_study_data)
            case_studies.append({
                "id": str(result.inserted_id),
                "studentName": student["name"],
                "regNo": student.get("regNo", "N/A"),
                "topic": topic_data["topic"],
                "module": topic_data["module"]
            })
    
    return {
        "message": f"Case studies assigned successfully using {request.assignmentMode} mode",
        "assignmentMode": request.assignmentMode,
        "totalTopics": len(all_topics),
        "totalStudents": len(case_studies),
        "caseStudies": case_studies
    }

@router.post("/preview-case-study-assignment")
async def preview_case_study_assignment(
    request: PreviewCaseStudyRequest,
    user: dict = Depends(require_role(["staff"]))
):
    """Preview case study assignments without saving to database"""
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    subject_enrollments = await db.subject_enrollments.find({"subjectId": request.subjectId}).to_list(None)
    student_ids = [enrollment["studentId"] for enrollment in subject_enrollments]
    
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students enrolled in this subject")
    
    all_topics = []
    for module in request.modules:
        module_name = module.moduleName
        topics = module.topics
        for topic in topics:
            all_topics.append({"module": module_name, "topic": topic.strip()})
    
    preview_assignments = []
    
    if request.assignmentMode == "same_for_all":
        for student_id in student_ids:
            student = await db.users.find_one({"_id": ObjectId(student_id)})
            if student:
                preview_assignments.append({
                    "studentId": student_id,
                    "studentName": student["name"],
                    "regNo": student.get("regNo", "N/A"),
                    "topic": request.singleTopic,
                    "module": "All Students"
                })
    
    elif request.assignmentMode == "manual":
        for student_id, topic in (request.manualAssignments or {}).items():
            student = await db.users.find_one({"_id": ObjectId(student_id)})
            if student:
                module_name = "Custom"
                for topic_data in all_topics:
                    if topic_data["topic"] == topic:
                        module_name = topic_data["module"]
                        break
                preview_assignments.append({
                    "studentId": student_id,
                    "studentName": student["name"],
                    "regNo": student.get("regNo", "N/A"),
                    "topic": topic,
                    "module": module_name
                })
    
    else:  # random
        num_students = len(student_ids)
        num_topics = len(all_topics)
        
        if num_students > num_topics:
            repeats = (num_students // num_topics) + 1
            extended_topics = all_topics * repeats
            random.shuffle(extended_topics)
            assigned_topics = extended_topics[:num_students]
        else:
            shuffled_topics = all_topics.copy()
            random.shuffle(shuffled_topics)
            assigned_topics = shuffled_topics[:num_students]
        
        for i, student_id in enumerate(student_ids):
            student = await db.users.find_one({"_id": ObjectId(student_id)})
            if student:
                topic_data = assigned_topics[i]
                preview_assignments.append({
                    "studentId": student_id,
                    "studentName": student["name"],
                    "regNo": student.get("regNo", "N/A"),
                    "topic": topic_data["topic"],
                    "module": topic_data["module"]
                })
    
    return {
        "message": "Preview generated",
        "assignmentMode": request.assignmentMode,
        "totalTopics": len(all_topics),
        "totalStudents": len(preview_assignments),
        "assignments": preview_assignments
    }

@router.post("/confirm-case-study-assignment")
async def confirm_case_study_assignment(
    request: ConfirmCaseStudyAssignmentRequest,
    user: dict = Depends(require_role(["staff"]))
):
    """Confirm and save case study assignments after preview/edit"""
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    case_studies = []
    for assignment in request.assignments:
        case_study_data = {
            "subjectId": request.subjectId,
            "staffId": str(user["_id"]),
            "studentId": assignment.studentId,
            "topic": assignment.topic,
            "module": assignment.module or "Custom",
            "batchName": request.batchName,
            "deadline": datetime.utcnow(),
            "isApproved": False,
            "isAssigned": False,
            "createdAt": datetime.utcnow()
        }
        
        result = await db.case_studies.insert_one(case_study_data)
        case_studies.append({
            "id": str(result.inserted_id),
            "studentId": assignment.studentId,
            "topic": assignment.topic,
            "module": assignment.module or "Custom"
        })
    
    return {
        "message": "Case studies confirmed and saved",
        "batchName": request.batchName,
        "totalStudents": len(case_studies),
        "caseStudies": case_studies
    }

@router.get("/download-case-study-assignments/{subject_id}")
async def download_case_study_assignments(
    subject_id: str,
    user: dict = Depends(require_role(["staff"]))
):
    """Get case study assignments for PDF generation"""
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": subject_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    case_studies = await db.case_studies.find({
        "subjectId": subject_id,
        "staffId": str(user["_id"])
    }).to_list(None)
    
    assignments = []
    for cs in case_studies:
        student = await db.users.find_one({"_id": ObjectId(cs["studentId"])})
        if student:
            assignments.append({
                "studentName": student["name"],
                "regNo": student.get("regNo", "N/A"),
                "topic": cs["topic"],
                "module": cs.get("module", "N/A"),
                "isAssigned": cs.get("isAssigned", False)
            })
    
    return {
        "subjectName": subject["name"],
        "subjectId": subject["subjectId"],
        "className": subject.get("className", "N/A"),
        "semester": subject.get("semester", "N/A"),
        "totalStudents": len(assignments),
        "assignments": assignments
    }

@router.put("/update-case-study-deadline")
async def update_case_study_deadline(
    request: UpdateCaseStudyDeadlineRequest,
    user: dict = Depends(require_role(["staff"]))
):
    """Update deadline for all case studies in a subject"""
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    result = await db.case_studies.update_many(
        {"subjectId": request.subjectId, "staffId": str(user["_id"])},
        {"$set": {"deadline": request.newDeadline}}
    )
    
    return {
        "message": "Deadline updated successfully",
        "updatedCount": result.modified_count
    }

@router.post("/create-case-study-manual")
async def create_case_study_manual(request: ManualCaseStudyRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    # Verify subject exists
    subject = await db.subjects.find_one({"subjectId": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Verify student exists
    student = await db.users.find_one({"_id": ObjectId(request.studentId)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Create case study
    case_study_data = {
        "subjectId": request.subjectId,
        "staffId": str(user["_id"]),
        "studentId": request.studentId,
        "topic": request.topic,
        "deadline": datetime.utcnow(),
        "isApproved": False,
        "isAssigned": False,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.case_studies.insert_one(case_study_data)
    
    return {
        "message": "Case study created successfully",
        "caseStudyId": str(result.inserted_id),
        "studentName": student["name"],
        "topic": request.topic
    }

@router.post("/assign-case-study")
async def assign_case_study(request: AssignCaseStudyRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    # Get all case studies for this batch
    case_studies = await db.case_studies.find({
        "subjectId": request.subjectId,
        "batchName": request.batchName,
        "staffId": str(user["_id"])
    }).to_list(None)
    
    if not case_studies:
        raise HTTPException(status_code=404, detail="No case studies found for this batch")
    
    # Update all case studies with deadline and settings
    await db.case_studies.update_many(
        {
            "subjectId": request.subjectId,
            "batchName": request.batchName,
            "staffId": str(user["_id"])
        },
        {"$set": {
            "isApproved": True,
            "isAssigned": True,
            "deadline": request.deadline,
            "caseStudyType": request.caseStudyType,
            "minPages": request.minPages
        }}
    )
    
    # Send emails to all students
    for case_study in case_studies:
        student = await db.users.find_one({"_id": ObjectId(case_study["studentId"])})
        if student:
            await email_service.send_case_study_assignment(
                student["email"],
                student["name"],
                case_study["topic"],
                request.deadline.strftime("%Y-%m-%d %H:%M")
            )
    
    return {
        "message": f"Case studies in batch '{request.batchName}' assigned successfully",
        "batchName": request.batchName,
        "totalStudents": len(case_studies),
        "caseStudyType": request.caseStudyType,
        "minPages": request.minPages
    }

@router.put("/manual-mark-update")
async def manual_mark_update(request: ManualMarkUpdateRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    collection = db.quiz_submissions if request.submissionType == "quiz" else db.case_submissions
    result = await collection.update_one(
        {"_id": ObjectId(request.submissionId)},
        {"$set": {"marks": request.newMarks}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Marks updated successfully"}

@router.get("/late-requests")
async def get_late_requests(user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    requests = await db.late_requests.find({"status": "Pending"}).to_list(None)
    
    result = []
    for req in requests:
        student = await db.users.find_one({"_id": ObjectId(req["studentId"])})
        result.append({
            "id": str(req["_id"]),
            "studentName": student["name"] if student else "Unknown",
            "assignmentType": req["assignmentType"],
            "reason": req["reason"],
            "requestedAt": req["requestedAt"]
        })
    
    return {"requests": result}

@router.get("/my-subjects")
async def get_my_subjects(user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    subjects = await db.subjects.find({"staffId": str(user["_id"])}).to_list(None)
    
    result = []
    for subject in subjects:
        enrollment_link = f"http://localhost:8000/student/join/{subject.get('enrollmentToken', '')}"
        
        # Get enrolled students
        enrollments = await db.subject_enrollments.find({"subjectId": subject["subjectId"]}).to_list(None)
        students = []
        for enrollment in enrollments:
            student = await db.users.find_one({"_id": ObjectId(enrollment["studentId"])})
            if student:
                students.append({
                    "studentId": str(student["_id"]),
                    "name": student["name"],
                    "email": student["email"],
                    "regNo": student.get("regNo")
                })
        
        result.append({
            "id": str(subject["_id"]),
            "subjectId": subject["subjectId"],
            "name": subject["name"],
            "className": subject.get("className", "N/A"),
            "semester": subject.get("semester", "N/A"),
            "totalStudents": subject["totalStudents"],
            "addedStudents": subject["addedStudents"],
            "enrollmentToken": subject.get("enrollmentToken"),
            "enrollmentLink": enrollment_link,
            "createdAt": subject["createdAt"],
            "students": students
        })
    
    return {"subjects": result}

@router.get("/subject-details/{subject_id}")
async def get_subject_details(subject_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    # Get subject
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "staffId": str(user["_id"])})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get enrolled students
    enrollments = await db.subject_enrollments.find({"subjectId": subject["subjectId"]}).to_list(None)
    
    # Get all quizzes for this subject
    quizzes = await db.quizzes.find({"subjectId": subject["subjectId"]}).to_list(None)
    
    # Get all case studies for this subject
    case_studies = await db.case_studies.find({"subjectId": subject["subjectId"]}).to_list(None)
    
    students_data = []
    for enrollment in enrollments:
        student = await db.users.find_one({"_id": ObjectId(enrollment["studentId"])})
        if not student:
            continue
        
        # Get quiz submissions
        quiz_progress = []
        for quiz in quizzes:
            submission = await db.quiz_submissions.find_one({
                "quizId": str(quiz["_id"]),
                "studentId": enrollment["studentId"]
            })
            quiz_progress.append({
                "quizId": str(quiz["_id"]),
                "title": quiz["title"],
                "totalMarks": quiz["totalMarks"],
                "isAssigned": quiz.get("isAssigned", False),
                "isSubmitted": submission is not None,
                "marks": submission.get("marks") if submission else None,
                "submittedAt": submission.get("submittedAt") if submission else None,
                "isLate": submission.get("isLate", False) if submission else False,
                "submissionId": str(submission["_id"]) if submission else None
            })
        
        # Get case study submissions
        case_progress = []
        for case in case_studies:
            if case["studentId"] == enrollment["studentId"]:
                submission = await db.case_submissions.find_one({
                    "caseStudyId": str(case["_id"]),
                    "studentId": enrollment["studentId"]
                })
                case_progress.append({
                    "caseStudyId": str(case["_id"]),
                    "topic": case["topic"],
                    "isAssigned": case.get("isAssigned", False),
                    "isSubmitted": submission is not None,
                    "marks": submission.get("marks") if submission else None,
                    "submittedAt": submission.get("submittedAt") if submission else None,
                    "isLate": submission.get("isLate", False) if submission else False,
                    "submissionId": str(submission["_id"]) if submission else None
                })
        
        students_data.append({
            "studentId": str(student["_id"]),
            "name": student["name"],
            "email": student["email"],
            "regNo": student.get("regNo", "N/A"),
            "quizProgress": quiz_progress,
            "caseProgress": case_progress
        })
    
    return {
        "subject": {
            "id": str(subject["_id"]),
            "subjectId": subject["subjectId"],
            "name": subject["name"],
            "className": subject.get("className", "N/A"),
            "semester": subject.get("semester", "N/A")
        },
        "students": students_data
    }

@router.get("/students/{subject_id}")
async def get_students_in_subject(subject_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    enrollments = await db.subject_enrollments.find({"subjectId": subject_id}).to_list(None)
    
    students = []
    for enrollment in enrollments:
        student = await db.users.find_one({"_id": ObjectId(enrollment["studentId"])})
        if student:
            students.append({
                "studentId": str(student["_id"]),
                "name": student["name"],
                "email": student["email"],
                "regNo": student.get("regNo")
            })
    
    return {"students": students}

@router.delete("/delete-subject/{subject_id}")
async def delete_subject(subject_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    # Verify subject belongs to staff
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "staffId": str(user["_id"])})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Delete subject
    await db.subjects.delete_one({"_id": ObjectId(subject_id)})
    
    # Delete related enrollments
    await db.subject_enrollments.delete_many({"subjectId": subject["subjectId"]})
    
    # Delete related quizzes
    await db.quizzes.delete_many({"subjectId": subject["subjectId"]})
    
    # Delete related case studies
    await db.case_studies.delete_many({"subjectId": subject["subjectId"]})
    
    return {"message": "Subject deleted successfully"}

@router.get("/subject-quizzes/{subject_id}")
async def get_subject_quizzes(subject_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": subject_id, "staffId": str(user["_id"])})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    quizzes = await db.quizzes.find({"subjectId": subject_id}).to_list(None)
    
    result = []
    for quiz in quizzes:
        result.append({
            "id": str(quiz["_id"]),
            "title": quiz["title"],
            "totalMarks": quiz["totalMarks"],
            "isApproved": quiz.get("isApproved", False),
            "isAssigned": quiz.get("isAssigned", False),
            "deadline": quiz.get("deadline"),
            "createdAt": quiz["createdAt"]
        })
    
    return {"quizzes": result}

@router.delete("/delete-quiz/{quiz_id}")
async def delete_quiz(quiz_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id), "staffId": str(user["_id"])})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    await db.quizzes.delete_one({"_id": ObjectId(quiz_id)})
    await db.quiz_submissions.delete_many({"quizId": quiz_id})
    
    return {"message": "Quiz deleted successfully"}

@router.delete("/remove-student/{subject_id}/{student_id}")
async def remove_student_from_subject(subject_id: str, student_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    # Verify subject belongs to staff
    subject = await db.subjects.find_one({"subjectId": subject_id, "staffId": str(user["_id"])})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Remove enrollment
    result = await db.subject_enrollments.delete_one({
        "subjectId": subject_id,
        "studentId": student_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not enrolled in this subject")
    
    # Update subject count
    await db.subjects.update_one(
        {"subjectId": subject_id},
        {"$inc": {"addedStudents": -1}}
    )
    
    return {"message": "Student removed from subject successfully"}

@router.put("/update-quiz-marks")
async def update_quiz_marks(request: UpdateQuizMarksRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    quiz = await db.quizzes.find_one({"_id": ObjectId(request.quizId), "staffId": str(user["_id"])})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    await db.quizzes.update_one(
        {"_id": ObjectId(request.quizId)},
        {"$set": {"totalMarks": request.totalMarks}}
    )
    
    return {"message": "Quiz marks updated successfully"}

@router.post("/allow-retake/{submission_id}")
async def allow_retake(submission_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    submission = await db.quiz_submissions.find_one({"_id": ObjectId(submission_id)})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Delete the submission to allow retake
    await db.quiz_submissions.delete_one({"_id": ObjectId(submission_id)})
    
    # Get student and quiz info for notification
    student = await db.users.find_one({"_id": ObjectId(submission["studentId"])})
    quiz = await db.quizzes.find_one({"_id": ObjectId(submission["quizId"])})
    
    if student and quiz:
        await email_service.send_quiz_assignment(
            student["email"],
            student["name"],
            quiz["title"] + " (Retake)",
            quiz.get("deadline", datetime.utcnow()).strftime("%Y-%m-%d %H:%M")
        )
    
    return {"message": "Retake allowed successfully. Student can now retake the quiz."}

@router.put("/edit-quiz")
async def edit_quiz(request: EditQuizRequest, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    quiz = await db.quizzes.find_one({"_id": ObjectId(request.quizId), "staffId": str(user["_id"])})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if quiz.get("isAssigned"):
        raise HTTPException(status_code=400, detail="Cannot edit assigned quiz")
    
    questions = [q.dict() for q in request.questions]
    
    await db.quizzes.update_one(
        {"_id": ObjectId(request.quizId)},
        {"$set": {
            "title": request.title,
            "questions": questions,
            "totalMarks": len(questions)
        }}
    )
    
    return {"message": "Quiz updated successfully", "totalQuestions": len(questions)}

@router.get("/quiz-analytics/{quiz_id}")
async def get_quiz_analytics(quiz_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()

    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id), "staffId": str(user["_id"])})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    submissions = await db.quiz_submissions.find({"quizId": quiz_id}).to_list(None)
    if not submissions:
        return {"quizId": quiz_id, "title": quiz["title"], "totalSubmissions": 0, "questionAnalytics": [], "studentScores": []}

    total = len(submissions)
    questions = quiz["questions"]
    total_marks = quiz["totalMarks"]

    # Per-question analytics
    analytics = []
    for idx, q in enumerate(questions):
        correct_answer = q.get("correct_answer", "")
        # Count each option chosen
        option_counts = {"A": 0, "B": 0, "C": 0, "D": 0, "unanswered": 0}
        correct_count = 0
        for sub in submissions:
            chosen = str(sub["answers"].get(str(idx), "")).upper()
            if not chosen:
                option_counts["unanswered"] += 1
            elif chosen in option_counts:
                option_counts[chosen] += 1
            if chosen == correct_answer.upper():
                correct_count += 1
        wrong_count = total - correct_count
        correct_pct = round((correct_count / total) * 100, 1)
        analytics.append({
            "questionIndex": idx,
            "question": q["question"],
            "correctAnswer": correct_answer,
            "correctCount": correct_count,
            "wrongCount": wrong_count,
            "correctPercent": correct_pct,
            "wrongPercent": round((wrong_count / total) * 100, 1),
            "difficultyIndex": correct_pct,  # DI = correct% (higher = easier)
            "optionCounts": option_counts
        })

    # Per-student scores
    student_scores = []
    for sub in submissions:
        student = await db.users.find_one({"_id": ObjectId(sub["studentId"])})
        score = sub.get("marks", 0) or 0
        student_scores.append({
            "studentName": student["name"] if student else "Unknown",
            "regNo": student.get("regNo", "N/A") if student else "N/A",
            "score": score,
            "totalMarks": total_marks,
            "percent": round((score / total_marks) * 100, 1) if total_marks else 0
        })

    scores_only = [s["score"] for s in student_scores]
    avg_score = round(sum(scores_only) / total, 1) if total else 0

    return {
        "quizId": quiz_id,
        "title": quiz["title"],
        "totalSubmissions": total,
        "totalMarks": total_marks,
        "averageScore": avg_score,
        "questionAnalytics": analytics,
        "studentScores": student_scores
    }

@router.get("/quiz-details/{quiz_id}")
async def get_quiz_details(quiz_id: str, user: dict = Depends(require_role(["staff"]))):

    db = await get_database()
    
    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id), "staffId": str(user["_id"])})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return {
        "id": str(quiz["_id"]),
        "title": quiz["title"],
        "questions": quiz["questions"],
        "totalMarks": quiz["totalMarks"],
        "isApproved": quiz.get("isApproved", False),
        "isAssigned": quiz.get("isAssigned", False)
    }

@router.get("/subject-case-studies/{subject_id}")
async def get_subject_case_studies(subject_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": subject_id, "staffId": str(user["_id"])})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    case_studies = await db.case_studies.find({"subjectId": subject_id}).to_list(None)
    
    # Group by batchName
    batches = {}
    for cs in case_studies:
        batch_name = cs.get("batchName", "Unnamed Batch")
        if batch_name not in batches:
            batches[batch_name] = {
                "batchName": batch_name,
                "isAssigned": cs.get("isAssigned", False),
                "deadline": cs.get("deadline"),
                "caseStudyType": cs.get("caseStudyType"),
                "minPages": cs.get("minPages"),
                "totalStudents": 0,
                "assignments": []
            }
        
        student = await db.users.find_one({"_id": ObjectId(cs["studentId"])})
        batches[batch_name]["assignments"].append({
            "id": str(cs["_id"]),
            "topic": cs["topic"],
            "module": cs.get("module", "N/A"),
            "studentName": student["name"] if student else "Unknown",
            "studentRegNo": student.get("regNo", "N/A") if student else "N/A"
        })
        batches[batch_name]["totalStudents"] += 1
    
    return {"batches": list(batches.values())}

@router.delete("/delete-case-study/{case_study_id}")
async def delete_case_study(case_study_id: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    case_study = await db.case_studies.find_one({"_id": ObjectId(case_study_id), "staffId": str(user["_id"])})
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")
    
    await db.case_studies.delete_one({"_id": ObjectId(case_study_id)})
    await db.case_submissions.delete_many({"caseStudyId": case_study_id})
    
    return {"message": "Case study deleted successfully"}

@router.delete("/delete-case-study-batch/{subject_id}/{batch_name}")
async def delete_case_study_batch(subject_id: str, batch_name: str, user: dict = Depends(require_role(["staff"]))):
    db = await get_database()
    
    subject = await db.subjects.find_one({"subjectId": subject_id, "staffId": str(user["_id"])})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get all case studies in this batch
    case_studies = await db.case_studies.find({
        "subjectId": subject_id,
        "batchName": batch_name,
        "staffId": str(user["_id"])
    }).to_list(None)
    
    if not case_studies:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Delete all case studies in batch
    case_study_ids = [str(cs["_id"]) for cs in case_studies]
    await db.case_studies.delete_many({
        "subjectId": subject_id,
        "batchName": batch_name,
        "staffId": str(user["_id"])
    })
    
    # Delete all submissions for these case studies
    await db.case_submissions.delete_many({"caseStudyId": {"$in": case_study_ids}})
    
    return {
        "message": f"Batch '{batch_name}' deleted successfully",
        "deletedCount": len(case_studies)
    }
