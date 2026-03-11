"""
portfolio-backend/main.py
FastAPI backend for portfolio contact form.
Security: rate limiting, input validation, CORS, no raw SQL.
Deploy to: Railway, Render, or Fly.io (all have free tiers).
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, field_validator, constr
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import smtplib
import ssl
import re
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

# ── Logging ────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Rate Limiter ───────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── App ────────────────────────────────────────────────────
app = FastAPI(
    title="Arun Portfolio Backend",
    docs_url=None,   # Disable Swagger UI in production
    redoc_url=None,  # Disable ReDoc in production
    openapi_url=None  # Disable OpenAPI schema in production
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "https://arungovindgari.github.io",
    "https://arungovindgari.com",
    "http://localhost:3000",  # Local development only
    "http://127.0.0.1:5500",  # VS Code Live Server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# ── Security headers middleware ────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Remove server info
    if "server" in response.headers:
        del response.headers["server"]
    return response

# ── Input model (validated by Pydantic) ───────────────────
class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 100:
            raise ValueError('Name must be 2-100 characters')
        if re.search(r'[<>\\/]', v):
            raise ValueError('Invalid characters in name')
        return v

    @field_validator('subject')
    @classmethod
    def validate_subject(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 200:
            raise ValueError('Subject must be 3-200 characters')
        if re.search(r'[<>]', v):
            raise ValueError('Invalid characters in subject')
        return v

    @field_validator('message')
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10 or len(v) > 2000:
            raise ValueError('Message must be 10-2000 characters')
        return v

# ── Email sender ───────────────────────────────────────────
def send_email(contact: ContactMessage) -> bool:
    """Send email via SMTP with TLS. Returns True on success."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    recipient = os.getenv("RECIPIENT_EMAIL", "arungovindgari09@gmail.com")

    if not smtp_user or not smtp_pass:
        logger.warning("SMTP credentials not configured — email not sent")
        return False

    # Build email (using plain text to avoid HTML injection)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Portfolio Contact] {contact.subject}"
    msg["From"] = smtp_user
    msg["To"] = recipient
    msg["Reply-To"] = contact.email

    body = (
        f"New message from your portfolio website:\n\n"
        f"Name:    {contact.name}\n"
        f"Email:   {contact.email}\n"
        f"Subject: {contact.subject}\n\n"
        f"Message:\n{contact.message}\n\n"
        f"---\nSent via portfolio contact form"
    )
    msg.attach(MIMEText(body, "plain", "utf-8"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [recipient], msg.as_string())
        logger.info("Contact email sent from %s", contact.email)
        return True
    except smtplib.SMTPException as e:
        logger.error("SMTP error: %s", str(e))
        return False

# ── Routes ─────────────────────────────────────────────────
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

@app.post("/contact", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")  # Max 3 submissions per IP per minute
async def contact(request: Request, msg: ContactMessage):
    """
    Receive and forward contact form submissions.
    Rate limited: 3 requests per minute per IP.
    """
    try:
        sent = send_email(msg)
        return {"success": True, "message": "Message received! I'll get back to you soon."}
    except Exception as e:
        logger.error("Contact form error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message. Please email directly."
        )

# ── Error handlers ─────────────────────────────────────────
@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Not found"})

@app.exception_handler(405)
async def method_not_allowed(request: Request, exc):
    return JSONResponse(status_code=405, content={"detail": "Method not allowed"})

# ── Run ────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENV", "production") == "development"
    )
