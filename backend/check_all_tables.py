"""
Check all database tables and their schemas
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def check_all_tables():
    """Check all tables in database"""
    conn = sqlite3.connect(DB_PATH, timeout=60)
    cursor = conn.cursor()
    
    try:
        print("=== Database Tables Check ===\n")
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        
        print(f"Found {len(tables)} tables:\n")
        
        for table in tables:
            table_name = table[0]
            print(f"\n{'='*60}")
            print(f"Table: {table_name}")
            print('='*60)
            
            # Get schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            print("\nColumns:")
            for col in columns:
                null_str = "NOT NULL" if col[3] else "NULL"
                default_str = f" DEFAULT {col[4]}" if col[4] else ""
                pk_str = " PRIMARY KEY" if col[5] else ""
                print(f"   - {col[1]:<20} {col[2]:<15} {null_str:<10}{default_str}{pk_str}")
            
            # Count rows
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"\nRow count: {count}")
            
            # If table has user_id, show distribution
            column_names = [col[1] for col in columns]
            if 'user_id' in column_names:
                cursor.execute(f"SELECT user_id, COUNT(*) FROM {table_name} GROUP BY user_id")
                user_counts = cursor.fetchall()
                if user_counts:
                    print("\nRows per user:")
                    for user_id, count in user_counts:
                        print(f"   User {user_id}: {count} rows")
        
        print(f"\n{'='*60}")
        print("=== Check Complete ===")
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    check_all_tables()
