import sqlite3
import uuid

conn = sqlite3.connect('data/notes.db')
cursor = conn.cursor()

print("=== Fixing Habits Table IDs ===\n")

# Get all habits
cursor.execute('SELECT rowid, user_id, name, description, frequency, streak, last_completed, created_at, modified_at FROM habits')
habits = cursor.fetchall()

print(f"Found {len(habits)} habits without IDs\n")

# Update each habit with a proper UUID
for habit in habits:
    rowid = habit[0]
    new_id = str(uuid.uuid4())
    
    cursor.execute(
        'UPDATE habits SET id = ? WHERE rowid = ?',
        (new_id, rowid)
    )
    print(f"✓ Updated habit '{habit[2]}' (rowid={rowid}) with ID: {new_id}")

conn.commit()

print("\n=== Verification ===")
cursor.execute('SELECT id, name FROM habits')
for row in cursor.fetchall():
    print(f"ID: {row[0]}, Name: {row[1]}")

conn.close()

print("\n✅ All habits now have valid IDs!")
