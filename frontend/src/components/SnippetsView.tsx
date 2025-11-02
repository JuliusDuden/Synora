'use client';

import { useState, useEffect, useRef } from 'react';
import { api, getSnippetsStorageKey } from '@/lib/api';
import { 
  Plus, Trash2, Pin, Check, X, List, CheckSquare, Code2, 
  Image as ImageIcon, Mic, Link2, Home, Search, Bell, 
  Clock, StopCircle, PlayCircle, Pause
} from 'lucide-react';

import { useTranslation } from '@/lib/useTranslation';

interface Snippet {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  items: SnippetItem[];
  created_at: string;
  modified_at: string;
  code?: {
    language: string;
    content: string;
  };
  images?: string[];
  links?: {
    url: string;
    title?: string;
    favicon?: string;
  }[];
  voiceNote?: {
    url: string;
    duration: number;
  };
  connections?: {
    type: 'note' | 'project';
    id: string;
    title: string;
  }[];
  pinnedToDashboard?: boolean;
  reminder?: {
    date: string;
    time?: string;
    notified?: boolean;
  };
}

interface SnippetItem {
  id: string;
  text: string;
  checked: boolean;
  isBullet?: boolean;
  isTextField?: boolean;
}

const COLORS = [
  { name: 'Default', value: 'bg-white dark:bg-gray-900', border: 'border-gray-200 dark:border-gray-800' },
  { name: 'Red', value: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-900' },
  { name: 'Orange', value: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-900' },
  { name: 'Yellow', value: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-900' },
  { name: 'Green', value: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-900' },
  { name: 'Blue', value: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-900' },
  { name: 'Purple', value: 'bg-purple-50 dark:bg-purple-950', border: 'border-purple-200 dark:border-purple-900' },
  { name: 'Pink', value: 'bg-pink-50 dark:bg-pink-950', border: 'border-pink-200 dark:border-pink-900' },
];

interface SnippetsViewProps {
  onNavigateToNote?: (notePath: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}


export default function SnippetsView({ onNavigateToNote, onNavigateToProject }: SnippetsViewProps) {
  const { t } = useTranslation();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Load snippets and setup reminder check
  useEffect(() => {
    loadSnippets();
  }, []);

  // Check reminders periodically
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      setSnippets(prevSnippets => {
        const updated = prevSnippets.map(snippet => {
          if (snippet.reminder && !snippet.reminder.notified) {
            const reminderDate = new Date(snippet.reminder.date);
            if (snippet.reminder.time) {
              const [hours, minutes] = snippet.reminder.time.split(':');
              reminderDate.setHours(parseInt(hours), parseInt(minutes));
            }
            
            if (reminderDate <= now) {
              // Show notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Snippet Erinnerung', {
                  body: snippet.title,
                  icon: '/icon.png'
                });
              }
              return { ...snippet, reminder: { ...snippet.reminder, notified: true } };
            }
          }
          return snippet;
        });
        
        // Only update if something changed
        if (JSON.stringify(updated) !== JSON.stringify(prevSnippets)) {
          localStorage.setItem('snippets', JSON.stringify(updated));
          return updated;
        }
        return prevSnippets;
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const loadSnippets = () => {
    // Try loading from server first (per-user). Fallback to localStorage on failure.
    (async () => {
      try {
        const serverSnippets = await api.getSnippets();
        if (serverSnippets && Array.isArray(serverSnippets)) {
          // Merge with any local-only snippets (created while offline or when create failed)
        const storageKey = getSnippetsStorageKey();
        const saved = localStorage.getItem(storageKey);
        const localSnippets = saved ? JSON.parse(saved) : [];
          const localOnly = (localSnippets || []).filter((s: any) => String(s.id).startsWith('local_'));
          // Keep local-only snippets that aren't present on server
          const serverIds = new Set(serverSnippets.map((s: any) => s.id));
          const merged = [...serverSnippets];
          for (const l of localOnly) {
            if (!serverIds.has(l.id)) merged.push(l);
          }
          setSnippets(merged);
          // Persist merged list locally as well (per-user key)
          localStorage.setItem(storageKey, JSON.stringify(merged));
        } else {
          const saved = localStorage.getItem('snippets');
          if (saved) setSnippets(JSON.parse(saved));
        }
      } catch (err) {
  const storageKey = getSnippetsStorageKey();
  const saved = localStorage.getItem(storageKey);
  if (saved) setSnippets(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    })();
  };

  const saveSnippets = (updatedSnippets: Snippet[]) => {
    // Save locally immediately
  const storageKey = getSnippetsStorageKey();
  localStorage.setItem(storageKey, JSON.stringify(updatedSnippets));
    setSnippets(updatedSnippets);
    // Try syncing to server in background
    (async () => {
      try {
        // For simplicity, send full list to server via create/update per item
        for (const s of updatedSnippets) {
          // If server snippet has an id format that is different, backend should return canonical id
          if (s.id && String(s.id).startsWith('local_')) {
            // create
            const created = await api.createSnippet(s).catch(() => null);
              if (created && created.id) {
              // replace local id with server id using latest state to avoid overwriting recent edits
              setSnippets(prev => {
                const replaced = prev.map(u => u.id === s.id ? { ...u, id: created.id } : u);
                try { localStorage.setItem(getSnippetsStorageKey(), JSON.stringify(replaced)); } catch (e) {}
                return replaced;
              });
            }
          } else {
            // attempt update
            await api.updateSnippet(s.id, s).catch(() => null);
          }
        }
      } catch (e) {
        // ignore background sync errors
        console.debug('Snippet sync failed', e);
      }
    })();
  };

  const createSnippet = (initialTitle: string, initialContent: string) => {
    const newSnippet: Snippet = {
      // mark local-created ids so we can sync later
      id: `local_${Date.now().toString()}`,
      title: initialTitle.trim() || 'Neue Notiz',
      content: initialContent,
      color: 'bg-white dark:bg-gray-900',
      pinned: false,
      items: [],
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };
    const updated = [...snippets, newSnippet];
    saveSnippets(updated);

    // Try creating on server (optimistic)
    (async () => {
      try {
        const created = await api.createSnippet(newSnippet);
          if (created && created.id) {
          // Replace by updating the current state to avoid clobbering edits that happened after creation
          setSnippets(prev => {
            const replaced = prev.map(u => u.id === newSnippet.id ? { ...u, id: created.id } : u);
            try { localStorage.setItem(getSnippetsStorageKey(), JSON.stringify(replaced)); } catch (e) {}
            return replaced;
          });
        }
      } catch (e) {
        // ignore
      }
    })();

    return newSnippet.id;
  };

  const updateSnippet = (id: string, updates: Partial<Snippet>) => {
    const updated = snippets.map(s =>
      s.id === id ? { ...s, ...updates, modified_at: new Date().toISOString() } : s
    );
    saveSnippets(updated);

    // Sync update to server (best-effort)
    (async () => {
      try {
        if (id.startsWith('local_')) return; // will be synced on create
        await api.updateSnippet(id, updates).catch(() => null);
      } catch (e) {
        // ignore
      }
    })();
  };

  const deleteSnippet = (id: string) => {
    if (!confirm('Diese Notiz wirklich löschen?')) return;
    const remaining = snippets.filter(s => s.id !== id);
    saveSnippets(remaining);

    // delete on server (best-effort)
    (async () => {
      try {
        if (!id.startsWith('local_')) {
          await api.deleteSnippet(id).catch(() => null);
        }
      } catch (e) {
        // ignore
      }
    })();
  };

  const togglePin = (id: string) => {
    const snippet = snippets.find(s => s.id === id);
    if (!snippet) return;
    updateSnippet(id, { pinned: !snippet.pinned });
  };

  const addItem = (snippetId: string, isBullet: boolean = false) => {
    const snippet = snippets.find(s => s.id === snippetId);
    if (!snippet) return;

    const newItem: SnippetItem = {
      id: Date.now().toString(),
      text: '',
      checked: false,
      isBullet: isBullet,
    };

    updateSnippet(snippetId, {
      items: [...snippet.items, newItem],
    });
  };

  const updateItem = (snippetId: string, itemId: string, updates: Partial<SnippetItem>) => {
    const snippet = snippets.find(s => s.id === snippetId);
    if (!snippet) return;

    const updatedItems = snippet.items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    updateSnippet(snippetId, { items: updatedItems });
  };

  const deleteItem = (snippetId: string, itemId: string) => {
    const snippet = snippets.find(s => s.id === snippetId);
    if (!snippet) return;

    updateSnippet(snippetId, {
      items: snippet.items.filter(item => item.id !== itemId),
    });
  };

  const clearItemsAndFocusContent = (snippetId: string, focusContent: () => void) => {
    updateSnippet(snippetId, { items: [] });
    setTimeout(() => {
      focusContent();
    }, 50);
  };

  // Filter snippets based on search query
  const filteredSnippets = searchQuery
    ? snippets.filter(snippet => {
        const searchLower = searchQuery.toLowerCase();
        return (
          snippet.title.toLowerCase().includes(searchLower) ||
          snippet.content.toLowerCase().includes(searchLower) ||
          snippet.items.some(item => item.text.toLowerCase().includes(searchLower)) ||
          snippet.code?.content.toLowerCase().includes(searchLower)
        );
      })
    : snippets;

  const pinnedSnippets = filteredSnippets.filter(s => s.pinned);
  const unpinnedSnippets = filteredSnippets.filter(s => !s.pinned);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Lade Snippets...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              Snippets
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {filteredSnippets.length} {filteredSnippets.length === 1 ? 'Notiz' : 'Notizen'}
              {searchQuery && ` gefunden für "${searchQuery}"`}
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
            >
              <Search size={20} />
            </button>
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Snippets durchsuchen..."
                className="absolute right-0 top-12 w-64 sm:w-80 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg focus:outline-none"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Masonry Layout - columns for automatic height distribution */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
          {/* Create New Snippet Card */}
          <div className="break-inside-avoid mb-3 sm:mb-4">
            <CreateSnippetCard onCreate={createSnippet} snippets={snippets} onUpdate={updateSnippet} />
          </div>
          
          {/* Pinned Snippets */}
          {pinnedSnippets.map(snippet => (
            <div key={snippet.id} className="break-inside-avoid mb-3 sm:mb-4">
              <SnippetCard
                snippet={snippet}
                snippets={snippets}
                onUpdate={updateSnippet}
                onDelete={deleteSnippet}
                onTogglePin={togglePin}
                onAddItem={addItem}
                onUpdateItem={updateItem}
                onDeleteItem={deleteItem}
                onClearItems={clearItemsAndFocusContent}
                onNavigateToNote={onNavigateToNote}
                onNavigateToProject={onNavigateToProject}
              />
            </div>
          ))}
          
          {/* Other Snippets */}
          {unpinnedSnippets.map(snippet => (
            <div key={snippet.id} className="break-inside-avoid mb-3 sm:mb-4">
              <SnippetCard
                snippet={snippet}
                snippets={snippets}
                onUpdate={updateSnippet}
                onDelete={deleteSnippet}
                onTogglePin={togglePin}
                onAddItem={addItem}
                onUpdateItem={updateItem}
                onDeleteItem={deleteItem}
                onClearItems={clearItemsAndFocusContent}
                onNavigateToNote={onNavigateToNote}
                onNavigateToProject={onNavigateToProject}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CreateSnippetCardProps {
  onCreate: (title: string, content: string) => string;
  snippets: Snippet[];
  onUpdate: (id: string, updates: Partial<Snippet>) => void;
}

function CreateSnippetCard({ onCreate, snippets, onUpdate }: CreateSnippetCardProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentSnippetId, setCurrentSnippetId] = useState<string | null>(null);

  useEffect(() => {
    if ((title.trim() || content.trim()) && !currentSnippetId) {
      const timer = setTimeout(() => {
        const newId = onCreate(title, content);
        setCurrentSnippetId(newId);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [title, content, currentSnippetId, onCreate]);

  useEffect(() => {
    if (currentSnippetId) {
      const snippet = snippets.find(s => s.id === currentSnippetId);
      if (snippet) {
        const newTitle = title.trim() || 'Neue Notiz';
        if (snippet.title !== newTitle || snippet.content !== content) {
          const timer = setTimeout(() => {
            onUpdate(currentSnippetId, { 
              title: newTitle, 
              content: content 
            });
          }, 300);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [title, content, currentSnippetId, snippets, onUpdate]);

  const handleNewNote = () => {
    setTitle('');
    setContent('');
    setCurrentSnippetId(null);
  };

  const shouldShowClean = currentSnippetId && snippets.find(s => s.id === currentSnippetId);

  if (shouldShowClean) {
    return (
      <div 
        onClick={handleNewNote}
        className="bg-white dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 shadow-sm hover:border-gray-400 dark:hover:border-gray-600 transition-all cursor-pointer flex items-center justify-center h-fit min-h-[8rem]"
      >
        <div className="text-center text-gray-400 dark:text-gray-600">
          <Plus size={32} className="mx-auto mb-2" />
          <p className="text-sm font-medium">Neue Notiz</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 shadow-sm hover:border-gray-400 dark:hover:border-gray-600 transition-all h-fit">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel..."
        className="w-full mb-3 text-base font-semibold bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Notiz erstellen..."
        rows={3}
        className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none resize-none border-none"
      />

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            title="Checkliste"
          >
            <CheckSquare size={18} />
          </button>
        </div>

        {(title.trim() || content.trim()) && (
          <span className="text-xs text-gray-400 dark:text-gray-600">
            Wird gespeichert...
          </span>
        )}
      </div>
    </div>
  );
}

interface SnippetCardProps {
  snippet: Snippet;
  snippets: Snippet[];
  onUpdate: (id: string, updates: Partial<Snippet>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onAddItem: (snippetId: string, isBullet?: boolean) => void;
  onUpdateItem: (snippetId: string, itemId: string, updates: Partial<SnippetItem>) => void;
  onDeleteItem: (snippetId: string, itemId: string) => void;
  onClearItems: (snippetId: string, focusContent: () => void) => void;
  onNavigateToNote?: (notePath: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

function SnippetCard({
  snippet,
  snippets,
  onUpdate,
  onDelete,
  onTogglePin,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onClearItems,
  onNavigateToNote,
  onNavigateToProject,
}: SnippetCardProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(snippet.title);
  const [content, setContent] = useState(snippet.content);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showConnectionsDialog, setShowConnectionsDialog] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeContent, setCodeContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [connectionType, setConnectionType] = useState<'note' | 'project'>('note');
  const [connectionId, setConnectionId] = useState('');
  const [availableNotes, setAvailableNotes] = useState<any[]>([]);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  
  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(snippet.title);
    setContent(snippet.content);
  }, [snippet.title, snippet.content]);

  // Ensure textarea height matches content on mount and when content changes
  useEffect(() => {
    const ta = contentTextareaRef.current;
    if (ta) {
      // Reset to auto to correctly measure scrollHeight
      ta.style.height = 'auto';
      // Add a small timeout to ensure DOM has updated when called during mount
      setTimeout(() => {
        try {
          ta.style.height = ta.scrollHeight + 'px';
        } catch (e) {
          // ignore
        }
      }, 0);
    }
  }, [content]);

  const colorObj = COLORS.find(c => c.value === snippet.color) || COLORS[0];

  const handleTitleSave = () => {
    if (title.trim()) {
      onUpdate(snippet.id, { title: title.trim() });
    }
    setEditingTitle(false);
  };

  const handleContentSave = () => {
    if (content !== snippet.content) {
      onUpdate(snippet.id, { content });
    }
  };

  const changeColor = (color: string) => {
    onUpdate(snippet.id, { color });
    setShowColorPicker(false);
  };

  const focusContentTextarea = () => {
    if (contentTextareaRef.current) {
      contentTextareaRef.current.focus();
      const len = contentTextareaRef.current.value.length;
      contentTextareaRef.current.setSelectionRange(len, len);
    }
  };

  const handleAddCode = () => {
    if (codeContent.trim()) {
      onUpdate(snippet.id, { 
        code: { 
          language: codeLanguage, 
          content: codeContent 
        } 
      });
      setCodeContent('');
      setShowCodeDialog(false);
    }
  };

  // Bullet symbols for nested levels (larger / different shapes for clarity)
  const BULLET_SYMBOLS = ['●', '○', '◦', '•'];
  const getBulletForIndent = (indentStr: string) => {
    // count tabs for indent level
    const tabs = (indentStr.match(/\t/g) || []).length;
    const level = Math.max(0, tabs);
    return BULLET_SYMBOLS[Math.min(level, BULLET_SYMBOLS.length - 1)];
  };

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      try {
        const url = new URL(linkUrl);
        const favicon = `${url.origin}/favicon.ico`;
        
        const newLink = { 
          url: linkUrl.trim(),
          favicon: favicon,
          title: url.hostname
        };
        
        const existingLinks = snippet.links || [];
        onUpdate(snippet.id, { 
          links: [...existingLinks, newLink] 
        });
        setLinkUrl('');
        setShowLinkDialog(false);
      } catch (error) {
        alert('Bitte geben Sie eine gültige URL ein');
      }
    }
  };

  const handleSetReminder = () => {
    if (reminderDate) {
      onUpdate(snippet.id, { 
        reminder: { 
          date: reminderDate, 
          time: reminderTime || undefined,
          notified: false
        } 
      });
      setReminderDate('');
      setReminderTime('');
      setShowReminderDialog(false);
    }
  };

  const handleAddConnection = async () => {
    if (connectionId) {
      let targetTitle = '';
      
      if (connectionType === 'note') {
        const targetNote = availableNotes.find(n => n.path === connectionId);
        targetTitle = targetNote?.title || targetNote?.name || connectionId;
      } else if (connectionType === 'project') {
        const targetProject = availableProjects.find(p => p.id === connectionId);
        targetTitle = targetProject?.name || connectionId;
      }
      
      const newConnection = {
        type: connectionType,
        id: connectionId,
        title: targetTitle
      };
      
      const existingConnections = snippet.connections || [];
      onUpdate(snippet.id, { 
        connections: [...existingConnections, newConnection] 
      });
      setConnectionId('');
      setShowConnectionsDialog(false);
    }
  };

  // Load notes and projects when dialog opens
  useEffect(() => {
    if (showConnectionsDialog && !loadingConnections) {
      setLoadingConnections(true);
      
      // Dynamically import api
      import('@/lib/api').then(({ api }) => {
        Promise.all([
          api.getAllNotes().catch(() => []),
          api.getProjects().catch(() => [])
        ]).then(([notes, projects]) => {
          setAvailableNotes(notes);
          setAvailableProjects(projects);
          setLoadingConnections(false);
        });
      });
    }
  }, [showConnectionsDialog]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const existingImages = snippet.images || [];
        onUpdate(snippet.id, { 
          images: [...existingImages, base64] 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onUpdate(snippet.id, { 
            voiceNote: { 
              url: base64,
              duration: 0
            } 
          });
        };
        
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Mikrofon-Zugriff verweigert');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className={`${colorObj.value} rounded-lg border ${colorObj.border} p-3 sm:p-4 shadow-sm hover:shadow-md transition-all relative group h-fit`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex-1 mr-2">
          {editingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitle(snippet.title);
                  setEditingTitle(false);
                }
              }}
              className="flex-1 text-sm sm:text-base font-semibold bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-gray-900 dark:focus:border-white text-gray-900 dark:text-white w-full"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              onClick={(e) => {
                e.stopPropagation();
                setEditingTitle(true);
              }}
              className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white cursor-pointer hover:opacity-70"
            >
              {snippet.title}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <p className="text-xs text-gray-400 dark:text-gray-600 whitespace-nowrap">
            {new Date(snippet.modified_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
            })}
          </p>
          
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(snippet.id);
              }}
              className={`p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
                snippet.pinned ? 'text-gray-900 dark:text-white' : 'text-gray-400'
              }`}
            >
              <Pin size={14} className="sm:w-4 sm:h-4" fill={snippet.pinned ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(snippet.id);
              }}
              className="p-1 sm:p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-950 transition-colors text-gray-400 hover:text-red-500"
            >
              <Trash2 size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Always visible */}
      <div className="space-y-3">
        {/* Text Content - Always visible with smart Enter handling */}
        <textarea
          ref={contentTextareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={(e) => {
            // Handle Tab / Shift+Tab to indent/outdent without leaving the textarea
            if (e.key === 'Tab') {
              e.preventDefault();
              e.stopPropagation();
              const textarea = e.currentTarget as HTMLTextAreaElement;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const value = content || '';

              const lineStart = value.lastIndexOf('\n', start - 1) + 1;
              const lineEndIdx = value.indexOf('\n', end);
              const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

              const block = value.slice(lineStart, lineEnd);
              const lines = block.split('\n');

              if (e.shiftKey) {
                // Outdent
                const removedLens: number[] = [];
                const newLines = lines.map(l => {
                  if (l.startsWith('\t')) {
                    removedLens.push(1);
                    return l.slice(1);
                  }
                  if (l.startsWith('  ')) {
                    removedLens.push(2);
                    return l.slice(2);
                  }
                  if (l.startsWith(' ')) {
                    removedLens.push(1);
                    return l.slice(1);
                  }
                  removedLens.push(0);
                  return l;
                });

                const newBlock = newLines.join('\n');
                const before = value.slice(0, lineStart);
                const after = value.slice(lineEnd);
                const newValue = before + newBlock + after;
                setContent(newValue);
                try { textarea.focus(); } catch (err) {}

                const relStart = start - lineStart;
                const relEnd = end - lineStart;
                const prefixesBeforeStart = block.slice(0, relStart).split('\n').length;
                const prefixesBeforeEnd = block.slice(0, relEnd).split('\n').length;
                const removedBeforeStart = removedLens.slice(0, prefixesBeforeStart).reduce((a, b) => a + b, 0);
                const removedBeforeEnd = removedLens.slice(0, prefixesBeforeEnd).reduce((a, b) => a + b, 0);

                setTimeout(() => {
                  try {
                    textarea.selectionStart = Math.max(lineStart, start - removedBeforeStart);
                    textarea.selectionEnd = Math.max(lineStart, end - removedBeforeEnd);
                    textarea.focus();
                  } catch (err) {}
                }, 0);
              } else {
                // Indent using a real tab character so indent level maps to bullet types
                const prefix = '\t';
                const newLines = lines.map(l => prefix + l);
                const newBlock = newLines.join('\n');
                const before = value.slice(0, lineStart);
                const after = value.slice(lineEnd);
                const newValue = before + newBlock + after;
                setContent(newValue);
                try { textarea.focus(); } catch (err) {}

                const relStart = start - lineStart;
                const relEnd = end - lineStart;
                const prefixesBeforeStart = block.slice(0, relStart).split('\n').length;
                const prefixesBeforeEnd = block.slice(0, relEnd).split('\n').length;
                const deltaStart = prefixesBeforeStart * prefix.length;
                const deltaEnd = prefixesBeforeEnd * prefix.length;

                setTimeout(() => {
                  try {
                    textarea.selectionStart = start + deltaStart;
                    textarea.selectionEnd = end + deltaEnd;
                    textarea.focus();
                  } catch (err) {}
                }, 0);
              }

              return;
            }
            if (e.key === 'Enter') {
              const textarea = e.currentTarget;
              const cursorPos = textarea.selectionStart;
              const textBeforeCursor = content.substring(0, cursorPos);
              const textAfterCursor = content.substring(cursorPos);
              const lines = textBeforeCursor.split('\n');
              const currentLine = lines[lines.length - 1];
              
                // Check if current line starts with bullet or checkbox
              // Match any of our bullet symbols e.g. '●', '○', '◦', '•'
              const bulletMatch = currentLine.match(/^(\s*)([●○◦•])\s*(.*)$/);
              const checkboxMatch = currentLine.match(/^(\s*)[☐☑]\s*(.*)$/);
              
              if (bulletMatch) {
                const [, indent, bulletChar, lineContent] = bulletMatch;
                if (lineContent.trim() === '') {
                  // Empty bullet line - remove bullet and go to normal text
                  e.preventDefault();
                  // Remove the bullet symbol regardless of which one it was
                  const newContent = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('\n') + 1) + 
                                    textBeforeCursor.substring(textBeforeCursor.lastIndexOf('\n') + 1).replace(/^\s*[●○◦•]\s*/, '') + 
                                    '\n' + textAfterCursor;
                  setContent(newContent);
                  setTimeout(() => {
                    const newPos = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('\n') + 1).length + 
                                   textBeforeCursor.substring(textBeforeCursor.lastIndexOf('\n') + 1).replace(/^\s*[●○◦•]\s*/, '').length + 1;
                    textarea.selectionStart = textarea.selectionEnd = newPos;
                  }, 0);
                } else {
                  // Has content - create new bullet
                  e.preventDefault();
                  const bullet = getBulletForIndent(indent);
                  const newContent = textBeforeCursor + '\n' + indent + bullet + ' ' + textAfterCursor;
                  setContent(newContent);
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = cursorPos + indent.length + bullet.length + 2;
                  }, 0);
                }
              } else if (checkboxMatch) {
                const [, indent, lineContent] = checkboxMatch;
                if (lineContent.trim() === '') {
                  // Empty checkbox line - remove checkbox and go to normal text
                  e.preventDefault();
                  const newContent = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('\n') + 1) + 
                                    textBeforeCursor.substring(textBeforeCursor.lastIndexOf('\n') + 1).replace(/^\s*[☐☑]\s*/, '') + 
                                    '\n' + textAfterCursor;
                  setContent(newContent);
                  setTimeout(() => {
                    const newPos = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('\n') + 1).length + 
                                   textBeforeCursor.substring(textBeforeCursor.lastIndexOf('\n') + 1).replace(/^\s*[☐☑]\s*/, '').length + 1;
                    textarea.selectionStart = textarea.selectionEnd = newPos;
                  }, 0);
                } else {
                  // Has content - create new checkbox (keep checkbox symbol)
                  e.preventDefault();
                  const newContent = textBeforeCursor + '\n' + indent + '☐ ' + textAfterCursor;
                  setContent(newContent);
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = cursorPos + indent.length + 2; // '☐ ' is 2 chars
                  }, 0);
                }
              }
            }
          }}
          onClick={(e) => {
            // Handle checkbox toggle on click
            const textarea = e.currentTarget;
            const clickPos = textarea.selectionStart;
            const lines = content.split('\n');
            let charCount = 0;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const lineStart = charCount;
              const lineEnd = charCount + line.length;
              
              if (clickPos >= lineStart && clickPos <= lineEnd) {
                // Check if clicked on checkbox symbol
                const uncheckedMatch = line.match(/^(\s*)☐/);
                const checkedMatch = line.match(/^(\s*)☑/);
                const clickPosInLine = clickPos - lineStart;
                
                if (uncheckedMatch && clickPosInLine <= uncheckedMatch[1].length + 1) {
                  // Toggle to checked
                  const newLines = [...lines];
                  newLines[i] = line.replace('☐', '☑');
                  setContent(newLines.join('\n'));
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = clickPos;
                  }, 0);
                  return;
                } else if (checkedMatch && clickPosInLine <= checkedMatch[1].length + 1) {
                  // Toggle to unchecked
                  const newLines = [...lines];
                  newLines[i] = line.replace('☑', '☐');
                  setContent(newLines.join('\n'));
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = clickPos;
                  }, 0);
                  return;
                }
                break;
              }
              charCount += line.length + 1; // +1 for newline
            }
          }}
          onBlur={handleContentSave}
          placeholder="Notiz eingeben..."
          rows={1}
          className="w-full bg-transparent text-xs sm:text-sm text-gray-700 dark:text-gray-300 focus:outline-none resize-none overflow-hidden"
          style={{ minHeight: '50px', whiteSpace: 'pre-wrap' }}
        />

        {/* Code Snippet Display */}
        {snippet.code && (
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2 sm:p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-mono">{snippet.code.language}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(snippet.id, { code: undefined });
                }}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <X size={12} className="sm:w-3 sm:h-3" />
              </button>
            </div>
            <pre className="text-[10px] sm:text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">
              <code>{snippet.code.content}</code>
            </pre>
          </div>
        )}

        {/* Images Display */}
        {snippet.images && snippet.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {snippet.images.map((img, idx) => (
              <div key={idx} className="relative group/img">
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newImages = snippet.images?.filter((_, i) => i !== idx);
                    onUpdate(snippet.id, { images: newImages });
                  }}
                  className="absolute top-1 right-1 p-1 rounded bg-white dark:bg-gray-900 opacity-0 group-hover/img:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Rest of the content displays... */}
        {/* Voice Note Display */}
        {snippet.voiceNote && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <button
              onClick={togglePlayback}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {isPlaying ? <Pause size={16} /> : <PlayCircle size={16} />}
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">Voice Note</span>
            <audio ref={audioRef} src={snippet.voiceNote.url} onEnded={() => setIsPlaying(false)} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(snippet.id, { voiceNote: undefined });
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Links Display */}
        {snippet.links && snippet.links.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            {snippet.links.map((link, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group/link"
              >
                {link.favicon && (
                  <img src={link.favicon} alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {link.title || link.url}
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newLinks = snippet.links?.filter((_, i) => i !== idx);
                    onUpdate(snippet.id, { links: newLinks });
                  }}
                  className="opacity-0 group-hover/link:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-0.5"
                >
                  <X size={10} className="sm:w-3 sm:h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Connections Display */}
        {snippet.connections && snippet.connections.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {snippet.connections.map((conn, idx) => (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to the connected note/project
                  if (conn.type === 'note' && onNavigateToNote) {
                    onNavigateToNote(conn.id);
                  } else if (conn.type === 'project' && onNavigateToProject) {
                    onNavigateToProject(conn.id);
                  }
                }}
                className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Link2 size={8} className="sm:w-2.5 sm:h-2.5" />
                <span className="font-medium">{conn.type === 'note' ? '📝' : '📁'}</span>
                {conn.title}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newConns = snippet.connections?.filter((_, i) => i !== idx);
                    onUpdate(snippet.id, { connections: newConns });
                  }}
                  className="ml-0.5 sm:ml-1 text-gray-400 hover:text-red-500"
                >
                  <X size={8} className="sm:w-2.5 sm:h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Reminder Display */}
        {snippet.reminder && (
          <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900">
            <Bell size={10} className="sm:w-3 sm:h-3 text-yellow-600 dark:text-yellow-400" />
            <span className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-300">
              {new Date(snippet.reminder.date).toLocaleDateString('de-DE')} 
              {snippet.reminder.time && ` um ${snippet.reminder.time}`}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(snippet.id, { reminder: undefined });
              }}
              className="ml-auto text-yellow-600 dark:text-yellow-400 hover:text-red-500 p-0.5"
            >
              <X size={10} className="sm:w-3 sm:h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Insert checkbox at cursor position or start of current line
              const textarea = contentTextareaRef.current;
              if (textarea) {
                const cursorPos = textarea.selectionStart;
                const textBefore = content.substring(0, cursorPos);
                const textAfter = content.substring(cursorPos);
                const lastNewline = textBefore.lastIndexOf('\n');
                const currentLineStart = lastNewline + 1;
                const beforeLine = content.substring(0, currentLineStart);
                const afterLine = content.substring(currentLineStart);
                
                // Add checkbox at start of current line if empty, or create new line
                if (cursorPos === currentLineStart || textBefore.endsWith('\n')) {
                  setContent(beforeLine + '☐ ' + afterLine);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = textarea.selectionEnd = currentLineStart + 2;
                  }, 0);
                } else {
                  setContent(textBefore + '\n☐ ' + textAfter);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = textarea.selectionEnd = cursorPos + 3;
                  }, 0);
                }
              }
            }}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            title="Checkbox hinzufügen"
          >
            <CheckSquare size={14} className="sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Insert bullet at cursor position or start of current line using same indent/bullet logic as Enter
              const textarea = contentTextareaRef.current;
              if (textarea) {
                const cursorPos = textarea.selectionStart;
                const textBefore = (content || '').substring(0, cursorPos);
                const textAfter = (content || '').substring(cursorPos);
                const lastNewline = textBefore.lastIndexOf('\n');
                const currentLineStart = lastNewline + 1;
                const beforeLine = (content || '').substring(0, currentLineStart);
                const afterLine = (content || '').substring(currentLineStart);

                // Determine existing leading whitespace on the current line so we keep the same indent
                const currentLineEndIdx = ((content || '').indexOf('\n', currentLineStart) === -1) ? (content || '').length : (content || '').indexOf('\n', currentLineStart);
                const currentLineFull = (content || '').substring(currentLineStart, currentLineEndIdx);
                const indentMatch = currentLineFull.match(/^(\s*)/);
                const existingIndent = indentMatch ? indentMatch[1] : '';
                const bullet = getBulletForIndent(existingIndent);

                // Add bullet at start of current line if cursor is at line start or after a newline, else create new line
                if (cursorPos === currentLineStart || textBefore.endsWith('\n')) {
                  // Replace any leading whitespace of the line with the same indent + bullet
                  const restOfLine = afterLine.substring(existingIndent.length);
                  setContent(beforeLine + existingIndent + bullet + ' ' + restOfLine);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = textarea.selectionEnd = currentLineStart + existingIndent.length + bullet.length + 2;
                  }, 0);
                } else {
                  setContent(textBefore + '\n' + existingIndent + bullet + ' ' + textAfter);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = textarea.selectionEnd = cursorPos + existingIndent.length + bullet.length + 2;
                  }, 0);
                }
              }
            }}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            title="Stichpunkt hinzufügen"
          >
            <List size={14} className="sm:w-4 sm:h-4" />
          </button>
          
          {/* Rest der Buttons - Code bleibt gleich */}
          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
              title="Farbe ändern"
            >
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-gray-400 dark:border-gray-600" style={{ backgroundColor: 'currentColor' }} />
            </button>
            
            {showColorPicker && (
              <div
                className="absolute left-0 bottom-full mb-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap gap-1.5 sm:gap-2 w-28 sm:w-32">
                  {COLORS.map(color => (
                    <button
                      key={color.name}
                      onClick={() => changeColor(color.value)}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${color.value} border-2 ${
                        color.value === snippet.color
                          ? 'border-gray-900 dark:border-white'
                          : 'border-gray-300 dark:border-gray-700'
                      } hover:scale-110 transition-transform`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Code Snippet */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCodeDialog(true);
            }}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            title="Code-Snippet"
          >
            <Code2 size={14} className="sm:w-4 sm:h-4" />
          </button>

          {/* Image Upload */}
          <label
            className="p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 cursor-pointer inline-flex items-center"
            title="Bild hinzufügen"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageIcon size={14} className="sm:w-4 sm:h-4" />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
            />
          </label>

          {/* Voice Note */}
          {!snippet.voiceNote && !isRecording && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startRecording();
              }}
              className="p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
              title="Voice Note aufnehmen"
            >
              <Mic size={14} className="sm:w-4 sm:h-4" />
            </button>
          )}
          
          {isRecording && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopRecording();
              }}
              className="p-1 sm:p-1.5 rounded bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 animate-pulse"
              title="Aufnahme stoppen"
            >
              <StopCircle size={14} className="sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Connections */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConnectionsDialog(true);
            }}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            title="Verknüpfung"
          >
            <Link2 size={14} className="sm:w-4 sm:h-4" />
          </button>

          {/* Pin to Dashboard */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(snippet.id, { pinnedToDashboard: !snippet.pinnedToDashboard });
            }}
            className={`p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
              snippet.pinnedToDashboard ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
            title="An Dashboard heften"
          >
            <Home size={14} className="sm:w-4 sm:h-4" fill={snippet.pinnedToDashboard ? 'currentColor' : 'none'} />
          </button>

          {/* Reminder */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReminderDialog(true);
            }}
            className={`p-1 sm:p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
              snippet.reminder ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Erinnerung"
          >
            <Bell size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Dialogs - Alle bleiben gleich */}
      {showCodeDialog && (
        <Dialog onClose={() => setShowCodeDialog(false)}>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Code-Snippet hinzufügen</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sprache</label>
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
                <option value="cpp">C++</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code</label>
              <textarea
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                placeholder="// Dein Code hier..."
                rows={10}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <DialogActions onCancel={() => setShowCodeDialog(false)} onConfirm={handleAddCode} />
          </div>
        </Dialog>
      )}

      {/* Rest der Dialogs bleiben gleich... */}
      {showLinkDialog && (
        <Dialog onClose={() => setShowLinkDialog(false)}>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Link hinzufügen</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <DialogActions onCancel={() => setShowLinkDialog(false)} onConfirm={handleAddLink} />
          </div>
        </Dialog>
      )}

      {showReminderDialog && (
        <Dialog onClose={() => setShowReminderDialog(false)}>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Erinnerung setzen</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Datum</label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Uhrzeit (optional)</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <DialogActions onCancel={() => setShowReminderDialog(false)} onConfirm={handleSetReminder} />
          </div>
        </Dialog>
      )}

      {showConnectionsDialog && (
        <Dialog onClose={() => {
          setShowConnectionsDialog(false);
          setConnectionId('');
          setConnectionType('note');
        }}>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Verknüpfung hinzufügen</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typ</label>
              <select
                value={connectionType}
                onChange={(e) => {
                  setConnectionType(e.target.value as 'note' | 'project');
                  setConnectionId('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="note">Notiz</option>
                <option value="project">Projekt</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {connectionType === 'note' ? 'Notiz auswählen' : 'Projekt auswählen'}
              </label>
              {loadingConnections ? (
                <div className="w-full px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                  Lade {connectionType === 'note' ? 'Notizen' : 'Projekte'}...
                </div>
              ) : (
                <select
                  value={connectionId}
                  onChange={(e) => setConnectionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {connectionType === 'note' ? 'Wähle eine Notiz...' : 'Wähle ein Projekt...'}
                  </option>
                  {connectionType === 'note' ? (
                    availableNotes.map(note => (
                      <option key={note.path} value={note.path}>
                        {note.title || note.name}
                      </option>
                    ))
                  ) : (
                    availableProjects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
            <DialogActions 
              onCancel={() => {
                setShowConnectionsDialog(false);
                setConnectionId('');
                setConnectionType('note');
              }} 
              onConfirm={handleAddConnection} 
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}

// Dialog Component
interface DialogProps {
  children: React.ReactNode;
  onClose: () => void;
}

function Dialog({ children, onClose }: DialogProps) {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Dialog Actions Component
interface DialogActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
}

function DialogActions({ onCancel, onConfirm }: DialogActionsProps) {
  return (
    <div className="flex gap-2 justify-end pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-800 mt-4 sm:mt-6">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Abbrechen
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
      >
        Hinzufügen
      </button>
    </div>
  );
}