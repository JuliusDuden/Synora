"""
Add user_id column to notes table and create indexes
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def migrate():
    """Add user_id column and indexes to notes table"""
    conn = sqlite3.connect(DB_PATH, timeout=60)
    cursor = conn.cursor()
    
    try:
        # Enable WAL mode first
        print("Setting up WAL mode...")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=10000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        
        # Check if user_id column already exists
        cursor.execute("PRAGMA table_info(notes)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "user_id" in columns:
            print("✅ user_id column already exists")
        else:
            print("Adding user_id column...")
            
            # Step 1: Create new table with all required columns
            cursor.execute("""
                CREATE TABLE notes_new (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    path TEXT,
                    title TEXT,
                    content TEXT,
                    project TEXT,
                    tags TEXT,
                    links TEXT,
                    is_encrypted INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modified TIMESTAMP,
                    UNIQUE(user_id, name)
                )
            """)
            
            # Step 2: Get the first user ID from users table
            cursor.execute("SELECT id FROM users LIMIT 1")
            user = cursor.fetchone()
            if not user:
                print("❌ No users found. Create a user first!")
                conn.rollback()
                return
            
            default_user_id = user[0]
            print(f"Using default user_id: {default_user_id}")
            
            # Step 3: Copy data from old table (assign all notes to first user)
            cursor.execute("""
                INSERT INTO notes_new (
                    id, user_id, name, path, title, content, 
                    tags, links, modified, created_at, modified_at
                )
                SELECT 
                    LOWER(HEX(RANDOMBLOB(16))),
                    ?,
                    name,
                    path,
                    title,
                    content,
                    tags,
                    links,
                    modified,
                    COALESCE(modified, CURRENT_TIMESTAMP),
                    COALESCE(modified, CURRENT_TIMESTAMP)
                FROM notes
            """, (default_user_id,))
            
            # Step 4: Drop old table and rename new one
            cursor.execute("DROP TABLE notes")
            cursor.execute("ALTER TABLE notes_new RENAME TO notes")
            
            print("✅ user_id column added successfully")
        
        # Create indexes
        print("\nCreating indexes...")
        
        # Index 1: Composite index on (user_id, name) for fast lookups
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notes_user_name 
                ON notes(user_id, name)
            """)
            print("✅ Created index: idx_notes_user_name")
        except Exception as e:
            print(f"⚠️  Index idx_notes_user_name: {e}")
        
        # Index 2: Index on user_id for user-specific queries
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notes_user_id 
                ON notes(user_id)
            """)
            print("✅ Created index: idx_notes_user_id")
        except Exception as e:
            print(f"⚠️  Index idx_notes_user_id: {e}")
        
        # Index 3: Index on modified timestamp for recent notes queries
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notes_modified 
                ON notes(modified DESC)
            """)
            print("✅ Created index: idx_notes_modified")
        except Exception as e:
            print(f"⚠️  Index idx_notes_modified: {e}")
        
        # Run ANALYZE to update query planner statistics
        print("\nRunning ANALYZE...")
        cursor.execute("ANALYZE")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Show final schema
        print("\nFinal notes table schema:")
        cursor.execute("PRAGMA table_info(notes)")
        for col in cursor.fetchall():
            print(f"   - {col[1]} ({col[2]})")
        
        print("\nIndexes:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='notes'")
        for idx in cursor.fetchall():
            print(f"   - {idx[0]}")
        
    except sqlite3.OperationalError as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("=== Notes Table Migration ===\n")
    migrate()
