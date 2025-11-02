'use client';

import { useState, useEffect } from 'react';
import { api, type NoteList } from '@/lib/api';
import { FileText, Plus, Calendar, Tag, FolderPlus, ArrowUpDown, ChevronDown, ChevronRight, Folder, Trash2, Edit2, Bookmark, Star, FolderOpen, Palette, Move } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

interface SidebarProps {
  currentNote: string | null;
  onNoteSelect: (name: string) => void;
  onCreateNote: () => void;
}

export default function Sidebar({ currentNote, onNoteSelect, onCreateNote }: SidebarProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<NoteList[]>([]);
  const [tags, setTags] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showTagsSection, setShowTagsSection] = useState(false);
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'modified' | 'created'>('name-asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedItem, setDraggedItem] = useState<{ type: 'note' | 'folder', name: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ 
    x: number, 
    y: number, 
    type: 'note' | 'folder', 
    name: string 
  } | null>(null);
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [folderColors, setFolderColors] = useState<{ [key: string]: string }>({});
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadProjects();
    
    // Load bookmarks and folder colors from localStorage
    const savedBookmarks = localStorage.getItem('bookmarkedItems');
    if (savedBookmarks) {
      setBookmarkedItems(new Set(JSON.parse(savedBookmarks)));
    }
    
    const savedColors = localStorage.getItem('folderColors');
    if (savedColors) {
      setFolderColors(JSON.parse(savedColors));
    }
    
    // Close context menu on click outside
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Reload when currentNote changes (new note created)
  useEffect(() => {
    if (currentNote) {
      loadData();
    }
  }, [currentNote]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const loadData = async () => {
    try {
      const [notesData, tagsData] = await Promise.all([
        api.getAllNotes(),
        api.getTags(),
      ]);
      setNotes(notesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const createDaily = async () => {
    try {
      const result = await api.createDailyNote();
      onNoteSelect(result.name);
      loadData();
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

  const createFolder = () => {
    setCreatingFolder(true);
    setNewFolderName('Neuer Ordner');
    // Expand all to show the new folder input
    const folders = new Set<string>();
    notes.forEach(note => {
      const parts = note.name.split('/');
      if (parts.length > 1) {
        folders.add(parts[0]);
      }
    });
    setExpandedFolders(folders);
  };

  const confirmCreateFolder = async () => {
    if (newFolderName.trim()) {
      const folderName = newFolderName.trim();
      // Create a folder by creating a note with folder prefix
      const noteName = `${folderName}/.gitkeep`;
      try {
        await api.createNote(noteName, '# Folder\n\nThis folder was created automatically.');
        await loadData();
        // Expand the new folder
        const newExpanded = new Set(expandedFolders);
        newExpanded.add(folderName);
        setExpandedFolders(newExpanded);
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    }
    setCreatingFolder(false);
    setNewFolderName('');
  };

  const cancelCreateFolder = () => {
    setCreatingFolder(false);
    setNewFolderName('');
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'note' | 'folder', name: string) => {
    setDraggedItem({ type, name });
    e.dataTransfer.effectAllowed = 'move';
    // Prevent text selection during drag
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Only update if different from current target
    if (dropTarget !== target) {
      setDropTarget(target);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear if we're leaving the actual target element
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    
    if (!currentTarget.contains(relatedTarget)) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) return;

    try {
      if (draggedItem.type === 'note') {
        // Move note to folder or root
        const note = notes.find(n => n.name === draggedItem.name);
        if (!note) return;

        const currentParts = draggedItem.name.split('/');
        const fileName = currentParts[currentParts.length - 1];
        const currentFolder = currentParts.length > 1 ? currentParts[0] : null;

        // Don't move if already in target location
        if (currentFolder === targetFolder) {
          setDraggedItem(null);
          setDropTarget(null);
          return;
        }

        const newName = targetFolder ? `${targetFolder}/${fileName}` : fileName;

        // Get the note content and update with new name
        const noteData = await api.getNote(draggedItem.name);
        await api.createNote(newName, noteData.content);
        await api.deleteNote(draggedItem.name);
        
        // Reload and select the moved note
        await loadData();
        onNoteSelect(newName);
      } else if (draggedItem.type === 'folder') {
        // Move all notes in folder
        const folderNotes = notes.filter(n => n.name.startsWith(draggedItem.name + '/'));
        
        for (const note of folderNotes) {
          const relativePath = note.name.substring(draggedItem.name.length + 1);
          const newName = targetFolder ? `${targetFolder}/${draggedItem.name}/${relativePath}` : `${draggedItem.name}/${relativePath}`;
          
          const noteData = await api.getNote(note.name);
          await api.createNote(newName, noteData.content);
          await api.deleteNote(note.name);
        }
        
        await loadData();
      }
    } catch (error) {
      console.error('Failed to move:', error);
      alert('Fehler beim Verschieben');
    } finally {
      setDraggedItem(null);
      setDropTarget(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Context Menu Handlers
  const handleContextMenu = (e: React.MouseEvent, type: 'note' | 'folder', name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, name });
  };

  const handleRename = () => {
    if (contextMenu) {
      setRenamingItem(contextMenu.name);
      setRenameValue(contextMenu.name.split('/').pop() || contextMenu.name);
      setContextMenu(null);
    }
  };

  const confirmRename = async () => {
    if (!renamingItem || !renameValue.trim()) {
      setRenamingItem(null);
      return;
    }

    try {
      const parts = renamingItem.split('/');
      const newName = parts.length > 1 
        ? [...parts.slice(0, -1), renameValue.trim()].join('/')
        : renameValue.trim();

      if (contextMenu?.type === 'note') {
        const noteData = await api.getNote(renamingItem);
        await api.createNote(newName, noteData.content);
        await api.deleteNote(renamingItem);
        onNoteSelect(newName);
      } else {
        // Rename folder - move all notes
        const folderNotes = notes.filter(n => n.name.startsWith(renamingItem + '/'));
        for (const note of folderNotes) {
          const relativePath = note.name.substring(renamingItem.length + 1);
          const newNoteName = `${newName}/${relativePath}`;
          const noteData = await api.getNote(note.name);
          await api.createNote(newNoteName, noteData.content);
          await api.deleteNote(note.name);
        }
      }
      
      await loadData();
    } catch (error) {
      console.error('Failed to rename:', error);
      alert('Fehler beim Umbenennen');
    } finally {
      setRenamingItem(null);
      setRenameValue('');
    }
  };

  const handleDelete = async () => {
    if (!contextMenu) return;

    const confirmMsg = contextMenu.type === 'folder'
      ? `Ordner "${contextMenu.name}" und alle Inhalte löschen?`
      : `Notiz "${contextMenu.name}" löschen?`;

    if (!confirm(confirmMsg)) {
      setContextMenu(null);
      return;
    }

    try {
      if (contextMenu.type === 'note') {
        await api.deleteNote(contextMenu.name);
        if (currentNote === contextMenu.name) {
          onNoteSelect(null as any);
        }
      } else {
        // Delete all notes in folder
        const folderNotes = notes.filter(n => n.name.startsWith(contextMenu.name + '/'));
        for (const note of folderNotes) {
          await api.deleteNote(note.name);
        }
      }
      
      await loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Fehler beim Löschen');
    } finally {
      setContextMenu(null);
    }
  };

  const toggleBookmark = () => {
    if (!contextMenu) return;
    
    const newBookmarks = new Set(bookmarkedItems);
    if (newBookmarks.has(contextMenu.name)) {
      newBookmarks.delete(contextMenu.name);
    } else {
      newBookmarks.add(contextMenu.name);
    }
    
    setBookmarkedItems(newBookmarks);
    localStorage.setItem('bookmarkedItems', JSON.stringify(Array.from(newBookmarks)));
    setContextMenu(null);
  };

  const setFolderColor = (color: string) => {
    if (!contextMenu || contextMenu.type !== 'folder') return;
    
    const newColors = { ...folderColors, [contextMenu.name]: color };
    setFolderColors(newColors);
    localStorage.setItem('folderColors', JSON.stringify(newColors));
    setContextMenu(null);
  };

  const assignProject = async (projectId: string) => {
    if (!contextMenu || contextMenu.type !== 'note') return;
    
    try {
      const noteData = await api.getNote(contextMenu.name);
      // Update frontmatter with project
      const lines = noteData.content.split('\n');
      let newContent = noteData.content;
      
      if (noteData.content.startsWith('---')) {
        // Has frontmatter
        const endIndex = lines.findIndex((line, idx) => idx > 0 && line.trim() === '---');
        if (endIndex > 0) {
          const frontmatter = lines.slice(1, endIndex);
          const projectLineIndex = frontmatter.findIndex(l => l.startsWith('project:'));
          
          if (projectLineIndex >= 0) {
            frontmatter[projectLineIndex] = `project: ${projectId}`;
          } else {
            frontmatter.push(`project: ${projectId}`);
          }
          
          newContent = ['---', ...frontmatter, '---', ...lines.slice(endIndex + 1)].join('\n');
        }
      } else {
        // No frontmatter
        newContent = `---\nproject: ${projectId}\n---\n\n${noteData.content}`;
      }
      
      await api.updateNote(contextMenu.name, newContent);
      await loadData();
    } catch (error) {
      console.error('Failed to assign project:', error);
    } finally {
      setContextMenu(null);
    }
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      // Collapse all
      setExpandedFolders(new Set());
    } else {
      // Expand all - get all unique folders
      const folders = new Set<string>();
      notes.forEach(note => {
        const parts = note.name.split('/');
        if (parts.length > 1) {
          folders.add(parts[0]);
        }
      });
      setExpandedFolders(folders);
    }
    setExpandAll(!expandAll);
  };

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  const sortNotes = (notesList: NoteList[]) => {
    const sorted = [...notesList];
    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'modified':
        return sorted.sort((a, b) => {
          const dateA = a.modified ? new Date(a.modified).getTime() : 0;
          const dateB = b.modified ? new Date(b.modified).getTime() : 0;
          return dateB - dateA; // newest first
        });
      case 'created':
        return sorted.sort((a, b) => {
          // Use modified as fallback if created doesn't exist
          const dateA = (a as any).created ? new Date((a as any).created).getTime() : (a.modified ? new Date(a.modified).getTime() : 0);
          const dateB = (b as any).created ? new Date((b as any).created).getTime() : (b.modified ? new Date(b.modified).getTime() : 0);
          return dateB - dateA; // newest first
        });
      default:
        return sorted;
    }
  };

  const filteredNotes = sortNotes(
    notes.filter((note: NoteList) =>
      // Filter out .gitkeep files
      !note.name.endsWith('.gitkeep') &&
      (note.name.toLowerCase().includes(filter.toLowerCase()) ||
      (note.title && note.title.toLowerCase().includes(filter.toLowerCase())))
    )
  );

  // Group notes by folder (supports nested folders)
  const groupedNotes: { [key: string]: NoteList[] } = {};
  const rootNotes: NoteList[] = [];
  
  // First, collect all folders (including empty ones with only .gitkeep)
  notes.forEach(note => {
    const parts = note.name.split('/');
    if (parts.length > 1) {
      // For nested folders, use the full path up to the file
      // e.g., "folder1/folder2/note.md" -> key is "folder1/folder2"
      const folderPath = parts.slice(0, -1).join('/');
      if (!groupedNotes[folderPath]) {
        groupedNotes[folderPath] = [];
      }
      // Only add non-.gitkeep files to the folder
      if (!note.name.endsWith('.gitkeep')) {
        groupedNotes[folderPath].push(note);
      }
    }
  });
  
  // Add filtered root notes
  filteredNotes.forEach(note => {
    const parts = note.name.split('/');
    if (parts.length === 1) {
      rootNotes.push(note);
    }
  });

  // Build a tree structure for folders
  const buildFolderTree = () => {
    const tree: { [key: string]: { children: string[], notes: NoteList[] } } = {};
    const allFolderPaths = new Set<string>();
    
    // First, collect all folder paths (including intermediate paths)
    Object.keys(groupedNotes).forEach(folderPath => {
      const parts = folderPath.split('/');
      // Add all intermediate paths
      for (let i = 1; i <= parts.length; i++) {
        const path = parts.slice(0, i).join('/');
        allFolderPaths.add(path);
      }
    });
    
    // Initialize tree structure for all paths
    allFolderPaths.forEach(path => {
      if (!tree[path]) {
        tree[path] = { 
          children: [], 
          notes: groupedNotes[path] || [] 
        };
      }
    });
    
    // Build parent-child relationships - only direct children
    allFolderPaths.forEach(folderPath => {
      const parts = folderPath.split('/');
      
      if (parts.length > 1) {
        // Has a parent - add ONLY to direct parent
        const parent = parts.slice(0, -1).join('/');
        if (tree[parent]) {
          // Only add if it's a direct child (not already in children)
          if (!tree[parent].children.includes(folderPath)) {
            tree[parent].children.push(folderPath);
          }
        }
      }
    });
    
    // Sort children alphabetically
    Object.values(tree).forEach(node => {
      node.children.sort((a, b) => {
        const aName = a.split('/').pop() || '';
        const bName = b.split('/').pop() || '';
        return aName.localeCompare(bName);
      });
    });
    
    return tree;
  };

  const folderTree = buildFolderTree();
  
  // Get top-level folders only
  const topLevelFolders = Object.keys(groupedNotes)
    .filter(path => !path.includes('/'))
    .sort();

  // Recursive folder rendering
  const renderFolder = (folderPath: string, level: number = 0) => {
    const folderName = folderPath.split('/').pop() || folderPath;
    const folderData = folderTree[folderPath];
    if (!folderData) return null;

    const isRenaming = renamingItem === folderPath;
    const isBookmarked = bookmarkedItems.has(folderPath);
    const folderColor = folderColors[folderPath];

    return (
      <div key={folderPath} className="mb-1" style={{ marginLeft: level > 0 ? `${level * 12}px` : '0px' }}>
        {/* Folder Header */}
        <div
          data-folder={folderPath}
          draggable={!isRenaming}
          onDragStart={(e) => !isRenaming && handleDragStart(e, 'folder', folderPath)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            if (draggedItem?.name !== folderPath) {
              handleDragOver(e, folderPath);
            }
          }}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            if (draggedItem?.name !== folderPath) {
              handleDrop(e, folderPath);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, 'folder', folderPath)}
          className={`relative ${draggedItem?.name === folderPath ? 'opacity-50' : ''}`}
        >
          {/* Drop indicator */}
          {dropTarget === folderPath && draggedItem?.name !== folderPath && (
            <div className="absolute inset-0 border-2 border-indigo-500 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-lg z-0" />
          )}
          
          {isRenaming ? (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-950 rounded-lg border-2 border-indigo-500">
              <Folder size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename();
                  else if (e.key === 'Escape') setRenamingItem(null);
                }}
                onBlur={confirmRename}
                autoFocus
                className="flex-1 bg-transparent text-sm font-medium text-indigo-900 dark:text-indigo-100 outline-none"
              />
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folderPath);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors relative z-10"
            >
              {expandedFolders.has(folderPath) ? (
                <ChevronDown size={14} className="flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="flex-shrink-0" />
              )}
              <Folder 
                size={14} 
                className="flex-shrink-0" 
                style={{ color: folderColor || 'rgb(107 114 128)' }}
              />
              {isBookmarked && <Star size={12} className="fill-yellow-500 text-yellow-500 flex-shrink-0" />}
              <span className="truncate">{folderName}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {folderData.notes.length}
              </span>
            </button>
          )}
        </div>

        {/* Folder Contents - only show if expanded */}
        {expandedFolders.has(folderPath) && (
          <div className="mt-1 space-y-1">
            {/* Child folders - recursive rendering */}
            {folderData.children.map(childPath => renderFolder(childPath, level + 1))}
            
            {/* Notes in this folder */}
            {folderData.notes.length === 0 && folderData.children.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 italic" style={{ marginLeft: `${(level + 1) * 12}px` }}>
                Empty folder
              </div>
            ) : (
              folderData.notes.map((note) => {
                const isNoteBookmarked = bookmarkedItems.has(note.name);
                const isRenaming = renamingItem === note.name;
                
                return isRenaming ? (
                  <div 
                    key={note.name}
                    style={{ marginLeft: `${(level + 1) * 12}px` }}
                    className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg border-2 border-indigo-500"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename();
                          else if (e.key === 'Escape') setRenamingItem(null);
                        }}
                        onBlur={confirmRename}
                        autoFocus
                        className="flex-1 bg-transparent text-sm font-medium text-indigo-900 dark:text-indigo-100 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    key={note.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'note', note.name)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onNoteSelect(note.name)}
                    onContextMenu={(e) => handleContextMenu(e, 'note', note.name)}
                    style={{ marginLeft: `${(level + 1) * 12}px` }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                      currentNote === note.name
                        ? 'bg-indigo-500 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                    } ${draggedItem?.name === note.name ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <FileText size={14} className="mt-0.5 flex-shrink-0" />
                      {isNoteBookmarked && <Star size={12} className="mt-0.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {note.title || note.name.split('/').pop()}
                        </div>
                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {note.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  currentNote === note.name
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Notes
        </h2>
        {/* Action Buttons - Icons only in one row */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateNote}
            title="New Note"
            className="flex-1 flex items-center justify-center p-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={createDaily}
            title="Daily Note"
            className="flex-1 flex items-center justify-center p-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Calendar size={18} />
          </button>
          <button
            onClick={createFolder}
            title="New Folder"
            className="flex-1 flex items-center justify-center p-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FolderPlus size={18} />
          </button>
        </div>
      </div>

      {/* Filter and Sort */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <input
          type="text"
          placeholder={t.notes.filterPlaceholder}
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        
        {/* Sort and Expand Buttons */}
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowUpDown size={14} />
              Sort
            </button>
            
            {showSortMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <button
                    onClick={() => { setSortBy('name-asc'); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${sortBy === 'name-asc' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    Name (A → Z)
                  </button>
                  <button
                    onClick={() => { setSortBy('name-desc'); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${sortBy === 'name-desc' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    Name (Z → A)
                  </button>
                  <button
                    onClick={() => { setSortBy('modified'); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${sortBy === 'modified' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    Modified Time
                  </button>
                  <button
                    onClick={() => { setSortBy('created'); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${sortBy === 'created' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : ''}`}
                  >
                    Created Time
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Expand/Collapse All */}
          <button
            onClick={toggleExpandAll}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {expandAll ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {expandAll ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div 
        className="flex-1 overflow-y-auto px-3 py-2 relative"
        onDragOver={(e) => {
          // Only trigger if we're not over a folder
          const target = e.target as HTMLElement;
          if (!target.closest('[data-folder]')) {
            handleDragOver(e, 'root');
          }
        }}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('[data-folder]')) {
            handleDrop(e, null);
          }
        }}
      >
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">{t.notes.loading}</div>
        ) : filteredNotes.length === 0 && !creatingFolder ? (
          <div className="text-center py-8 text-gray-500 text-sm">{t.notes.noNotes}</div>
        ) : (
          <div className="space-y-1">
            {/* New Folder Input */}
            {creatingFolder && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-950 rounded-lg border-2 border-indigo-500">
                <Folder size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmCreateFolder();
                    } else if (e.key === 'Escape') {
                      cancelCreateFolder();
                    }
                  }}
                  onBlur={confirmCreateFolder}
                  autoFocus
                  className="flex-1 bg-transparent text-sm font-medium text-indigo-900 dark:text-indigo-100 outline-none"
                />
              </div>
            )}
            
            {/* Root notes (no folder) */}
            {rootNotes.map((note) => {
              const isNoteBookmarked = bookmarkedItems.has(note.name);
              const isRenaming = renamingItem === note.name;
              
              return isRenaming ? (
                <div 
                  key={note.name}
                  className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg border-2 border-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmRename();
                        else if (e.key === 'Escape') setRenamingItem(null);
                      }}
                      onBlur={confirmRename}
                      autoFocus
                      className="flex-1 bg-transparent text-sm font-medium text-indigo-900 dark:text-indigo-100 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <button
                  key={note.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'note', note.name)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onNoteSelect(note.name)}
                  onContextMenu={(e) => handleContextMenu(e, 'note', note.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                    currentNote === note.name
                      ? 'bg-indigo-500 text-white'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                  } ${draggedItem?.name === note.name ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <FileText size={14} className="mt-0.5 flex-shrink-0" />
                    {isNoteBookmarked && <Star size={12} className="mt-0.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {note.title || note.name}
                      </div>
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {note.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                currentNote === note.name
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            
            {/* Folders - using recursive rendering */}
            {topLevelFolders.map(folder => renderFolder(folder))}
          </div>
        )}
      </div>

      {/* Tags Section - Collapsible */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowTagsSection(!showTagsSection)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Tag size={14} />
            {t.notes.tags}
          </div>
          <span className="text-xs text-gray-500">
            {showTagsSection ? '▼' : '▶'}
          </span>
        </button>
        {showTagsSection && (
          <div className="px-4 pb-4 max-h-32 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {Object.entries(tags)
                .slice(0, 20)
                .map(([tag, count]) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500"
                    title={`${count} notes`}
                  >
                    #{tag}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rename */}
          <button
            onClick={handleRename}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Edit2 size={14} />
            Umbenennen
          </button>

          {/* Bookmark */}
          <button
            onClick={toggleBookmark}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {bookmarkedItems.has(contextMenu.name) ? <Star size={14} className="fill-yellow-500 text-yellow-500" /> : <Bookmark size={14} />}
            {bookmarkedItems.has(contextMenu.name) ? 'Bookmark entfernen' : 'Bookmark hinzufügen'}
          </button>

          {/* Folder Color (only for folders) */}
          {contextMenu.type === 'folder' && (
            <div className="border-t border-gray-200 dark:border-gray-700 my-1">
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">Ordnerfarbe</div>
              <div className="px-4 pb-2 flex gap-2">
                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => (
                  <button
                    key={color}
                    onClick={() => setFolderColor(color)}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  onClick={() => setFolderColor('')}
                  className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:scale-110 transition-transform flex items-center justify-center text-xs"
                >
                  ✕
                  </button>
              </div>
            </div>
          )}

          {/* Assign Project (only for notes) */}
          {contextMenu.type === 'note' && projects.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 my-1">
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">Projekt zuweisen</div>
              <div className="max-h-32 overflow-y-auto">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => assignProject(project.id)}
                    className="w-full px-4 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    📁 {project.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
          >
            <Trash2 size={14} />
            Löschen
          </button>
        </div>
      )}
    </div>
  );
}
