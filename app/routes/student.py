from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from app.schemas import SubmitQuizRequest, RequestLateApprovalRequest, JoinSubjectRequest
from app.utils.auth import require_role
from app.utils.file_handler import extract_text_from_docx
from app.database import get_database
from app.services.ocr_service import ocr_service
from app.services.email_service import email_service
from datetime import datetime
from bson import ObjectId
import os
import uuid

router = APIRouter(prefix="/student", tags=["Student"])

@router.get("/my-subjects")
async def get_my_subjects(user: dict = Depends(require_role(["student"]))):
    db = await get_database()

    enrollments = await db.subject_enrollments.find({"studentId": str(user["_id"])}).to_list(None)
    if not enrollments:
        return {"subjects": []}

    subject_ids = [e["subjectId"] for e in enrollments]
    enrollment_map = {e["subjectId"]: e for e in enrollments}

    # Single query for all subjects
    subjects_list = await db.subjects.find({"subjectId": {"$in": subject_ids}}).to_list(None)

    staff_ids = list({s["staffId"] for s in subjects_list})
    # Single query for all staff
    staff_list = await db.users.find({"_id": {"$in": [ObjectId(sid) for sid in staff_ids]}}).to_list(None)
    staff_map = {str(s["_id"]): s for s in staff_list}

    subjects = []
    for subject in subjects_list:
        staff = staff_map.get(subject["staffId"])
        enrollment = enrollment_map.get(subject["subjectId"])
        subjects.append({
            "id": str(subject["_id"]),
            "subjectId": subject["subjectId"],
            "name": subject["name"],
            "className": subject.get("className", "N/A"),
            "semester": subject.get("semester", "N/A"),
            "staffName": staff["name"] if staff else "Unknown",
            "enrolledAt": enrollment["enrolledAt"] if enrollment else None,
            "syllabusText": subject.get("syllabusText", ""),
            "hasSyllabus": bool(subject.get("syllabusPath"))
        })

    return {"subjects": subjects}

@router.get("/syllabus/{subject_id}")
async def get_syllabus_pdf(subject_id: str, user: dict = Depends(require_role(["student"]))):
    db = await get_database()

    # Verify student is enrolled
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id)})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    enrollment = await db.subject_enrollments.find_one({
        "subjectId": subject["subjectId"],
        "studentId": str(user["_id"])
    })
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this subject")

    syllabus_path = subject.get("syllabusPath")
    if not syllabus_path or not os.path.exists(syllabus_path):
        raise HTTPException(status_code=404, detail="Syllabus PDF not found")

    return FileResponse(syllabus_path, media_type="application/pdf", filename=f"{subject['name']}_syllabus.pdf")

@router.post("/join/{enrollment_token}")
async def join_subject_via_link(enrollment_token: str, request: JoinSubjectRequest):
    db = await get_database()
    
    # Verify enrollment token
    if request.enrollmentToken != enrollment_token:
        raise HTTPException(status_code=400, detail="Invalid enrollment token")
    
    # Find subject by token
    subject = await db.subjects.find_one({"enrollmentToken": enrollment_token})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or link expired")
    
    # Check if subject is full
    if subject["addedStudents"] >= subject["totalStudents"]:
        raise HTTPException(status_code=400, detail="Subject is full")
    
    # Check if student exists
    student = await db.users.find_one({"email": request.email, "role": "student"})
    if not student:
        # Create new student
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
    else:
        student_id = str(student["_id"])
    
    # Check if already enrolled
    existing = await db.subject_enrollments.find_one({
        "subjectId": subject["subjectId"],
        "studentId": student_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this subject")
    
    # Enroll student
    await db.subject_enrollments.insert_one({
        "subjectId": subject["subjectId"],
        "studentId": student_id,
        "enrolledAt": datetime.utcnow()
    })
    
    # Update subject count
    await db.subjects.update_one(
        {"subjectId": subject["subjectId"]},
        {"$inc": {"addedStudents": 1}}
    )
    
    return {
        "message": "Successfully enrolled in subject",
        "subjectName": subject["name"],
        "email": request.email,
        "defaultPassword": "default123"
    }

@router.get("/quizzes")
async def get_assigned_quizzes(user: dict = Depends(require_role(["student"]))):
    db = await get_database()

    # Get enrolled subject IDs for this student
    enrollments = await db.subject_enrollments.find({"studentId": str(user["_id"])}).to_list(None)
    enrolled_subject_ids = [e["subjectId"] for e in enrollments]

    quizzes = await db.quizzes.find({"isAssigned": True, "subjectId": {"$in": enrolled_subject_ids}}).to_list(None)
    if not quizzes:
        return {"quizzes": []}

    quiz_ids = [str(q["_id"]) for q in quizzes]
    # Single query for all submissions instead of N queries
    submissions = await db.quiz_submissions.find({
        "quizId": {"$in": quiz_ids},
        "studentId": str(user["_id"])
    }).to_list(None)
    submission_map = {s["quizId"]: s for s in submissions}

    now = datetime.utcnow()
    result = []
    for quiz in quizzes:
        submission = submission_map.get(str(quiz["_id"]))
        deadline_passed = quiz.get("deadline") and now > quiz["deadline"]
        result.append({
            "id": str(quiz["_id"]),
            "title": quiz["title"],
            "totalMarks": quiz["totalMarks"],
            "deadline": quiz.get("deadline"),
            "isSubmitted": submission is not None,
            "marks": submission.get("marks") if submission else None,
            "deadlinePassed": deadline_passed,
            "canSubmit": not deadline_passed and not submission
        })

    return {"quizzes": result}

@router.get("/quiz/{quiz_id}")
async def get_quiz_details(quiz_id: str, user: dict = Depends(require_role(["student"]))):
    db = await get_database()
    
    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Check if already submitted
    submission = await db.quiz_submissions.find_one({
        "quizId": quiz_id,
        "studentId": str(user["_id"])
    })
    
    if submission:
        raise HTTPException(status_code=400, detail="Quiz already submitted")
    
    # Check deadline
    if quiz.get("deadline") and datetime.utcnow() > quiz["deadline"]:
        raise HTTPException(status_code=400, detail="Deadline has passed")
    
    # Return questions without correct answers
    questions = []
    for i, q in enumerate(quiz["questions"]):
        questions.append({
            "id": i,
            "question": q["question"],
            "options": q["options"]
        })
    
    return {
        "id": str(quiz["_id"]),
        "title": quiz["title"],
        "totalMarks": quiz["totalMarks"],
        "deadline": quiz.get("deadline"),
        "timeLimit": quiz.get("timeLimit"),  # Time limit in minutes
        "questions": questions
    }

@router.post("/submit-quiz")
async def submit_quiz(request: SubmitQuizRequest, user: dict = Depends(require_role(["student"]))):
    db = await get_database()
    
    # Get quiz
    quiz = await db.quizzes.find_one({"_id": ObjectId(request.quizId)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Check if already submitted
    existing = await db.quiz_submissions.find_one({
        "quizId": request.quizId,
        "studentId": str(user["_id"])
    })
    if existing:
        raise HTTPException(status_code=400, detail="Quiz already submitted")
    
    # Check deadline and late approval
    is_late = False
    penalty = 0
    
    if quiz.get("deadline") and datetime.utcnow() > quiz["deadline"]:
        # Check for approved late request
        late_request = await db.late_requests.find_one({
            "studentId": str(user["_id"]),
            "assignmentId": request.quizId,
            "assignmentType": "quiz",
            "status": "Approved"
        })
        
        if not late_request:
            raise HTTPException(status_code=400, detail="Deadline has passed. Request late approval first.")
        
        is_late = True
        penalty = late_request.get("penaltyPercent", 0)
    
    # Auto-evaluate
    correct_count = 0
    total_questions = len(quiz["questions"])
    for i, question in enumerate(quiz["questions"]):
        student_answer = request.answers.get(str(i))
        if student_answer == question["correct_answer"]:
            correct_count += 1
    
    # Calculate marks proportionally: (correct/total) * totalMarks
    marks = (correct_count / total_questions) * quiz["totalMarks"] if total_questions > 0 else 0
    
    # Apply tab switch penalty (2 marks per switch)
    tab_penalty = 0
    if request.tabSwitchCount > 0:
        tab_penalty = min(request.tabSwitchCount * 2, marks * 0.2)  # Max 20% penalty
        marks = max(0, marks - tab_penalty)
    
    # Apply late penalty if late
    if is_late and penalty > 0:
        marks = marks * (1 - penalty / 100)
    
    # Save submission
    submission_data = {
        "quizId": request.quizId,
        "studentId": str(user["_id"]),
        "answers": request.answers,
        "marks": marks,
        "submittedAt": datetime.utcnow(),
        "isLate": is_late,
        "penaltyApplied": penalty,
        "tabSwitchCount": request.tabSwitchCount,
        "autoSubmitted": request.autoSubmitted,
        "tabSwitchPenalty": tab_penalty
    }
    
    await db.quiz_submissions.insert_one(submission_data)
    
    # Send email notification
    await email_service.send_marks_notification(
        user["email"],
        user["name"],
        quiz["title"],
        marks
    )
    
    return {
        "message": "Quiz submitted successfully" if not request.autoSubmitted else "Quiz auto-submitted due to tab switches",
        "marks": marks,
        "totalMarks": quiz["totalMarks"],
        "correctAnswers": correct_count,
        "tabSwitchPenalty": tab_penalty
    }

@router.post("/request-late")
async def request_late_approval(request: RequestLateApprovalRequest, user: dict = Depends(require_role(["student"]))):
    db = await get_database()
    
    # Check if already requested
    existing = await db.late_requests.find_one({
        "studentId": str(user["_id"]),
        "assignmentId": request.assignmentId,
        "assignmentType": request.assignmentType
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Late request already submitted")
    
    # Create request
    request_data = {
        "studentId": str(user["_id"]),
        "assignmentId": request.assignmentId,
        "assignmentType": request.assignmentType,
        "reason": request.reason,
        "status": "Pending",
        "requestedAt": datetime.utcnow()
    }
    
    await db.late_requests.insert_one(request_data)
    
    return {"message": "Late approval request submitted"}

@router.get("/case-studies")
async def get_assigned_case_studies(user: dict = Depends(require_role(["student"]))):
    db = await get_database()

    case_studies = await db.case_studies.find({
        "studentId": str(user["_id"]),
        "isAssigned": True
    }).to_list(None)
    if not case_studies:
        return {"caseStudies": []}

    cs_ids = [str(cs["_id"]) for cs in case_studies]
    # Single query for all submissions instead of N queries
    submissions = await db.case_submissions.find({
        "caseStudyId": {"$in": cs_ids},
        "studentId": str(user["_id"])
    }).to_list(None)
    submission_map = {s["caseStudyId"]: s for s in submissions}

    now = datetime.utcnow()
    result = []
    for cs in case_studies:
        submission = submission_map.get(str(cs["_id"]))
        deadline_passed = cs.get("deadline") and now > cs["deadline"]
        result.append({
            "id": str(cs["_id"]),
            "topic": cs["topic"],
            "deadline": cs.get("deadline"),
            "isSubmitted": submission is not None,
            "marks": submission.get("marks") if submission else None,
            "deadlinePassed": deadline_passed,
            "canSubmit": not deadline_passed or submission is None
        })

    return {"caseStudies": result}

@router.post("/upload-case-study/{case_study_id}")
async def upload_case_study(
    case_study_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_role(["student"]))
):
    db = await get_database()
    
    # Get case study
    case_study = await db.case_studies.find_one({"_id": ObjectId(case_study_id)})
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")
    
    if case_study["studentId"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already submitted
    existing = await db.case_submissions.find_one({
        "caseStudyId": case_study_id,
        "studentId": str(user["_id"])
    })
    if existing:
        raise HTTPException(status_code=400, detail="Case study already submitted")
    
    # Validate file type based on case study type
    case_study_type = case_study.get("caseStudyType", "typed")
    
    if case_study_type == "typed":
        # Only Word documents allowed for typed case studies
        if not (file.filename.lower().endswith('.docx') or file.filename.lower().endswith('.doc')):
            raise HTTPException(status_code=400, detail="Only Word documents (.docx, .doc) are allowed for typed case studies")
    elif case_study_type == "written":
        # PDF allowed for written (scanned) case studies
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed for written case studies")
    
    # Validate file size
    from app.config import settings
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB")
    await file.seek(0)
    
    # Save file
    os.makedirs("uploads/case_studies", exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    doc_path = os.path.join("uploads/case_studies", filename)
    with open(doc_path, "wb") as f:
        f.write(content)
    
    # Extract text based on file type
    if file.filename.lower().endswith('.docx') or file.filename.lower().endswith('.doc'):
        extracted_text = extract_text_from_docx(doc_path)
    else:
        extracted_text = await ocr_service.extract_text_from_pdf(doc_path)
    
    # Check minimum pages for typed case studies
    if case_study_type == "typed":
        min_pages = case_study.get("minPages", 0)
        if min_pages > 0:
            # Estimate pages (roughly 500 words per page)
            word_count = len(extracted_text.split())
            estimated_pages = word_count / 500
            if estimated_pages < min_pages:
                os.remove(doc_path)  # Delete uploaded file
                raise HTTPException(
                    status_code=400,
                    detail=f"Document must be at least {min_pages} pages. Your document has approximately {estimated_pages:.1f} pages."
                )
    
    # Check deadline and late approval
    is_late = False
    penalty = 0
    
    if case_study.get("deadline") and datetime.utcnow() > case_study["deadline"]:
        late_request = await db.late_requests.find_one({
            "studentId": str(user["_id"]),
            "assignmentId": case_study_id,
            "assignmentType": "case_study",
            "status": "Approved"
        })
        
        if not late_request:
            os.remove(doc_path)  # Delete uploaded file
            raise HTTPException(status_code=400, detail="Deadline has passed. Request late approval first.")
        
        is_late = True
        penalty = late_request.get("penaltyPercent", 0)
    
    # Save submission — no AI or plagiarism processing at upload time
    submission_data = {
        "caseStudyId": case_study_id,
        "studentId": str(user["_id"]),
        "documentPath": doc_path,
        "extractedText": extracted_text,
        "evaluation": None,
        "marks": None,
        "plagiarismScore": None,
        "submittedAt": datetime.utcnow(),
        "isLate": is_late,
        "penaltyApplied": penalty
    }
    
    await db.case_submissions.insert_one(submission_data)
    
    return {"message": "Case study submitted successfully. Staff will run AI correction and plagiarism check."}
