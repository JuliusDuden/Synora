import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type {
  User,
  Note,
  NoteList,
  SearchResult,
  GraphData,
  Project,
  Task,
  Idea,
  Habit,
  Snippet,
  AuthResponse,
} from '../types';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';

// Debug logging
console.log('API_URL configured as:', API_URL);
console.log('Full expo config:', Constants.expoConfig?.extra);

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async requestWithRetries(
    input: string,
    init?: RequestInit,
    retries: number = 3,
    backoffMs: number = 250
  ): Promise<Response> {
    let attempt = 0;
    while (true) {
      try {
        const res = await fetch(input, init);
        if (res.status === 503 && attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt)));
          attempt++;
          continue;
        }
        return res;
      } catch (err) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt)));
          attempt++;
          continue;
        }
        throw err;
      }
    }
  }

  // Auth API
  async login(email: string, password: string, totpCode?: string): Promise<AuthResponse> {
    const url = `${API_URL}/api/auth/login`;
    console.log('Attempting login to:', url);
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, totp_code: totpCode }),
      });

      console.log('Login response status:', res.status);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Login failed');
      }

      return res.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, username, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return res.json();
  }

  async getMe(): Promise<User> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/auth/me`, { headers });

    if (!res.ok) {
      throw new Error('Failed to fetch user');
    }

    return res.json();
  }

  // Notes API
  async getAllNotes(): Promise<NoteList[]> {
    const headers = await this.getAuthHeaders();
    const res = await this.requestWithRetries(`${API_URL}/api/notes`, { headers });

    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  }

  async getNote(name: string): Promise<Note> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(name)}`, { headers });

    if (!res.ok) throw new Error('Failed to fetch note');
    return res.json();
  }

  async createNote(name: string, content: string = '', folder?: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ name, content, folder }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to create note');
    }
  }

  async updateNote(name: string, content: string, newName?: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ content, name: newName }),
    });

    if (!res.ok) throw new Error('Failed to update note');
  }

  async deleteNote(name: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) throw new Error('Failed to delete note');
  }

  // Search API
  async search(query: string): Promise<SearchResult[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`, { headers });

    if (!res.ok) throw new Error('Failed to search');
    return res.json();
  }

  // Graph API
  async getGraph(): Promise<GraphData> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/graph`, { headers });

    if (!res.ok) throw new Error('Failed to fetch graph');
    return res.json();
  }

  // Tags API
  async getTags(): Promise<Record<string, number>> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/tags`, { headers });

    if (!res.ok) throw new Error('Failed to fetch tags');
    return res.json();
  }

  // Projects API
  async getProjects(): Promise<Project[]> {
    const headers = await this.getAuthHeaders();
    const res = await this.requestWithRetries(`${API_URL}/api/projects`, { headers });

    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  }

  async deleteProject(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) throw new Error('Failed to delete project');
  }

  // Tasks API
  async getTasks(completed?: boolean): Promise<Task[]> {
    const headers = await this.getAuthHeaders();
    const url =
      completed !== undefined
        ? `${API_URL}/api/tasks?completed=${completed}`
        : `${API_URL}/api/tasks`;
    const res = await fetch(url, { headers });

    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  }

  async deleteTask(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) throw new Error('Failed to delete task');
  }

  // Ideas API
  async getIdeas(): Promise<Idea[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/ideas`, { headers });

    if (!res.ok) throw new Error('Failed to fetch ideas');
    return res.json();
  }

  async createIdea(data: Partial<Idea>): Promise<Idea> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/ideas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to create idea');
    return res.json();
  }

  async updateIdea(id: string, data: Partial<Idea>): Promise<Idea> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/ideas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to update idea');
    return res.json();
  }

  async deleteIdea(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/ideas/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) throw new Error('Failed to delete idea');
  }

  // Habits API
  async getHabits(): Promise<Habit[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/habits`, { headers });

    if (!res.ok) throw new Error('Failed to fetch habits');
    return res.json();
  }

  async createHabit(data: Partial<Habit>): Promise<Habit> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to create habit');
    return res.json();
  }

  async updateHabit(id: string, data: Partial<Habit>): Promise<Habit> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/habits/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to update habit');
    return res.json();
  }

  async deleteHabit(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/habits/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) throw new Error('Failed to delete habit');
  }

  async completeHabit(id: string): Promise<Habit> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/habits/${id}/complete`, {
      method: 'POST',
      headers,
    });

    if (!res.ok) throw new Error('Failed to complete habit');
    return res.json();
  }

  // Snippets API
  async getSnippets(): Promise<Snippet[]> {
    const headers = await this.getAuthHeaders();
    const res = await this.requestWithRetries(`${API_URL}/api/snippets`, { headers });

    if (!res.ok) throw new Error('Failed to fetch snippets');
    return res.json();
  }

  async createSnippet(data: Partial<Snippet>): Promise<Snippet> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/snippets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create snippet');
    }
    return res.json();
  }

  async updateSnippet(id: string, data: Partial<Snippet>): Promise<Snippet> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/snippets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to update snippet');
    return res.json();
  }

  async deleteSnippet(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_URL}/api/snippets/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) throw new Error('Failed to delete snippet');
  }
}

export const apiService = new ApiService();
