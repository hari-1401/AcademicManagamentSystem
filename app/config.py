from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str
    DATABASE_NAME: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # OpenRouter
    OPENROUTER_API_KEY: str
    
    # Google Cloud Vision
    GOOGLE_APPLICATION_CREDENTIALS: str
    
    # SMTP
    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str
    SMTP_FROM_NAME: str
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 10
    
    # Plagiarism
    PLAGIARISM_THRESHOLD: int = 30
    PLAGIARISM_PENALTY_PERCENT: int = 20
    
    class Config:
        env_file = ".env"

settings = Settings()
