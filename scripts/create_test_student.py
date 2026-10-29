import asyncio
from app.database import get_database
from app.utils.auth import hash_password
from datetime import datetime

async def create_test_student():
    db = await get_database()
    
    # Replace with your actual email
    test_email = input("Enter your email to receive test notification: ")
    
    await db.users.insert_one({
        "email": test_email,
        "password": hash_password("student123"),
        "role": "student",
        "name": "Test Student",
        "regNo": "TEST001",
        "createdAt": datetime.utcnow(),
        "isActive": True
    })
    print(f"✅ Test student created with email: {test_email}")

asyncio.run(create_test_student())
