"""
Database Optimization Migration
Adds indexes to improve query performance and prevent timeouts
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def migrate():
    """Add indexes to notes table for better performance"""
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    cursor = conn.cursor()
    
    try:
        # Enable WAL mode for better concurrency
        print("Setting up WAL mode...")
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        
        # Check existing indexes
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='notes'")
        existing_indexes = [row[0] for row in cursor.fetchall()]
        
        # Add index on user_id and name for faster lookups
        if 'idx_notes_user_name' not in existing_indexes:
            print("Creating index on (user_id, name)...")
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notes_user_name 
                ON notes(user_id, name)
            """)
            print("✅ Index idx_notes_user_name created")
        else:
            print("ℹ️  Index idx_notes_user_name already exists")
        
        # Add index on user_id for faster user queries
        if 'idx_notes_user_id' not in existing_indexes:
            print("Creating index on user_id...")
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notes_user_id 
                ON notes(user_id)
            """)
            print("✅ Index idx_notes_user_id created")
        else:
            print("ℹ️  Index idx_notes_user_id already exists")
        
        # Add index on modified_at for sorting
        if 'idx_notes_modified' not in existing_indexes:
            print("Creating index on modified_at...")
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notes_modified 
                ON notes(modified_at DESC)
            """)
            print("✅ Index idx_notes_modified created")
        else:
            print("ℹ️  Index idx_notes_modified already exists")
        
        conn.commit()
        
        # Analyze tables for query planner
        print("Analyzing database...")
        cursor.execute("ANALYZE")
        conn.commit()
        
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
