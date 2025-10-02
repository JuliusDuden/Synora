import sqlite3

conn = sqlite3.connect('data/notes.db')
cursor = conn.cursor()

print("=== Habits Table Structure ===")
cursor.execute('PRAGMA table_info(habits)')
for row in cursor.fetchall():
    print(row)

print("\n=== All Habits ===")
cursor.execute('SELECT * FROM habits')
habits = cursor.fetchall()
for row in habits:
    print(row)

print(f"\nTotal habits: {len(habits)}")

conn.close()
