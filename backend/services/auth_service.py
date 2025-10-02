"""
Authentication Service
Handles JWT tokens, 2FA, and user authentication
"""
from datetime import datetime, timedelta
from typing import Optional
import jwt
import pyotp
import qrcode
import io
import base64
from fastapi import HTTPException, status

# Configuration
SECRET_KEY = "your-super-secret-key-change-in-production-min-32-chars!"  # TODO: Move to environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


def generate_totp_secret() -> str:
    """Generate a new TOTP secret for 2FA"""
    return pyotp.random_base32()


def generate_totp_qr_code(email: str, secret: str, issuer: str = "Synora") -> str:
    """Generate QR code for TOTP setup"""
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name=issuer
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    # Convert to base64 image
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"


def verify_totp_code(secret: str, code: str) -> bool:
    """Verify a TOTP code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)  # Allow 1 time step tolerance


def is_account_locked(failed_attempts: int, locked_until: Optional[datetime]) -> bool:
    """Check if account is locked due to failed login attempts"""
    if locked_until and datetime.utcnow() < locked_until:
        return True
    
    # Lock account after 5 failed attempts
    return failed_attempts >= 5


def calculate_lockout_time(failed_attempts: int) -> Optional[datetime]:
    """Calculate lockout time based on failed attempts"""
    if failed_attempts >= 5:
        # Progressive lockout: 5 min, 15 min, 30 min, 1 hour, etc.
        minutes = min(5 * (2 ** (failed_attempts - 5)), 60)
        return datetime.utcnow() + timedelta(minutes=minutes)
    return None
