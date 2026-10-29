import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_subjects():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.academic_evaluation
    
    subjects = await db.subjects.find().to_list(None)
    
    print(f"\nTotal subjects: {len(subjects)}\n")
    for s in subjects:
        print(f"ID: {s.get('_id')}")
        print(f"Name: {s.get('name')}")
        print(f"SubjectID: {s.get('subjectId')}")
        print(f"ClassName: {s.get('className')}")
        print(f"Semester: {s.get('semester')}")
        print("-" * 50)
    
    client.close()

asyncio.run(check_subjects())
