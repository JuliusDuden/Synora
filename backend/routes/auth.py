"""
Authentication Routes
Handles user registration, login, and 2FA
"""
from fastapi import APIRouter, HTTPException, Depends, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import sqlite3
from datetime import datetime
import uuid

from models.user import (
    UserCreate, UserLogin, User, UserInDB, Token, 
    TwoFactorSetup, TwoFactorVerify,
    hash_password, verify_password, generate_backup_codes
)
from services.auth_service import (
    create_access_token, verify_token,
    generate_totp_secret, generate_totp_qr_code, verify_totp_code,
    is_account_locked, calculate_lockout_time
)
from services.encryption_service import EncryptionService
import os

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.db")


def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db():
    """Initialize authentication tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            hashed_password TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            is_2fa_enabled INTEGER DEFAULT 0,
            totp_secret TEXT,
            encryption_salt TEXT,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TEXT,
            created_at TEXT NOT NULL
        )
    """)
    
    # Backup codes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS backup_codes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            code TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Sessions table (optional, for session management)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    conn.commit()
    conn.close()


# Initialize DB on import
init_auth_db()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    email = payload.get("sub")
    
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return User(
        id=row["id"],
        email=row["email"],
        username=row["username"],
        created_at=datetime.fromisoformat(row["created_at"]),
        is_active=bool(row["is_active"]),
        is_2fa_enabled=bool(row["is_2fa_enabled"]),
        encryption_salt=row["encryption_salt"] if "encryption_salt" in row.keys() else None,
        failed_login_attempts=row["failed_login_attempts"]
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    if len(user_data.password) < 8:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user_data.password)
    encryption_salt = EncryptionService.generate_salt()
    created_at = datetime.utcnow().isoformat()
    
    cursor.execute("""
        INSERT INTO users (id, email, username, hashed_password, encryption_salt, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, user_data.email, user_data.username, hashed_pw, encryption_salt, created_at))
    
    conn.commit()
    conn.close()
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data.email})
    
    user = User(
        id=user_id,
        email=user_data.email,
        username=user_data.username,
        created_at=datetime.fromisoformat(created_at),
        is_active=True,
        is_2fa_enabled=False,
        encryption_salt=encryption_salt,
        failed_login_attempts=0
    )
    
    return Token(access_token=access_token, user=user)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = ?", (credentials.email,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if account is locked
    locked_until = datetime.fromisoformat(row["locked_until"]) if row["locked_until"] else None
    if is_account_locked(row["failed_login_attempts"], locked_until):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked due to too many failed login attempts"
        )
    
    # Verify password
    if not verify_password(credentials.password, row["hashed_password"]):
        # Increment failed attempts
        new_attempts = row["failed_login_attempts"] + 1
        new_lockout = calculate_lockout_time(new_attempts)
        
        cursor.execute("""
            UPDATE users 
            SET failed_login_attempts = ?, locked_until = ?
            WHERE id = ?
        """, (new_attempts, new_lockout.isoformat() if new_lockout else None, row["id"]))
        conn.commit()
        conn.close()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check 2FA if enabled
    if row["is_2fa_enabled"]:
        if not credentials.totp_code:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="2FA code required"
            )
        
        # Verify TOTP code
        if not verify_totp_code(row["totp_secret"], credentials.totp_code):
            # Check backup codes
            cursor.execute("""
                SELECT id FROM backup_codes 
                WHERE user_id = ? AND code = ? AND used = 0
            """, (row["id"], credentials.totp_code))
            backup_code = cursor.fetchone()
            
            if not backup_code:
                conn.close()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid 2FA code"
                )
            
            # Mark backup code as used
            cursor.execute("""
                UPDATE backup_codes SET used = 1 WHERE id = ?
            """, (backup_code["id"],))
            conn.commit()
    
    # Reset failed attempts on successful login
    cursor.execute("""
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = ?
    """, (row["id"],))
    conn.commit()
    conn.close()
    
    # Create access token
    access_token = create_access_token(data={"sub": credentials.email})
    
    user = User(
        id=row["id"],
        email=row["email"],
        username=row["username"],
        created_at=datetime.fromisoformat(row["created_at"]),
        is_active=bool(row["is_active"]),
        is_2fa_enabled=bool(row["is_2fa_enabled"]),
        failed_login_attempts=0
    )
    
    return Token(access_token=access_token, user=user)


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user


@router.post("/2fa/setup", response_model=TwoFactorSetup)
async def setup_2fa(current_user: User = Depends(get_current_user)):
    """Setup 2FA for user"""
    # Generate TOTP secret
    secret = generate_totp_secret()
    
    # Generate QR code
    qr_code = generate_totp_qr_code(current_user.email, secret)
    
    # Generate backup codes
    backup_codes = generate_backup_codes()
    
    # Store secret temporarily (not enabled until verified)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users SET totp_secret = ? WHERE id = ?
    """, (secret, current_user.id))
    
    # Store backup codes
    for code in backup_codes:
        code_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO backup_codes (id, user_id, code, created_at)
            VALUES (?, ?, ?, ?)
        """, (code_id, current_user.id, code, datetime.utcnow().isoformat()))
    
    conn.commit()
    conn.close()
    
    return TwoFactorSetup(
        secret=secret,
        qr_code_url=qr_code,
        backup_codes=backup_codes
    )


@router.post("/2fa/verify")
async def verify_2fa(
    verification: TwoFactorVerify,
    current_user: User = Depends(get_current_user)
):
    """Verify and enable 2FA"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT totp_secret FROM users WHERE id = ?", (current_user.id,))
    row = cursor.fetchone()
    
    if not row or not row["totp_secret"]:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not set up"
        )
    
    # Verify code
    if not verify_totp_code(row["totp_secret"], verification.totp_code):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code"
        )
    
    # Enable 2FA
    cursor.execute("""
        UPDATE users SET is_2fa_enabled = 1 WHERE id = ?
    """, (current_user.id,))
    conn.commit()
    conn.close()
    
    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
async def disable_2fa(current_user: User = Depends(get_current_user)):
    """Disable 2FA"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE users 
        SET is_2fa_enabled = 0, totp_secret = NULL 
        WHERE id = ?
    """, (current_user.id,))
    
    # Delete backup codes
    cursor.execute("DELETE FROM backup_codes WHERE user_id = ?", (current_user.id,))
    
    conn.commit()
    conn.close()
    
    return {"message": "2FA disabled successfully"}
