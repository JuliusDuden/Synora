"""
Add additional fields to tasks table for enhanced task management
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def migrate():
    """Add new fields to tasks table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(tasks)")
    columns = [row[1] for row in cursor.fetchall()]
    
    # Add new columns if they don't exist
    if 'tags' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN tags TEXT")
        print("✓ Added 'tags' column")
    
    if 'subtasks' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN subtasks TEXT")
        print("✓ Added 'subtasks' column")
    
    if 'reminder' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN reminder TEXT")
        print("✓ Added 'reminder' column")
    
    if 'favorite' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN favorite INTEGER DEFAULT 0")
        print("✓ Added 'favorite' column")
    
    if 'linked_notes' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN linked_notes TEXT")
        print("✓ Added 'linked_notes' column")
    
    conn.commit()
    conn.close()
    
    print("\n✓ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
