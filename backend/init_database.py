"""
Database initialization script - Creates all required tables
Run this once on server to initialize the database
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")


def init_database():
    """Initialize database with all required tables"""
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH, timeout=60)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("Synora Database Initialization")
    print("=" * 60)
    
    try:
        # Enable WAL mode for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")
        print("✅ WAL mode enabled")
        
        # ============================================================
        # USERS TABLE
        # ============================================================
        print("\n📦 Creating users table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                is_2fa_enabled INTEGER DEFAULT 0,
                totp_secret TEXT,
                encryption_salt TEXT,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT,
                settings TEXT DEFAULT '{}'
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        print("✅ Users table created")
        
        # ============================================================
        # NOTES TABLE (for indexing/search)
        # ============================================================
        print("\n📦 Creating notes table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                content TEXT,
                title TEXT,
                project TEXT,
                tags TEXT,
                links TEXT,
                is_encrypted INTEGER DEFAULT 0,
                modified TIMESTAMP,
                created_at TEXT,
                modified_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_name ON notes(name)")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_user_name ON notes(user_id, name)")
        print("✅ Notes table created")
        
        # FTS5 for full-text search
        print("\n📦 Creating FTS5 search index...")
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                name, title, content, tags,
                content='notes',
                content_rowid='rowid'
            )
        """)
        
        # FTS triggers
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                INSERT INTO notes_fts(rowid, name, title, content, tags)
                VALUES (new.rowid, new.name, new.title, new.content, new.tags);
            END
        """)
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                DELETE FROM notes_fts WHERE rowid = old.rowid;
            END
        """)
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                UPDATE notes_fts SET 
                    name = new.name,
                    title = new.title,
                    content = new.content,
                    tags = new.tags
                WHERE rowid = old.rowid;
            END
        """)
        print("✅ FTS5 search index created")
        
        # ============================================================
        # PROJECTS TABLE
        # ============================================================
        print("\n📦 Creating projects table...")
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
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)")
        print("✅ Projects table created")
        
        # ============================================================
        # TASKS TABLE
        # ============================================================
        print("\n📦 Creating tasks table...")
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
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)")
        print("✅ Tasks table created")
        
        # ============================================================
        # IDEAS TABLE
        # ============================================================
        print("\n📦 Creating ideas table...")
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
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category)")
        print("✅ Ideas table created")
        
        # ============================================================
        # HABITS TABLE
        # ============================================================
        print("\n📦 Creating habits table...")
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
                last_completed TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id)")
        print("✅ Habits table created")
        
        # ============================================================
        # HABIT COMPLETIONS TABLE
        # ============================================================
        print("\n📦 Creating habit_completions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS habit_completions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                date TEXT NOT NULL,
                completed INTEGER DEFAULT 1,
                note TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(habit_id, date)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_habit_completions_user ON habit_completions(user_id)")
        print("✅ Habit completions table created")
        
        # ============================================================
        # SNIPPETS TABLE
        # ============================================================
        print("\n📦 Creating snippets table...")
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
                modified_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_snippets_user ON snippets(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_snippets_pinned ON snippets(pinned)")
        print("✅ Snippets table created")
        
        # ============================================================
        # ATTACHMENTS TABLE
        # ============================================================
        print("\n📦 Creating attachments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                original_name TEXT NOT NULL,
                mime_type TEXT,
                size INTEGER,
                note_name TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_attachments_user ON attachments(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_name)")
        print("✅ Attachments table created")
        
        # ============================================================
        # SESSIONS TABLE (for JWT refresh tokens)
        # ============================================================
        print("\n📦 Creating sessions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                device_info TEXT,
                ip_address TEXT,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token)")
        print("✅ Sessions table created")
        
        conn.commit()
        
        # ============================================================
        # VERIFY ALL TABLES
        # ============================================================
        print("\n" + "=" * 60)
        print("Verifying tables...")
        print("=" * 60)
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        
        required_tables = [
            'users', 'notes', 'notes_fts', 'projects', 'tasks', 
            'ideas', 'habits', 'habit_completions', 'snippets', 
            'attachments', 'sessions'
        ]
        
        for table_name in required_tables:
            if (table_name,) in tables or any(table_name in t for t in tables):
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"✅ {table_name}: {count} rows")
            else:
                print(f"❌ {table_name}: NOT FOUND")
        
        print("\n" + "=" * 60)
        print("✅ Database initialization complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()


def add_missing_columns():
    """Add any missing columns to existing tables"""
    conn = sqlite3.connect(DB_PATH, timeout=60)
    cursor = conn.cursor()
    
    print("\n" + "=" * 60)
    print("Checking for missing columns...")
    print("=" * 60)
    
    # Define expected columns for each table
    expected_columns = {
        'habits': [
            ('last_completed', 'TEXT'),
            ('best_streak', 'INTEGER DEFAULT 0'),
            ('color', 'TEXT'),
            ('icon', 'TEXT'),
        ],
        'tasks': [
            ('reminder', 'TEXT'),
            ('favorite', 'INTEGER DEFAULT 0'),
            ('linked_notes', 'TEXT'),
            ('subtasks', 'TEXT'),
        ],
        'notes': [
            ('user_id', 'TEXT'),
            ('id', 'TEXT'),
            ('project', 'TEXT'),
            ('is_encrypted', 'INTEGER DEFAULT 0'),
            ('created_at', 'TEXT'),
            ('modified_at', 'TEXT'),
        ],
        'snippets': [
            ('voice_note', 'TEXT'),
            ('connections', 'TEXT'),
            ('pinned_to_dashboard', 'INTEGER DEFAULT 0'),
            ('reminder', 'TEXT'),
        ],
        'users': [
            ('email', 'TEXT'),
            ('hashed_password', 'TEXT'),
            ('is_active', 'INTEGER DEFAULT 1'),
            ('is_2fa_enabled', 'INTEGER DEFAULT 0'),
            ('encryption_salt', 'TEXT'),
            ('failed_login_attempts', 'INTEGER DEFAULT 0'),
            ('locked_until', 'TEXT'),
        ]
    }
    
    for table, columns in expected_columns.items():
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            existing_cols = [row[1] for row in cursor.fetchall()]
            
            for col_name, col_type in columns:
                if col_name not in existing_cols:
                    try:
                        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                        print(f"✅ Added column {col_name} to {table}")
                    except sqlite3.OperationalError as e:
                        if "duplicate column" not in str(e).lower():
                            print(f"⚠️  Could not add {col_name} to {table}: {e}")
        except Exception as e:
            print(f"⚠️  Error checking {table}: {e}")
    
    conn.commit()
    conn.close()
    print("✅ Column check complete")


if __name__ == "__main__":
    init_database()
    add_missing_columns()
