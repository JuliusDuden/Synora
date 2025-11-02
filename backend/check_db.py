"""
Check database health and locks
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def check_database():
    """Check database for locks and integrity"""
    conn = sqlite3.connect(DB_PATH, timeout=60)
    cursor = conn.cursor()
    
    try:
        print("=== Database Health Check ===\n")
        
        # Check journal mode
        cursor.execute("PRAGMA journal_mode")
        journal_mode = cursor.fetchone()[0]
        print(f"Journal Mode: {journal_mode}")
        if journal_mode != "wal":
            print("⚠️  WARNING: Not in WAL mode. Run optimize_db.py to fix.")
        
        # Check integrity
        print("\nRunning integrity check...")
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()[0]
        if result == "ok":
            print("✅ Database integrity: OK")
        else:
            print(f"❌ Database integrity: {result}")
        
        # Count notes
        cursor.execute("SELECT COUNT(*) FROM notes")
        notes_count = cursor.fetchone()[0]
        print(f"\n📝 Total notes: {notes_count}")
        
        # Check for duplicate notes per user
        cursor.execute("""
            SELECT user_id, name, COUNT(*) as count 
            FROM notes 
            GROUP BY user_id, name 
            HAVING COUNT(*) > 1
        """)
        duplicates = cursor.fetchall()
        if duplicates:
            print(f"\n⚠️  WARNING: Found {len(duplicates)} duplicate notes:")
            for dup in duplicates[:5]:  # Show first 5
                print(f"   User {dup[0]}: '{dup[1]}' (x{dup[2]})")
        else:
            print("\n✅ No duplicate notes found")
        
        # Check indexes
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='notes'")
        indexes = cursor.fetchall()
        print(f"\n📊 Indexes on notes table: {len(indexes)}")
        for idx in indexes:
            print(f"   - {idx[0]}")
        
        if len(indexes) < 3:
            print("\n⚠️  WARNING: Missing indexes. Run optimize_db.py to add them.")
        
        print("\n=== Check Complete ===")
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    check_database()
