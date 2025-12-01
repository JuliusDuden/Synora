from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
from models.user import User
from routes.auth import get_current_user
import sqlite3
import uuid
import os

router = APIRouter()
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.db")

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str = "daily"  # daily, weekly, monthly
    color: Optional[str] = None
    icon: Optional[str] = None

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn


def calculate_streak(habit_id: str, user_id: str, conn) -> dict:
    """Calculate current and best streak for a habit"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT date FROM habit_completions 
        WHERE habit_id = ? AND user_id = ?
        ORDER BY date DESC
    """, (habit_id, user_id))
    
    completions = [row[0] for row in cursor.fetchall()]
    
    if not completions:
        return {"streak": 0, "best_streak": 0}
    
    # Calculate current streak
    current_streak = 0
    today = date.today()
    check_date = today
    
    for comp_date_str in completions:
        try:
            comp_date = date.fromisoformat(comp_date_str)
            if comp_date == check_date or comp_date == check_date - timedelta(days=1):
                current_streak += 1
                check_date = comp_date - timedelta(days=1)
            elif comp_date < check_date - timedelta(days=1):
                break
        except:
            continue
    
    # Calculate best streak
    best_streak = current_streak
    if len(completions) > 1:
        temp_streak = 1
        sorted_dates = sorted([date.fromisoformat(d) for d in completions], reverse=True)
        for i in range(1, len(sorted_dates)):
            if sorted_dates[i-1] - sorted_dates[i] == timedelta(days=1):
                temp_streak += 1
                best_streak = max(best_streak, temp_streak)
            else:
                temp_streak = 1
    
    return {"streak": current_streak, "best_streak": best_streak}


@router.get("")
async def get_habits(current_user: User = Depends(get_current_user)):
    """Get all habits for the current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        """
        SELECT id, user_id, name, description, frequency, color, icon, 
               streak, best_streak, last_completed, created_at, modified_at
        FROM habits
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (current_user.id,)
    )
    
    rows = cursor.fetchall()
    
    habits = []
    for row in rows:
        row_dict = dict(row)
        # Recalculate streaks based on completions
        streak_info = calculate_streak(row_dict['id'], current_user.id, conn)
        
        habits.append({
            'id': row_dict['id'],
            'user_id': row_dict['user_id'],
            'name': row_dict['name'],
            'description': row_dict['description'],
            'frequency': row_dict['frequency'],
            'color': row_dict.get('color'),
            'icon': row_dict.get('icon'),
            'streak': streak_info['streak'],
            'best_streak': streak_info['best_streak'],
            'last_completed': row_dict['last_completed'],
            'created_at': row_dict['created_at'],
            'modified_at': row_dict['modified_at']
        })
    
    conn.close()
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
    habit_id = str(uuid.uuid4())
    
    cursor.execute(
        """
        INSERT INTO habits (id, user_id, name, description, frequency, color, icon, streak, best_streak, created_at, modified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        """,
        (
            habit_id,
            current_user.id,
            habit.name,
            habit.description,
            habit.frequency,
            habit.color,
            habit.icon,
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
        'color': habit.color,
        'icon': habit.icon,
        'streak': 0,
        'best_streak': 0,
        'last_completed': None,
        'created_at': now,
        'modified_at': now
    }

@router.put("/{habit_id}")
async def update_habit(
    habit_id: str,
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
    
    if habit_update.color is not None:
        update_fields.append("color = ?")
        update_values.append(habit_update.color)
        
    if habit_update.icon is not None:
        update_fields.append("icon = ?")
        update_values.append(habit_update.icon)
    
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
        SELECT id, user_id, name, description, frequency, color, icon,
               streak, best_streak, last_completed, created_at, modified_at
        FROM habits WHERE id = ?
        """,
        (habit_id,)
    )
    
    row = cursor.fetchone()
    row_dict = dict(row)
    streak_info = calculate_streak(habit_id, current_user.id, conn)
    conn.close()
    
    return {
        'id': row_dict['id'],
        'user_id': row_dict['user_id'],
        'name': row_dict['name'],
        'description': row_dict['description'],
        'frequency': row_dict['frequency'],
        'color': row_dict.get('color'),
        'icon': row_dict.get('icon'),
        'streak': streak_info['streak'],
        'best_streak': streak_info['best_streak'],
        'last_completed': row_dict['last_completed'],
        'created_at': row_dict['created_at'],
        'modified_at': row_dict['modified_at']
    }

@router.delete("/{habit_id}")
async def delete_habit(
    habit_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a habit and its completions"""
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
    
    # Delete completions first
    cursor.execute("DELETE FROM habit_completions WHERE habit_id = ?", (habit_id,))
    cursor.execute("DELETE FROM habits WHERE id = ?", (habit_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Habit deleted successfully"}

@router.post("/{habit_id}/complete")
async def complete_habit(
    habit_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a habit as completed for today"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if habit exists and belongs to user
    cursor.execute(
        "SELECT user_id, last_completed FROM habits WHERE id = ?",
        (habit_id,)
    )
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")
    
    if row[0] != current_user.id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized")
    
    today = date.today().isoformat()
    now = datetime.now().isoformat()
    
    # Check if already completed today
    cursor.execute("""
        SELECT id FROM habit_completions 
        WHERE habit_id = ? AND date = ?
    """, (habit_id, today))
    
    if cursor.fetchone():
        # Already completed - return current streak
        streak_info = calculate_streak(habit_id, current_user.id, conn)
        conn.close()
        return {
            "message": "Already completed today",
            "streak": streak_info['streak'],
            "best_streak": streak_info['best_streak'],
            "last_completed": today
        }
    
    # Add completion record
    cursor.execute("""
        INSERT INTO habit_completions (habit_id, user_id, date, completed, created_at)
        VALUES (?, ?, ?, 1, ?)
    """, (habit_id, current_user.id, today, now))
    
    # Update habit's last_completed
    cursor.execute("""
        UPDATE habits SET last_completed = ?, modified_at = ? WHERE id = ?
    """, (today, now, habit_id))
    
    conn.commit()
    
    # Calculate new streaks
    streak_info = calculate_streak(habit_id, current_user.id, conn)
    
    # Update stored streaks
    cursor.execute("""
        UPDATE habits SET streak = ?, best_streak = ? WHERE id = ?
    """, (streak_info['streak'], streak_info['best_streak'], habit_id))
    conn.commit()
    conn.close()
    
    return {
        "message": "Habit completed",
        "streak": streak_info['streak'],
        "best_streak": streak_info['best_streak'],
        "last_completed": today
    }


@router.delete("/{habit_id}/complete")
async def uncomplete_habit(
    habit_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove today's completion for a habit"""
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
    
    today = date.today().isoformat()
    
    # Delete today's completion
    cursor.execute("""
        DELETE FROM habit_completions 
        WHERE habit_id = ? AND date = ?
    """, (habit_id, today))
    
    conn.commit()
    
    # Recalculate streaks
    streak_info = calculate_streak(habit_id, current_user.id, conn)
    
    # Get last completion date
    cursor.execute("""
        SELECT date FROM habit_completions 
        WHERE habit_id = ? ORDER BY date DESC LIMIT 1
    """, (habit_id,))
    last_row = cursor.fetchone()
    last_completed = last_row[0] if last_row else None
    
    # Update habit
    cursor.execute("""
        UPDATE habits SET streak = ?, best_streak = ?, last_completed = ?, modified_at = ?
        WHERE id = ?
    """, (streak_info['streak'], streak_info['best_streak'], last_completed, datetime.now().isoformat(), habit_id))
    
    conn.commit()
    conn.close()
    
    return {
        "message": "Completion removed",
        "streak": streak_info['streak'],
        "best_streak": streak_info['best_streak'],
        "last_completed": last_completed
    }


@router.get("/{habit_id}/history")
async def get_habit_history(
    habit_id: str,
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    """Get completion history for a habit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check ownership
    cursor.execute("SELECT user_id FROM habits WHERE id = ?", (habit_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")
    
    if row[0] != current_user.id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get completions for the last N days
    start_date = (date.today() - timedelta(days=days)).isoformat()
    
    cursor.execute("""
        SELECT date, note, created_at FROM habit_completions
        WHERE habit_id = ? AND date >= ?
        ORDER BY date DESC
    """, (habit_id, start_date))
    
    completions = []
    for row in cursor.fetchall():
        completions.append({
            'date': row[0],
            'note': row[1],
            'created_at': row[2]
        })
    
    conn.close()
    
    return {
        'habit_id': habit_id,
        'completions': completions,
        'total': len(completions)
    }
