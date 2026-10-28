import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def fix_quiz_marks():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.academic_evaluation
    
    # Get all quiz submissions
    submissions = await db.quiz_submissions.find({}).to_list(None)
    
    print(f"Found {len(submissions)} quiz submissions to fix...")
    
    fixed_count = 0
    for submission in submissions:
        # Get the quiz
        quiz = await db.quizzes.find_one({"_id": ObjectId(submission["quizId"])})
        if not quiz:
            print(f"Quiz not found for submission {submission['_id']}")
            continue
        
        # Recalculate marks
        correct_count = 0
        total_questions = len(quiz["questions"])
        
        for i, question in enumerate(quiz["questions"]):
            student_answer = submission["answers"].get(str(i))
            if student_answer == question["correct_answer"]:
                correct_count += 1
        
        # Calculate proportional marks
        new_marks = (correct_count / total_questions) * quiz["totalMarks"] if total_questions > 0 else 0
        
        # Apply penalty if late
        if submission.get("isLate") and submission.get("penaltyApplied", 0) > 0:
            penalty = submission["penaltyApplied"]
            new_marks = new_marks * (1 - penalty / 100)
        
        # Update submission
        await db.quiz_submissions.update_one(
            {"_id": submission["_id"]},
            {"$set": {"marks": new_marks}}
        )
        
        print(f"Fixed submission {submission['_id']}: {submission.get('marks', 0)} -> {new_marks}")
        fixed_count += 1
    
    print(f"\n✅ Fixed {fixed_count} quiz submissions!")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_quiz_marks())
