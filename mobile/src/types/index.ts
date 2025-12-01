// Type definitions for Synora Mobile
export interface User {
  id: string;
  email: string;
  username: string;
  is_2fa_enabled: boolean;
  encryption_salt?: string;
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
  tags?: string;
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

export interface Snippet {
  id: string;
  title: string;
  content: string;
  language?: string;
  tags?: string;
  created_at: string;
  modified_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
