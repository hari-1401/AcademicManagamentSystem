import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

class EmailService:
    async def send_email(self, to_email: str, subject: str, body: str):
        message = MIMEMultipart()
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["To"] = to_email
        message["Subject"] = subject
        
        message.attach(MIMEText(body, "html"))
        
        try:
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USERNAME,
                password=settings.SMTP_PASSWORD,
                start_tls=True
            )
        except Exception as e:
            print(f"Email send failed: {e}")
    
    async def send_otp_email(self, to_email: str, name: str, otp: str):
        subject = "Password Reset OTP"
        body = f"""
        <html>
        <body style="font-family:'Segoe UI',sans-serif;background:#f0f2ff;padding:30px">
            <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 20px rgba(102,126,234,0.15)">
                <h2 style="color:#667eea;margin-top:0">🔐 Password Reset</h2>
                <p>Dear <strong>{name}</strong>,</p>
                <p>Your OTP for password reset is:</p>
                <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#667eea;text-align:center;padding:20px;background:#f0f2ff;border-radius:8px;margin:20px 0">{otp}</div>
                <p style="color:#888;font-size:13px">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
                <p>If you did not request this, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Academic Evaluation System</p>
            </div>
        </body>
        </html>
        """
        await self.send_email(to_email, subject, body)

    async def send_quiz_assignment(self, to_email: str, student_name: str, quiz_title: str, deadline: str):
        subject = f"New Quiz Assigned: {quiz_title}"
        body = f"""
        <html>
        <body>
            <h2>Quiz Assignment Notification</h2>
            <p>Dear {student_name},</p>
            <p>A new quiz has been assigned to you:</p>
            <p><strong>Quiz:</strong> {quiz_title}</p>
            <p><strong>Deadline:</strong> {deadline}</p>
            <p>Please log in to the system to attempt the quiz.</p>
            <br>
            <p>Best regards,<br>Academic Evaluation System</p>
        </body>
        </html>
        """
        await self.send_email(to_email, subject, body)
    
    async def send_case_study_assignment(self, to_email: str, student_name: str, topic: str, deadline: str):
        subject = f"Case Study Assigned: {topic}"
        body = f"""
        <html>
        <body>
            <h2>Case Study Assignment Notification</h2>
            <p>Dear {student_name},</p>
            <p>A case study has been assigned to you:</p>
            <p><strong>Topic:</strong> {topic}</p>
            <p><strong>Deadline:</strong> {deadline}</p>
            <p>Please submit your case study before the deadline.</p>
            <br>
            <p>Best regards,<br>Academic Evaluation System</p>
        </body>
        </html>
        """
        await self.send_email(to_email, subject, body)
    
    async def send_late_request_response(self, to_email: str, student_name: str, status: str, penalty: float = 0):
        subject = f"Late Submission Request {status}"
        status_text = "approved" if status == "Approved" else "rejected"
        penalty_text = f"<p><strong>Penalty:</strong> {penalty}% marks deduction</p>" if penalty > 0 else ""
        
        body = f"""
        <html>
        <body>
            <h2>Late Submission Request Update</h2>
            <p>Dear {student_name},</p>
            <p>Your late submission request has been <strong>{status_text}</strong>.</p>
            {penalty_text}
            <br>
            <p>Best regards,<br>Academic Evaluation System</p>
        </body>
        </html>
        """
        await self.send_email(to_email, subject, body)
    
    async def send_marks_notification(self, to_email: str, student_name: str, assignment_name: str, marks: float):
        subject = f"Marks Published: {assignment_name}"
        body = f"""
        <html>
        <body>
            <h2>Marks Notification</h2>
            <p>Dear {student_name},</p>
            <p>Your marks for <strong>{assignment_name}</strong> have been published.</p>
            <p><strong>Marks Obtained:</strong> {marks}</p>
            <p>Please log in to view detailed feedback.</p>
            <br>
            <p>Best regards,<br>Academic Evaluation System</p>
        </body>
        </html>
        """
        await self.send_email(to_email, subject, body)
    
    async def send_subject_creation(self, to_email: str, student_name: str, subject_name: str, staff_name: str):
        subject = f"New Subject Added: {subject_name}"
        body = f"""
        <html>
        <body>
            <h2>New Subject Notification</h2>
            <p>Dear {student_name},</p>
            <p>A new subject has been added to your curriculum:</p>
            <p><strong>Subject:</strong> {subject_name}</p>
            <p><strong>Instructor:</strong> {staff_name}</p>
            <p>Please log in to the system for more details.</p>
            <br>
            <p>Best regards,<br>Academic Evaluation System</p>
        </body>
        </html>
        """
        await self.send_email(to_email, subject, body)

email_service = EmailService()
