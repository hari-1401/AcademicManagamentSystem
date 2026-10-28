"""
Database seeding script
Run this to create initial admin user and test data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "academic_evaluation"

async def seed_database():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    print("Seeding database...")
    
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@example.com"})
    if not admin_exists:
        admin_data = {
            "email": "admin@example.com",
            "password": pwd_context.hash("admin123"),
            "role": "admin",
            "name": "System Administrator",
            "createdAt": datetime.utcnow(),
            "isActive": True
        }
        await db.users.insert_one(admin_data)
        print("✓ Admin user created (email: admin@example.com, password: admin123)")
    else:
        print("✓ Admin user already exists")
    
    # Create sample staff
    staff_exists = await db.users.find_one({"email": "staff@example.com"})
    if not staff_exists:
        staff_data = {
            "email": "staff@example.com",
            "password": pwd_context.hash("staff123"),
            "role": "staff",
            "name": "Dr. Jane Smith",
            "createdAt": datetime.utcnow(),
            "isActive": True
        }
        await db.users.insert_one(staff_data)
        print("✓ Staff user created (email: staff@example.com, password: staff123)")
    else:
        print("✓ Staff user already exists")
    
    # Create sample student
    student_exists = await db.users.find_one({"email": "student@example.com"})
    if not student_exists:
        student_data = {
            "email": "student@example.com",
            "password": pwd_context.hash("student123"),
            "role": "student",
            "name": "John Doe",
            "regNo": "REG001",
            "createdAt": datetime.utcnow(),
            "isActive": True
        }
        await db.users.insert_one(student_data)
        print("✓ Student user created (email: student@example.com, password: student123)")
    else:
        print("✓ Student user already exists")
    
    print("\nDatabase seeding completed!")
    print("\nDefault credentials:")
    print("Admin: admin@example.com / admin123")
    print("Staff: staff@example.com / staff123")
    print("Student: student@example.com / student123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
