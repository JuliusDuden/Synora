"""
User Model with Authentication and 2FA Support
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import bcrypt
import secrets


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None  # For 2FA


class User(UserBase):
    id: str
    created_at: datetime
    is_active: bool = True
    is_2fa_enabled: bool = False
    totp_secret: Optional[str] = None  # TOTP secret for 2FA
    encryption_salt: Optional[str] = None  # Salt for E2E encryption key derivation
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None


class UserInDB(User):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


class TokenData(BaseModel):
    email: Optional[str] = None


class TwoFactorSetup(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: list[str]


class TwoFactorVerify(BaseModel):
    totp_code: str


# Password hashing utilities
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def generate_backup_codes(count: int = 10) -> list[str]:
    """Generate backup codes for 2FA recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]
