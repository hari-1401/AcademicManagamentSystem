from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

class Database:
    client: AsyncIOMotorClient = None
    
db = Database()

async def get_database():
    return db.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    await create_indexes()

async def close_mongo_connection():
    db.client.close()

async def create_indexes():
    database = await get_database()
    
    # Users collection indexes
    await database.users.create_index("email", unique=True)
    await database.users.create_index("regNo", unique=True, sparse=True)
    
    # Subjects collection indexes
    await database.subjects.create_index("subjectId")
    await database.subjects.create_index("staffId")
    
    # Quizzes collection indexes
    await database.quizzes.create_index("subjectId")
    await database.quizzes.create_index("staffId")
    
    # Quiz submissions collection indexes
    await database.quiz_submissions.create_index("quizId")
    await database.quiz_submissions.create_index("studentId")
    await database.quiz_submissions.create_index([("quizId", 1), ("studentId", 1)], unique=True)
    
    # Case studies collection indexes
    await database.case_studies.create_index("subjectId")
    await database.case_studies.create_index("studentId")
    
    # Case submissions collection indexes
    await database.case_submissions.create_index("caseStudyId")
    await database.case_submissions.create_index("studentId")
    
    # Plagiarism reports collection indexes
    await database.plagiarism_reports.create_index("submissionId")
    await database.plagiarism_reports.create_index("studentId")
    
    # Late requests collection indexes
    await database.late_requests.create_index("studentId")
    await database.late_requests.create_index("assignmentId")
