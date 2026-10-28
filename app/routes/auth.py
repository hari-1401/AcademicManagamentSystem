from fastapi import APIRouter, HTTPException, Depends
from app.schemas import LoginRequest, TokenResponse
from app.utils.auth import verify_password, create_access_token, hash_password
from app.database import get_database
from app.services.email_service import email_service
import random, time

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP store: {email: {otp, expires}}
_otp_store: dict = {}

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    db = await get_database()
    user = await db.users.find_one({"email": request.email})
    
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    access_token = create_access_token({"sub": user["email"], "role": user["role"]})
    
    return TokenResponse(
        access_token=access_token,
        role=user["role"],
        name=user["name"]
    )

@router.post("/forgot-password")
async def forgot_password(data: dict):
    email = data.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    db = await get_database()
    user = await db.users.find_one({"email": email, "role": "student"})
    if not user:
        # Don't reveal if email exists
        return {"message": "If this email is registered, an OTP has been sent."}
    
    otp = str(random.randint(100000, 999999))
    _otp_store[email] = {"otp": otp, "expires": time.time() + 600}  # 10 min
    
    await email_service.send_otp_email(email, user["name"], otp)
    return {"message": "If this email is registered, an OTP has been sent."}

@router.post("/reset-password")
async def reset_password(data: dict):
    email = data.get("email", "").strip().lower()
    otp = data.get("otp", "").strip()
    new_password = data.get("newPassword", "")
    
    if not email or not otp or not new_password:
        raise HTTPException(status_code=400, detail="Email, OTP, and new password are required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    record = _otp_store.get(email)
    if not record or record["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if time.time() > record["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    db = await get_database()
    result = await db.users.update_one(
        {"email": email, "role": "student"},
        {"$set": {"password": hash_password(new_password), "plainPassword": new_password}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    
    _otp_store.pop(email, None)
    return {"message": "Password reset successfully"}
