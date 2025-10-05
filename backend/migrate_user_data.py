"""
Database migration to add notes table for user-specific storage
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def migrate():
    """Create notes table with user_id"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    cursor = conn.cursor()
    
    try:
        # Create notes table
        print("Creating notes table...")
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
        print("✅ Notes table created")
        
        # Create projects table
        print("Creating projects table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'active',
                color TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                UNIQUE(user_id, name)
            )
        """)
        print("✅ Projects table created")
        
        # Create tasks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                completed INTEGER DEFAULT 0,
                priority TEXT DEFAULT 'medium',
                due_date TEXT,
                project_id TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL
            )
        """)
        
        # Create ideas table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ideas (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT,
                tags TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL
            )
        """)
        
        # Create habits table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS habits (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                frequency TEXT DEFAULT 'daily',
                streak INTEGER DEFAULT 0,
                last_completed TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL
            )
        """)
        
        # Create habit_logs table for tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS habit_logs (
                id TEXT PRIMARY KEY,
                habit_id TEXT NOT NULL,
                completed_at TEXT NOT NULL
            )
        """)

        # Create snippets table
        print("Creating snippets table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS snippets (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT,
                content TEXT,
                color TEXT,
                pinned INTEGER DEFAULT 0,
                items TEXT,
                code TEXT,
                images TEXT,
                links TEXT,
                voice_note TEXT,
                connections TEXT,
                pinned_to_dashboard INTEGER DEFAULT 0,
                reminder TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL
            )
        """)
        print("✅ Snippets table created")
        
        conn.commit()
        print("✅ All tables created successfully!")
        
        # Show tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"\n📋 Available tables:")
        for table in tables:
            print(f"   - {table[0]}")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
