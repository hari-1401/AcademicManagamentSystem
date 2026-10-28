import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_subjects():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.academic_evaluation
    
    # Delete subjects with None name
    result = await db.subjects.delete_many({"name": None})
    print(f"Deleted {result.deleted_count} subjects with None name")
    
    # Show remaining subjects
    subjects = await db.subjects.find().to_list(None)
    print(f"\nRemaining subjects: {len(subjects)}")
    for s in subjects:
        print(f"Name: {s.get('name')}, SubjectID: {s.get('subjectId')}, Class: {s.get('className')}, Semester: {s.get('semester')}")
    
    client.close()

asyncio.run(fix_subjects())
