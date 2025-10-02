"""
Migrate old notes table to new user-specific structure
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def migrate():
    """Rename old notes table and create new user-specific one"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    cursor = conn.cursor()
    
    try:
        # Check if old notes table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='notes'
        """)
        
        if cursor.fetchone():
            print("📋 Found old notes table, renaming to notes_old...")
            
            # Rename old table
            cursor.execute("ALTER TABLE notes RENAME TO notes_old")
            print("✅ Renamed to notes_old")
        
        # Create new notes table with user_id
        print("Creating new notes table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                content TEXT NOT NULL,
                encrypted_content TEXT,
                is_encrypted INTEGER DEFAULT 0,
                title TEXT,
                tags TEXT,
                project TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                UNIQUE(user_id, name)
            )
        """)
        print("✅ New notes table created")
        
        conn.commit()
        
        # Show what we have now
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\n📋 Available tables: {', '.join(tables)}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
