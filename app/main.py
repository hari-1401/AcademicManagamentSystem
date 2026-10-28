from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, admin, staff, student
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI-Based Academic Evaluation System",
    description="Production-ready backend for academic evaluation with AI integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    # Skip noisy static/sourcemap requests
    if any(path.endswith(ext) for ext in ('.js', '.map', '.css', '.ico', '.png', '.svg')):
        return await call_next(request)
    logger.info(f"Request: {request.method} {path}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code} - Time: {time.time() - start_time:.2f}s")
    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting application...")
    await connect_to_mongo()
    logger.info("Connected to MongoDB")
    logger.info("AI service (Claude) ready")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application...")
    await close_mongo_connection()
    logger.info("Closed MongoDB connection")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Academic Evaluation System"}

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(staff.router)
app.include_router(student.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
