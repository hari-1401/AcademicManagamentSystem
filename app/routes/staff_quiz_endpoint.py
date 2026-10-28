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
