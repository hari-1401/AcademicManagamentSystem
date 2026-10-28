from fastapi import APIRouter, Depends, HTTPException
from app.schemas import AddStaffRequest, AddStudentRequest, ChangeDeadlineRequest, CreateClassRequest, AddStudentsToClassRequest, CreateDepartmentRequest
from app.utils.auth import require_role, hash_password
from app.database import get_database
from datetime import datetime
from bson import ObjectId

# import ai_service for the debug endpoint
from app.services.ai_service import ai_service

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/create-department")
async def create_department(request: CreateDepartmentRequest, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    # Check if department already exists
    existing = await db.departments.find_one({"departmentCode": request.departmentCode})
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists")
    
    department_data = {
        "departmentName": request.departmentName,
        "departmentCode": request.departmentCode,
        "description": request.description,
        "createdAt": datetime.utcnow(),
        "createdBy": user["email"]
    }
    
    result = await db.departments.insert_one(department_data)
    return {"message": "Department created successfully", "id": str(result.inserted_id)}

@router.get("/departments")
async def get_all_departments(user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    departments = await db.departments.find().to_list(None)
    
    for dept in departments:
        dept["id"] = str(dept["_id"])
        del dept["_id"]
        # Count staff in this department
        staff_count = await db.users.count_documents({"role": "staff", "department": dept["departmentCode"]})
        dept["staffCount"] = staff_count
    
    return {"departments": departments}

@router.delete("/delete-department/{department_code}")
async def delete_department(department_code: str, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    # Check if any staff belongs to this department
    staff_count = await db.users.count_documents({"role": "staff", "department": department_code})
    if staff_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete department. {staff_count} staff members are assigned to it.")
    
    result = await db.departments.delete_one({"departmentCode": department_code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return {"message": f"Department {department_code} deleted successfully"}

@router.put("/reset-staff-password")
async def reset_staff_password(data: dict, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    staff_id = data.get("staffId")
    new_password = data.get("newPassword")
    if not staff_id or not new_password:
        raise HTTPException(status_code=400, detail="staffId and newPassword required")
    result = await db.users.update_one(
        {"_id": ObjectId(staff_id), "role": "staff"},
        {"$set": {"password": hash_password(new_password)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Password reset successfully"}

@router.get("/students")
async def get_all_students(user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    students = await db.users.find({"role": "student"}).to_list(None)
    result = []
    for s in students:
        result.append({
            "id": str(s["_id"]),
            "name": s["name"],
            "email": s["email"],
            "regNo": s.get("regNo", "N/A"),
            "className": s.get("className", "N/A"),
            "password": s.get("plainPassword", "(reset to view)"),
            "createdAt": s.get("createdAt")
        })
    return {"students": result}

@router.get("/staff")
async def get_all_staff(user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    staff_list = await db.users.find({"role": "staff"}).to_list(None)
    result = []
    for s in staff_list:
        result.append({
            "id": str(s["_id"]),
            "name": s["name"],
            "email": s["email"],
            "department": s.get("department", "N/A"),
            "createdAt": s.get("createdAt")
        })
    return {"staff": result}

@router.post("/add-staff")
async def add_staff(request: AddStaffRequest, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    staff_data = {
        "email": request.email,
        "name": request.name,
        "password": hash_password(request.password),
        "role": "staff",
        "department": request.department,
        "createdAt": datetime.utcnow(),
        "isActive": True
    }
    
    result = await db.users.insert_one(staff_data)
    return {"message": "Staff added successfully", "id": str(result.inserted_id)}

@router.post("/create-class")
async def create_class(request: CreateClassRequest, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    # Check if class already exists
    existing = await db.classes.find_one({"className": request.className})
    if existing:
        raise HTTPException(status_code=400, detail="Class already exists")
    
    class_data = {
        "className": request.className,
        "semester": request.semester,
        "department": request.department,
        "students": [],
        "createdAt": datetime.utcnow(),
        "createdBy": user["email"]
    }
    
    result = await db.classes.insert_one(class_data)
    return {"message": "Class created successfully", "id": str(result.inserted_id)}

@router.get("/classes")
async def get_all_classes(user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    classes = await db.classes.find().to_list(None)
    
    for cls in classes:
        cls["id"] = str(cls["_id"])
        del cls["_id"]
        cls["totalStudents"] = len(cls.get("students", []))
    
    return {"classes": classes}

@router.post("/add-students-to-class")
async def add_students_to_class(request: AddStudentsToClassRequest, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    # Check if class exists
    class_doc = await db.classes.find_one({"className": request.className})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    added_students = []
    errors = []
    
    for student_data in request.students:
        try:
            # Check if student already exists
            existing = await db.users.find_one({
                "$or": [
                    {"email": student_data["email"]},
                    {"regNo": student_data["regNo"]}
                ]
            })
            
            if existing:
                errors.append(f"{student_data['email']} - Already exists")
                continue
            
            # Create student account
            student_doc = {
                "email": student_data["email"],
                "name": student_data["name"],
                "regNo": student_data["regNo"],
                "password": hash_password(student_data["password"]),
                "plainPassword": student_data["password"],
                "role": "student",
                "className": request.className,
                "createdAt": datetime.utcnow(),
                "isActive": True
            }
            
            result = await db.users.insert_one(student_doc)
            student_id = str(result.inserted_id)
            
            # Add student to class
            await db.classes.update_one(
                {"className": request.className},
                {"$push": {"students": {
                    "studentId": student_id,
                    "email": student_data["email"],
                    "name": student_data["name"],
                    "regNo": student_data["regNo"]
                }}}
            )
            
            added_students.append(student_data["name"])
            
        except Exception as e:
            errors.append(f"{student_data.get('email', 'Unknown')} - {str(e)}")
    
    return {
        "message": f"Added {len(added_students)} students to {request.className}",
        "addedStudents": added_students,
        "errors": errors
    }

@router.delete("/delete-class/{class_name}")
async def delete_class(class_name: str, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    # Get class to find students
    class_doc = await db.classes.find_one({"className": class_name})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Delete class
    await db.classes.delete_one({"className": class_name})
    
    return {"message": f"Class {class_name} deleted successfully"}

@router.post("/add-student")
async def add_student(request: AddStudentRequest, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    existing = await db.users.find_one({"$or": [{"email": request.email}, {"regNo": request.regNo}]})
    if existing:
        raise HTTPException(status_code=400, detail="Email or Registration Number already exists")
    
    student_data = {
        "email": request.email,
        "name": request.name,
        "regNo": request.regNo,
        "password": hash_password(request.password),
        "plainPassword": request.password,
        "role": "student",
        "className": request.className,
        "createdAt": datetime.utcnow(),
        "isActive": True
    }
    
    result = await db.users.insert_one(student_data)
    student_id = str(result.inserted_id)
    
    # If className provided, add to class
    if request.className:
        await db.classes.update_one(
            {"className": request.className},
            {"$push": {"students": {
                "studentId": student_id,
                "email": request.email,
                "name": request.name,
                "regNo": request.regNo
            }}}
        )
    
    return {"message": "Student added successfully", "id": student_id}

@router.delete("/remove-staff/{staff_id}")
async def remove_staff(staff_id: str, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    result = await db.users.update_one(
        {"_id": staff_id, "role": "staff"},
        {"$set": {"isActive": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    return {"message": "Staff removed successfully"}

@router.delete("/remove-student/{student_id}")
async def remove_student(student_id: str, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    result = await db.users.update_one(
        {"_id": student_id, "role": "student"},
        {"$set": {"isActive": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {"message": "Student removed successfully"}

@router.put("/change-password")
async def change_password(email: str, new_password: str, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password": hash_password(new_password)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Password changed successfully"}

@router.put("/change-deadline")
async def change_deadline(request: ChangeDeadlineRequest, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    collection = db.quizzes if request.assignmentType == "quiz" else db.case_studies
    result = await collection.update_one(
        {"_id": request.assignmentId},
        {"$set": {"deadline": request.newDeadline}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {"message": "Deadline updated successfully"}

@router.put("/override-marks")
async def override_marks(submission_id: str, submission_type: str, new_marks: float, user: dict = Depends(require_role(["admin"]))):
    db = await get_database()
    
    collection = db.quiz_submissions if submission_type == "quiz" else db.case_submissions
    result = await collection.update_one(
        {"_id": submission_id},
        {"$set": {"marks": new_marks}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Marks overridden successfully"}


@router.get("/gemini-models")
async def gemini_models(user: dict = Depends(require_role(["admin"]))):
    """Return the Gemini ListModels output for debugging.

    Only accessible to admins.  Use this to inspect which models the current
    API key can call and ensure GEMINI_MODEL is set correctly.
    """

    return await ai_service.list_models()
