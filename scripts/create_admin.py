import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.academic_evaluation
    
    # Check if admin exists
    existing = await db.users.find_one({"email": "admin@example.com"})
    if existing:
        print("Admin already exists!")
        return
    
    # Create admin with hashed password
    admin = {
        "email": "admin@example.com",
        "password": pwd_context.hash("admin123"),
        "role": "admin",
        "name": "System Admin",
        "createdAt": datetime.utcnow(),
        "isActive": True
    }
    
    await db.users.insert_one(admin)
    print("Admin created successfully!")
    print("Email: admin@example.com")
    print("Password: admin123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
