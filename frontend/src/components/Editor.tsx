'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { api, uploadAttachment, type Note } from '@/lib/api';
import MarkdownPreview from './MarkdownPreview';
import StatusBar from './StatusBar';
import FileInfoModal from './FileInfoModal';
import { useTranslation } from '@/lib/useTranslation';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface EditorProps {
  noteName: string | null;
  onNoteChange: (name: string) => void;
  onNoteDeleted?: () => void;
}

export default function Editor({ noteName, onNoteChange, onNoteDeleted }: EditorProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<'markdown' | 'wysiwyg' | 'reading'>('markdown');
  const [isDark, setIsDark] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [backlinksCount, setBacklinksCount] = useState(0);
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial dark mode check
    setIsDark(document.documentElement.classList.contains('dark'));

    // Load projects from API
    loadProjects();

    // Listen for dark mode changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  useEffect(() => {
    if (noteName) {
      loadNote(noteName);
    } else {
      setNote(null);
      setContent('');
      setBacklinksCount(0);
    }
  }, [noteName]);

  // Auto-save when content changes (after 2 seconds of inactivity)
  useEffect(() => {
    if (!noteName || !note) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content]);

  const loadNote = async (name: string) => {
    setLoading(true);
    try {
      const data = await api.getNote(name);
      setNote(data);
      
      // Only show the content WITHOUT frontmatter in editor
      // Frontmatter is managed through the sidebar (title, tags, project)
      let cleanContent = data.content;
      
      // Remove frontmatter if present (for display only)
      if (cleanContent.startsWith('---')) {
        const lines = cleanContent.split('\n');
        let endIndex = lines.findIndex((line, idx) => idx > 0 && line.trim() === '---');
        if (endIndex > 0) {
          // Remove frontmatter and leading empty lines
          cleanContent = lines.slice(endIndex + 1).join('\n').trimStart();
        }
      }
      
      setContent(cleanContent);
      setNewTitle(data.metadata.title || name);
      setSelectedProject(data.metadata.project || '');
      setEditingTitle(false);
      setBacklinksCount(data.backlinks?.length || 0);
    } catch (error) {
      console.error('Failed to load note:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!noteName || !note || saving) return;

    setSaving(true);
    try {
      // Reconstruct full content with frontmatter before saving
      const frontmatterLines = ['---'];
      if (newTitle) frontmatterLines.push(`title: ${newTitle}`);
      if (note.metadata.tags && note.metadata.tags.length > 0) {
        frontmatterLines.push(`tags: [${note.metadata.tags.join(', ')}]`);
      }
      // Only add project line if selectedProject is not empty
      if (selectedProject && selectedProject.trim() !== '') {
        frontmatterLines.push(`project: ${selectedProject}`);
      }
      frontmatterLines.push('---', '');
      
      const fullContent = frontmatterLines.join('\n') + content;
      
      // Get current content from editor
      await api.updateNote(noteName, fullContent);
      // Don't reload immediately to avoid losing cursor position
      // await loadNote(noteName);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = async () => {
    if (!noteName || !newTitle.trim()) return;

    try {
      // Update frontmatter with new title
      const updatedContent = content.startsWith('---') 
        ? content.replace(/(title:\s*).*/i, `$1${newTitle}`)
        : `---\ntitle: ${newTitle}\n---\n\n${content}`;
      
      await api.updateNote(noteName, updatedContent);
      await loadNote(noteName);
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const updateProject = async (projectId: string) => {
    if (!noteName || !note) return;

    setSelectedProject(projectId);

    try {
      // Build frontmatter with updated project
      const frontmatterLines = ['---'];
      frontmatterLines.push(`title: ${note.metadata.title || noteName}`);
      // Only add project line if projectId is not empty
      if (projectId && projectId.trim() !== '') {
        frontmatterLines.push(`project: ${projectId}`);
      }
      // If projectId is empty, we simply don't add the project line (removes it)
      if (note.metadata.tags && note.metadata.tags.length > 0) {
        frontmatterLines.push(`tags: ${note.metadata.tags.join(', ')}`);
      }
      frontmatterLines.push('---');
      
      const fullContent = frontmatterLines.join('\n') + '\n\n' + content;
      
      await api.updateNote(noteName, fullContent);
      // Don't reload the note to avoid UI reset
    } catch (error) {
      console.error('Failed to update project:', error);
      // Revert on error
      setSelectedProject(note.metadata.project || '');
    }
  };

  const deleteNote = async () => {
    if (!noteName) return;

    const confirmDelete = window.confirm(`Möchten Sie die Notiz "${note?.metadata.title || noteName}" wirklich löschen?`);
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await api.deleteNote(noteName);
      // Notify parent component that note was deleted
      if (onNoteDeleted) {
        onNoteDeleted();
      }
      // Clear the editor
      setNote(null);
      setContent('');
      onNoteChange(null as any);
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Fehler beim Löschen der Notiz');
    } finally {
      setDeleting(false);
    }
  };

  const handleLinkClick = (linkName: string) => {
    onNoteChange(linkName);
  };

  const handleInsertText = (text: string, cursorOffset: number = 0) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };
      const op = {
        identifier: id,
        range: selection,
        text: text,
        forceMoveMarkers: true,
      };
      editor.executeEdits('wysiwyg-toolbar', [op]);
      
      // Move cursor
      if (cursorOffset !== 0) {
        const position = editor.getPosition();
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column + cursorOffset,
        };
        editor.setPosition(newPosition);
      }
      editor.focus();
    }
  };

  if (!noteName) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a note or create a new one
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-800">
        {editingTitle ? (
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={() => {
              saveTitle();
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveTitle();
                setEditingTitle(false);
              } else if (e.key === 'Escape') {
                setNewTitle(note?.metadata.title || noteName || '');
                setEditingTitle(false);
              }
            }}
            className="font-semibold bg-transparent border-b-2 border-indigo-500 outline-none px-1 text-gray-900 dark:text-white"
            autoFocus
          />
        ) : (
          <h2 
            className="font-semibold truncate cursor-pointer hover:text-indigo-500 text-gray-900 dark:text-white"
            onClick={() => setEditingTitle(true)}
            title="Click to edit title"
          >
            {note?.metadata.title || noteName}
          </h2>
        )}
      </div>

      {/* Editor/Preview Content */}
      <div className="flex-1 overflow-hidden">
        {editorMode === 'reading' ? (
          <div className="h-full overflow-y-auto p-6 bg-white dark:bg-gray-900">
            <MarkdownPreview content={content} onLinkClick={handleLinkClick} />
          </div>
        ) : editorMode === 'wysiwyg' ? (
          <RichTextEditor
            content={content}
            onChange={setContent}
            isDark={isDark}
          />
        ) : (
          <MonacoEditor
            height="100%"
            language="markdown"
            theme={isDark ? 'vs-dark' : 'light'}
            value={content}
            onChange={(value) => setContent(value || '')}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              
              // Register menu items with proper submenu structure
              // Format submenu
              monaco.editor.registerCommand('format.bold', (accessor, ...args) => {
                const selection = editor.getSelection();
                if (selection) {
                  const text = editor.getModel()?.getValueInRange(selection) || '';
                  editor.executeEdits('', [{
                    range: selection,
                    text: `**${text}**`,
                  }]);
                }
              });

              monaco.editor.registerCommand('format.italic', (accessor, ...args) => {
                const selection = editor.getSelection();
                if (selection) {
                  const text = editor.getModel()?.getValueInRange(selection) || '';
                  editor.executeEdits('', [{
                    range: selection,
                    text: `*${text}*`,
                  }]);
                }
              });

              monaco.editor.registerCommand('format.strikethrough', (accessor, ...args) => {
                const selection = editor.getSelection();
                if (selection) {
                  const text = editor.getModel()?.getValueInRange(selection) || '';
                  editor.executeEdits('', [{
                    range: selection,
                    text: `~~${text}~~`,
                  }]);
                }
              });

              monaco.editor.registerCommand('format.code', (accessor, ...args) => {
                const selection = editor.getSelection();
                if (selection) {
                  const text = editor.getModel()?.getValueInRange(selection) || '';
                  editor.executeEdits('', [{
                    range: selection,
                    text: `\`${text}\``,
                  }]);
                }
              });

              monaco.editor.registerCommand('format.clear', (accessor, ...args) => {
                const selection = editor.getSelection();
                if (selection) {
                  let text = editor.getModel()?.getValueInRange(selection) || '';
                  text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/~~/g, '').replace(/`/g, '');
                  editor.executeEdits('', [{
                    range: selection,
                    text: text,
                  }]);
                }
              });

              // Add actions with submenus
              editor.addAction({
                id: 'add-backlink',
                label: 'Add Link (Backlink)',
                contextMenuGroupId: '1_modification',
                contextMenuOrder: 1,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const text = ed.getModel()?.getValueInRange(selection) || '';
                    ed.executeEdits('', [{
                      range: selection,
                      text: `[[${text}]]`,
                    }]);
                    // Move cursor inside brackets if no text was selected
                    if (!text) {
                      const newSelection = ed.getSelection();
                      if (newSelection) {
                        const pos = newSelection.getStartPosition();
                        ed.setPosition({
                          lineNumber: pos.lineNumber,
                          column: pos.column - 2, // Move cursor before ]]
                        });
                      }
                    }
                  }
                },
              });

              editor.addAction({
                id: 'add-external-link',
                label: 'Add External Link',
                contextMenuGroupId: '1_modification',
                contextMenuOrder: 2,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const text = ed.getModel()?.getValueInRange(selection) || '';
                    ed.executeEdits('', [{
                      range: selection,
                      text: `[${text}]()`,
                    }]);
                    // Move cursor inside () if no text was selected, or after [text] if text was selected
                    const newSelection = ed.getSelection();
                    if (newSelection) {
                      const pos = newSelection.getStartPosition();
                      if (text) {
                        // If text was selected, move cursor into () for URL
                        ed.setPosition({
                          lineNumber: pos.lineNumber,
                          column: pos.column - 1, // Move cursor before )
                        });
                      } else {
                        // If no text, move cursor into [] for link text
                        ed.setPosition({
                          lineNumber: pos.lineNumber,
                          column: pos.column - 3, // Move cursor before ]()
                        });
                      }
                    }
                  }
                },
              });

              // Format submenu parent
              editor.addAction({
                id: 'format-bold-alt',
                label: 'Bold',
                contextMenuGroupId: '2_format',
                contextMenuOrder: 1,
                run: () => monaco.editor.getEditors()[0]?.trigger('context', 'format.bold', null),
              });

              editor.addAction({
                id: 'format-italic-alt',
                label: 'Italic',
                contextMenuGroupId: '2_format',
                contextMenuOrder: 2,
                run: () => monaco.editor.getEditors()[0]?.trigger('context', 'format.italic', null),
              });

              editor.addAction({
                id: 'format-strikethrough-alt',
                label: 'Strikethrough',
                contextMenuGroupId: '2_format',
                contextMenuOrder: 3,
                run: () => monaco.editor.getEditors()[0]?.trigger('context', 'format.strikethrough', null),
              });

              editor.addAction({
                id: 'format-code-alt',
                label: 'Inline Code',
                contextMenuGroupId: '2_format',
                contextMenuOrder: 4,
                run: () => monaco.editor.getEditors()[0]?.trigger('context', 'format.code', null),
              });

              editor.addAction({
                id: 'format-clear-alt',
                label: 'Clear Formatting',
                contextMenuGroupId: '2_format',
                contextMenuOrder: 5,
                run: () => monaco.editor.getEditors()[0]?.trigger('context', 'format.clear', null),
              });

              // Paragraph actions with prefix
              editor.addAction({
                id: 'paragraph-bullet-list',
                label: 'Bullet List',
                contextMenuGroupId: '3_paragraph',
                contextMenuOrder: 1,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const position = selection.getStartPosition();
                    ed.executeEdits('', [{
                      range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                      text: '- ',
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'paragraph-numbered-list',
                label: 'Numbered List',
                contextMenuGroupId: '3_paragraph',
                contextMenuOrder: 2,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const position = selection.getStartPosition();
                    ed.executeEdits('', [{
                      range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                      text: '1. ',
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'paragraph-task-list',
                label: 'Task List',
                contextMenuGroupId: '3_paragraph',
                contextMenuOrder: 3,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const position = selection.getStartPosition();
                    ed.executeEdits('', [{
                      range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                      text: '- [ ] ',
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'paragraph-heading1',
                label: 'Heading 1',
                contextMenuGroupId: '3_paragraph',
                contextMenuOrder: 4,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const position = selection.getStartPosition();
                    ed.executeEdits('', [{
                      range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                      text: '# ',
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'paragraph-heading2',
                label: 'Heading 2',
                contextMenuGroupId: '3_paragraph',
                contextMenuOrder: 5,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const position = selection.getStartPosition();
                    ed.executeEdits('', [{
                      range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                      text: '## ',
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'paragraph-heading3',
                label: 'Heading 3',
                contextMenuGroupId: '3_paragraph',
                contextMenuOrder: 6,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const position = selection.getStartPosition();
                    ed.executeEdits('', [{
                      range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                      text: '### ',
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'paragraph-quote',
                label: 'Quote',
                contextMenuGroupId: '3_paragraph',
                contextMenuOrder: 7,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const position = selection.getStartPosition();
                    ed.executeEdits('', [{
                      range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                      text: '> ',
                    }]);
                  }
                },
              });

              // Insert actions with prefix
              editor.addAction({
                id: 'insert-table',
                label: 'Table',
                contextMenuGroupId: '4_insert',
                contextMenuOrder: 1,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    const table = '\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Row 1 | Data | Data |\n| Row 2 | Data | Data |\n';
                    ed.executeEdits('', [{
                      range: selection,
                      text: table,
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'insert-hr',
                label: 'Horizontal Rule',
                contextMenuGroupId: '4_insert',
                contextMenuOrder: 2,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    ed.executeEdits('', [{
                      range: selection,
                      text: '\n---\n',
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'insert-codeblock',
                label: 'Code Block',
                contextMenuGroupId: '4_insert',
                contextMenuOrder: 3,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (selection) {
                    ed.executeEdits('', [{
                      range: selection,
                      text: '\n```\ncode here\n```\n',
                    }]);
                  }
                },
              });

              editor.addAction({
                id: 'insert-image',
                label: 'Image',
                contextMenuGroupId: '4_insert',
                contextMenuOrder: 4,
                run: (ed) => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const selection = ed.getSelection();
                      if (selection) {
                        const pos = selection.getStartPosition();
                        
                        // Show loading placeholder
                        ed.executeEdits('', [{
                          range: selection,
                          text: `![Uploading...](uploading)`,
                        }]);
                        
                        try {
                          // Upload image to backend
                          const result = await uploadAttachment(file);
                          
                          // Replace with actual image link
                          const model = ed.getModel();
                          if (model) {
                            const lineContent = model.getLineContent(pos.lineNumber);
                            const uploadingIndex = lineContent.indexOf('![Uploading...](uploading)');
                            if (uploadingIndex !== -1) {
                              ed.executeEdits('', [{
                                range: new monaco.Range(
                                  pos.lineNumber,
                                  uploadingIndex + 1,
                                  pos.lineNumber,
                                  uploadingIndex + '![Uploading...](uploading)'.length + 1
                                ),
                                text: `![image](${result.url})`,
                              }]);
                            }
                          }
                          
                          // Move cursor to alt text area (between ![])
                          ed.setPosition({
                            lineNumber: pos.lineNumber,
                            column: pos.column + 2,
                          });
                        } catch (error) {
                          console.error('Failed to upload image:', error);
                          // Replace with error message
                          const model = ed.getModel();
                          if (model) {
                            const lineContent = model.getLineContent(pos.lineNumber);
                            const uploadingIndex = lineContent.indexOf('![Uploading...](uploading)');
                            if (uploadingIndex !== -1) {
                              ed.executeEdits('', [{
                                range: new monaco.Range(
                                  pos.lineNumber,
                                  uploadingIndex + 1,
                                  pos.lineNumber,
                                  uploadingIndex + '![Uploading...](uploading)'.length + 1
                                ),
                                text: `![Upload failed](error)`,
                              }]);
                            }
                          }
                          alert('Failed to upload image: ' + (error as Error).message);
                        }
                      }
                    }
                  };
                  input.click();
                },
              });
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        note={note}
        content={content}
        backlinksCount={backlinksCount}
        editorMode={editorMode}
        onModeChange={setEditorMode}
        onShowInfo={() => setShowInfoModal(true)}
      />

      {/* File Info Modal */}
      {showInfoModal && (
        <FileInfoModal
          note={note}
          onClose={() => setShowInfoModal(false)}
          onProjectUpdate={updateProject}
          onDelete={deleteNote}
        />
      )}
    </div>
  );
}
