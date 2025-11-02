from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from models.user import User
from routes.auth import get_current_user
import sqlite3
import uuid

router = APIRouter()
DATABASE = 'data/notes.db'

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str = "daily"  # daily, weekly, monthly

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None

def get_db():
    conn = sqlite3.connect(DATABASE, timeout=30, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn

@router.get("")
async def get_habits(current_user: User = Depends(get_current_user)):
    """Get all habits for the current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        """
        SELECT id, user_id, name, description, frequency, streak, last_completed, created_at, modified_at
        FROM habits
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (current_user.id,)
    )
    
    rows = cursor.fetchall()
    conn.close()
    
    habits = []
    for row in rows:
        habits.append({
            'id': row[0],
            'user_id': row[1],
            'name': row[2],
            'description': row[3],
            'frequency': row[4],
            'streak': row[5] or 0,
            'last_completed': row[6],
            'created_at': row[7],
            'modified_at': row[8]
        })
    
    return habits

@router.post("")
async def create_habit(
    habit: HabitCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new habit"""
    conn = get_db()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    habit_id = str(uuid.uuid4())  # Generate UUID for new habit
    
    cursor.execute(
        """
        INSERT INTO habits (id, user_id, name, description, frequency, streak, created_at, modified_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        """,
        (
            habit_id,
            current_user.id,
            habit.name,
            habit.description,
            habit.frequency,
            now,
            now
        )
    )
    
    conn.commit()
    conn.close()
    
    return {
        'id': habit_id,
        'user_id': current_user.id,
        'name': habit.name,
        'description': habit.description,
        'frequency': habit.frequency,
        'streak': 0,
        'last_completed': None,
        'created_at': now,
        'modified_at': now
    }

@router.put("/{habit_id}")
async def update_habit(
    habit_id: int,
    habit_update: HabitUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a habit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if habit exists and belongs to user
    cursor.execute("SELECT user_id FROM habits WHERE id = ?", (habit_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")
    
    if row[0] != current_user.id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update only provided fields
    update_fields = []
    update_values = []
    
    if habit_update.name is not None:
        update_fields.append("name = ?")
        update_values.append(habit_update.name)
    
    if habit_update.description is not None:
        update_fields.append("description = ?")
        update_values.append(habit_update.description)
    
    if habit_update.frequency is not None:
        update_fields.append("frequency = ?")
        update_values.append(habit_update.frequency)
    
    if not update_fields:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update")
    
    now = datetime.now().isoformat()
    update_fields.append("modified_at = ?")
    update_values.append(now)
    update_values.append(habit_id)
    
    cursor.execute(
        f"UPDATE habits SET {', '.join(update_fields)} WHERE id = ?",
        update_values
    )
    
    conn.commit()
    
    # Return updated habit
    cursor.execute(
        """
        SELECT id, user_id, name, description, frequency, streak, last_completed, created_at, modified_at
        FROM habits WHERE id = ?
        """,
        (habit_id,)
    )
    
    row = cursor.fetchone()
    conn.close()
    
    return {
        'id': row[0],
        'user_id': row[1],
        'name': row[2],
        'description': row[3],
        'frequency': row[4],
        'streak': row[5] or 0,
        'last_completed': row[6],
        'created_at': row[7],
        'modified_at': row[8]
    }

@router.delete("/{habit_id}")
async def delete_habit(
    habit_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a habit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if habit exists and belongs to user
    cursor.execute("SELECT user_id FROM habits WHERE id = ?", (habit_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")
    
    if row[0] != current_user.id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized")
    
    cursor.execute("DELETE FROM habits WHERE id = ?", (habit_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Habit deleted successfully"}

@router.post("/{habit_id}/complete")
async def complete_habit(
    habit_id: int,
    current_user: User = Depends(get_current_user)
):
    """Mark a habit as completed for today and update streak"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if habit exists and belongs to user
    cursor.execute(
        "SELECT user_id, streak, last_completed FROM habits WHERE id = ?",
        (habit_id,)
    )
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")
    
    if row[0] != current_user.id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized")
    
    current_streak = row[1] or 0
    last_completed = row[2]
    today = date.today().isoformat()
    
    # Calculate new streak
    new_streak = current_streak
    if last_completed:
        try:
            last_date = date.fromisoformat(last_completed)
            days_diff = (date.today() - last_date).days
            
            if days_diff == 0:
                # Already completed today
                conn.close()
                return {"message": "Already completed today", "streak": current_streak}
            elif days_diff == 1:
                # Consecutive day - increase streak
                new_streak = current_streak + 1
            else:
                # Streak broken - reset to 1
                new_streak = 1
        except:
            new_streak = 1
    else:
        # First completion
        new_streak = 1
    
    # Update habit
    cursor.execute(
        """
        UPDATE habits 
        SET streak = ?, last_completed = ?, modified_at = ?
        WHERE id = ?
        """,
        (new_streak, today, datetime.now().isoformat(), habit_id)
    )
    
    conn.commit()
    conn.close()
    
    return {
        "message": "Habit completed",
        "streak": new_streak,
        "last_completed": today
    }
