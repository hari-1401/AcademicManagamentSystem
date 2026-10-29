import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_students():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.academic_evaluation
    
    students = await db.users.find({"role": "student"}).to_list(None)
    
    if not students:
        print("No students found in database!")
    else:
        print(f"\n=== Found {len(students)} Students ===\n")
        for student in students:
            print(f"Email: {student['email']}")
            print(f"Name: {student['name']}")
            print(f"Reg No: {student.get('regNo', 'N/A')}")
            print("-" * 40)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_students())
