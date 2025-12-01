"""
Create missing tables for user-specific features
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

def create_missing_tables():
    """Create all required tables if they don't exist"""
    conn = sqlite3.connect(DB_PATH, timeout=60)
    cursor = conn.cursor()
    
    try:
        print("=== Creating Missing Tables ===\n")
        
        # Enable WAL mode
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")
        
        # Projects table
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
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)")
        print("✅ Projects table created/verified")
        
        # Tasks table
        print("\nCreating tasks table...")
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
                tags TEXT,
                subtasks TEXT,
                reminder TEXT,
                favorite INTEGER DEFAULT 0,
                linked_notes TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)")
        print("✅ Tasks table created/verified")
        
        # Ideas table
        print("\nCreating ideas table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT,
                tags TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ideas_user ON ideas(user_id)")
        print("✅ Ideas table created/verified")
        
        # Habits table
        print("\nCreating habits table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS habits (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                frequency TEXT DEFAULT 'daily',
                color TEXT,
                icon TEXT,
                streak INTEGER DEFAULT 0,
                best_streak INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id)")
        print("✅ Habits table created/verified")
        
        # Habit completions table
        print("\nCreating habit_completions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS habit_completions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id TEXT NOT NULL,
                date TEXT NOT NULL,
                completed INTEGER DEFAULT 1,
                note TEXT,
                FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
                UNIQUE(habit_id, date)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(date)")
        print("✅ Habit completions table created/verified")
        
        # Snippets table
        print("\nCreating snippets table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS snippets (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT NOT NULL,
                language TEXT,
                tags TEXT,
                favorite INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_snippets_user ON snippets(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets(language)")
        print("✅ Snippets table created/verified")
        
        conn.commit()
        
        print("\n" + "="*60)
        print("=== All Tables Created Successfully ===")
        print("\nVerifying tables...")
        
        # Verify all tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        table_names = [t[0] for t in tables]
        
        required_tables = ['projects', 'tasks', 'ideas', 'habits', 'habit_completions', 'snippets']
        for table in required_tables:
            if table in table_names:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"✅ {table}: {count} rows")
            else:
                print(f"❌ {table}: NOT FOUND")
        
    except Exception as e:
        print(f"\n❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_missing_tables()
