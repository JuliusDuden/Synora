"""
Add missing columns to notes table
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def add_columns():
    """Add project, is_encrypted, and modified_at columns"""
    conn = sqlite3.connect(DB_PATH, timeout=60)
    cursor = conn.cursor()
    
    try:
        print("=== Adding Missing Columns ===\n")
        
        # Check current columns
        cursor.execute("PRAGMA table_info(notes)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Current columns: {', '.join(columns)}\n")
        
        # Add project column if missing
        if "project" not in columns:
            print("Adding 'project' column...")
            cursor.execute("ALTER TABLE notes ADD COLUMN project TEXT")
            print("✅ Added project column")
        else:
            print("✅ project column already exists")
        
        # Add is_encrypted column if missing
        if "is_encrypted" not in columns:
            print("Adding 'is_encrypted' column...")
            cursor.execute("ALTER TABLE notes ADD COLUMN is_encrypted INTEGER DEFAULT 0")
            print("✅ Added is_encrypted column")
        else:
            print("✅ is_encrypted column already exists")
        
        # Add modified_at column if missing
        if "modified_at" not in columns:
            print("Adding 'modified_at' column...")
            cursor.execute("ALTER TABLE notes ADD COLUMN modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            # Copy values from modified to modified_at
            cursor.execute("UPDATE notes SET modified_at = modified WHERE modified_at IS NULL")
            print("✅ Added modified_at column and copied data from modified")
        else:
            print("✅ modified_at column already exists")
        
        conn.commit()
        print("\n✅ All columns added successfully!")
        
        # Show final schema
        print("\nFinal notes table schema:")
        cursor.execute("PRAGMA table_info(notes)")
        for col in cursor.fetchall():
            print(f"   - {col[1]} ({col[2]})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_columns()
