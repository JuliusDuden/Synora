"""
Database Migration Script
Adds encryption_salt column to users table
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def migrate():
    """Add encryption_salt column to users table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'encryption_salt' not in columns:
            print("Adding encryption_salt column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN encryption_salt TEXT")
            conn.commit()
            print("✅ Migration successful!")
        else:
            print("ℹ️  Column encryption_salt already exists")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
