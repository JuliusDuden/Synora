const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export interface Note {
  name: string;
  path: string;
  content: string;
  metadata: {
    title?: string;
    tags: string[];
    project?: string;
    created?: string;
    modified?: string;
  };
  links: string[];
  backlinks: string[];
  tags: string[];
  created?: string;
  modified?: string;
}

export interface NoteList {
  name: string;
  path: string;
  title?: string;
  tags: string[];
  project?: string;
  modified?: string;
}

export interface SearchResult {
  name: string;
  path: string;
  title?: string;
  snippet: string;
  score: number;
  tags: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  title?: string;
  tags: string[];
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  bidirectional: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  color?: string;
  created_at: string;
  modified_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: string;
  due_date?: string;
  project_id?: string;
  created_at: string;
  modified_at: string;
}

export interface Idea {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string;  // Backend returns string, not array
  created_at: string;
  modified_at: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  streak: number;
  last_completed?: string;
  created_at: string;
  modified_at: string;
}

class API {
  // Simple fetch wrapper with retries for transient errors (503, network failures)
  private async requestWithRetries(input: string, init?: RequestInit, retries: number = 3, backoffMs: number = 250): Promise<Response> {
    let attempt = 0;
    while (true) {
      try {
        const res = await fetch(input, init);
        if (res.status === 503 && attempt < retries) {
          // transient server busy - retry
          await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
          attempt++;
          continue;
        }
        return res;
      } catch (err) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
          attempt++;
          continue;
        }
        throw err;
      }
    }
  }

  async getAllNotes(): Promise<NoteList[]> {
    const res = await this.requestWithRetries(`${API_URL}/api/notes`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  }

  async getNote(name: string): Promise<Note> {
    const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(name)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch note');
    return res.json();
  }

  async createNote(name: string, content: string = '', folder?: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ name, content, folder }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMessage = errorData.detail || res.statusText || 'Failed to create note';
      throw new Error(errorMessage);
    }
  }

  async updateNote(name: string, content: string, newName?: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ content, name: newName }),
    });
    if (!res.ok) throw new Error('Failed to update note');
  }

  async deleteNote(name: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete note');
  }

  async search(query: string): Promise<SearchResult[]> {
    const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to search');
    return res.json();
  }

  async getGraph(): Promise<GraphData> {
    const res = await fetch(`${API_URL}/api/graph`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch graph');
    return res.json();
  }

  async getTags(): Promise<Record<string, number>> {
    const res = await fetch(`${API_URL}/api/tags`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch tags');
    return res.json();
  }

  async createDailyNote(date?: string): Promise<{ name: string; created: boolean }> {
    const url = date
      ? `${API_URL}/api/notes/daily?date=${date}`
      : `${API_URL}/api/notes/daily`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to create daily note');
    return res.json();
  }

  // Projects API
  async getProjects(): Promise<any[]> {
    const res = await this.requestWithRetries(`${API_URL}/api/projects`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  }

  async createProject(name: string, description?: string, status?: string, color?: string): Promise<any> {
    const res = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ name, description, status, color }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  }

  async updateProject(id: string, data: any): Promise<any> {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  }

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete project');
  }

  // Tasks API
  async getTasks(completed?: boolean): Promise<any[]> {
    const url = completed !== undefined 
      ? `${API_URL}/api/tasks?completed=${completed}`
      : `${API_URL}/api/tasks`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  }

  async createTask(data: any): Promise<any> {
    const res = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  }

  async updateTask(id: string, data: any): Promise<any> {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  }

  async deleteTask(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete task');
  }

  // Ideas API
  async getIdeas(): Promise<Idea[]> {
    const res = await fetch(`${API_URL}/api/ideas`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch ideas');
    return res.json();
  }

  async createIdea(data: any): Promise<Idea> {
    const res = await fetch(`${API_URL}/api/ideas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create idea');
    return res.json();
  }

  async updateIdea(id: string, data: any): Promise<Idea> {
    const res = await fetch(`${API_URL}/api/ideas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update idea');
    return res.json();
  }

  async deleteIdea(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/ideas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete idea');
  }

  // Habits API
  async getHabits(): Promise<Habit[]> {
    const res = await fetch(`${API_URL}/api/habits`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch habits');
    return res.json();
  }

  async createHabit(data: any): Promise<Habit> {
    const res = await fetch(`${API_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create habit');
    return res.json();
  }

  async updateHabit(id: string, data: any): Promise<Habit> {
    const res = await fetch(`${API_URL}/api/habits/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update habit');
    return res.json();
  }

  async deleteHabit(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/habits/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete habit');
  }

  async completeHabit(id: string): Promise<any> {
    const res = await fetch(`${API_URL}/api/habits/${id}/complete`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to complete habit');
    return res.json();
  }

  // Snippets API
  async getSnippets(): Promise<any[]> {
    const res = await this.requestWithRetries(`${API_URL}/api/snippets`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch snippets');
    return res.json();
  }

  async createSnippet(data: any): Promise<any> {
    const res = await fetch(`${API_URL}/api/snippets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create snippet');
    }
    return res.json();
  }

  async updateSnippet(id: string, data: any): Promise<any> {
    const res = await fetch(`${API_URL}/api/snippets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update snippet');
    return res.json();
  }

  async deleteSnippet(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/snippets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete snippet');
  }
}

export const api = new API();

// Attachment upload function
export async function uploadAttachment(file: File): Promise<{ filename: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/attachments/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload attachment');
  }

  return response.json();
}

/**
 * Return a localStorage key for snippets that is specific to the authenticated user (by JWT 'sub' claim).
 * Falls back to a guest key when no token is present or decoding fails.
 */
export function getSnippetsStorageKey(): string {
  if (typeof window === 'undefined') return 'snippets_guest';
  const token = localStorage.getItem('auth_token');
  if (!token) return 'snippets_guest';
  try {
    const parts = token.split('.');
    if (parts.length < 2) return 'snippets_guest';
    // base64url decode
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded);
    const obj = JSON.parse(json);
    const sub = obj.sub || obj.email || 'guest';
    // sanitize key (avoid characters that could confuse localStorage consumers)
    const safe = String(sub).replace(/[^a-zA-Z0-9@._-]/g, '_');
    return `snippets_${safe}`;
  } catch (e) {
    return 'snippets_guest';
  }
}
