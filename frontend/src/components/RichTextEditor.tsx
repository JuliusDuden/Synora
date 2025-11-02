'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  Undo,
  Redo,
  ExternalLink,
  Type,
  Highlighter,
  Hash,
  MessageSquare,
  Eraser,
  FileText,
  AlignLeft,
  Minus,
  ChevronRight,
} from 'lucide-react';
import TurndownService from 'turndown';
// @ts-ignore - no types available
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';
import { uploadAttachment } from '@/lib/api';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  isDark: boolean;
}

interface ContextMenu {
  x: number;
  y: number;
  showFormatSubmenu?: boolean;
  showParagraphSubmenu?: boolean;
  showInsertSubmenu?: boolean;
}

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
});

// Use GFM plugin for tables, strikethrough, and task lists
turndownService.use(gfm);

// Custom rule for images to keep the attachment URLs
turndownService.addRule('image', {
  filter: 'img',
  replacement: function(content, node) {
    const img = node as HTMLImageElement;
    const alt = img.alt || 'image';
    const src = img.getAttribute('src') || '';
    
    // Keep the URL as-is (it should already be in the correct format)
    return `![${alt}](${src})`;
  }
});

// Ensure tables are properly formatted
turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
turndownService.addRule('table', {
  filter: 'table',
  replacement: function(content, node) {
    // Get all rows
    const rows: string[][] = [];
    const tableNode = node as HTMLTableElement;
    
    // Process all rows (including header and body)
    const allRows = tableNode.querySelectorAll('tr');
    allRows.forEach((tr, rowIndex) => {
      const row: string[] = [];
      const cells = tr.querySelectorAll('th, td');
      cells.forEach(cell => {
        row.push(cell.textContent?.trim() || '');
      });
      rows.push(row);
    });
    
    if (rows.length === 0) return '';
    
    // Calculate column widths
    const colCount = Math.max(...rows.map(r => r.length));
    
    // Build markdown table
    let markdown = '\n';
    
    // Header row
    markdown += '| ' + rows[0].join(' | ') + ' |\n';
    
    // Separator row
    markdown += '|' + ' --- |'.repeat(colCount) + '\n';
    
    // Body rows
    for (let i = 1; i < rows.length; i++) {
      markdown += '| ' + rows[i].join(' | ') + ' |\n';
    }
    
    return markdown + '\n';
  }
});

// Configure lowlight for code syntax highlighting
const lowlight = createLowlight(common);

// Custom plugin to replace base64 images with uploaded versions
const uploadBase64ImagesPlugin = () => {
  return new Plugin({
    key: new PluginKey('uploadBase64Images'),
    appendTransaction(transactions, oldState, newState) {
      const tr = newState.tr;
      let modified = false;

      newState.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src?.startsWith('data:image')) {
          const base64Src = node.attrs.src;
          
          // Upload the base64 image
          fetch(base64Src)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], 'pasted-image.png', { type: blob.type });
              return uploadAttachment(file);
            })
            .then(result => {
              // Replace the node with uploaded URL
              const { view } = newState as any;
              if (view) {
                const { state } = view;
                const newTr = state.tr;
                
                // Find the node again (position might have changed)
                state.doc.descendants((n: any, p: number) => {
                  if (n.type.name === 'image' && n.attrs.src === base64Src) {
                    newTr.setNodeMarkup(p, undefined, {
                      ...n.attrs,
                      src: result.url,
                    });
                  }
                });
                
                if (newTr.docChanged) {
                  view.dispatch(newTr);
                }
              }
            })
            .catch(error => {
              console.error('Failed to upload base64 image:', error);
            });
          
          modified = true;
        }
      });

      return modified ? tr : null;
    },
  });
};

export default function RichTextEditor({ content, onChange, isDark }: RichTextEditorProps) {
  const isLocalUpdate = useRef(false);
  const lastMarkdown = useRef('');
  const isInitialized = useRef(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default code block
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-800 text-gray-100 rounded p-4 font-mono text-sm',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 dark:text-indigo-400 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Extension.create({
        name: 'uploadBase64Images',
        addProseMirrorPlugins() {
          return [uploadBase64ImagesPlugin()];
        },
      }),
    ],
    content: '', // Start with empty content
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-6 py-4',
        style: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;',
      },
      handlePaste: (view, event) => {
        // Check if clipboard contains files
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter(item => item.type.startsWith('image/'));
        
        if (imageItems.length > 0) {
          event.preventDefault();
          
          imageItems.forEach(item => {
            const file = item.getAsFile();
            if (file) {
              // Upload the image
              uploadAttachment(file).then(result => {
                const { state } = view;
                const { selection } = state;
                
                // Insert image at current cursor position
                const node = view.state.schema.nodes.image.create({
                  src: result.url,
                });
                
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              }).catch(error => {
                console.error('Failed to upload pasted image:', error);
                alert('Failed to upload image: ' + error.message);
              });
            }
          });
          
          return true;
        }
        
        return false;
      },
      handleDrop: (view, event) => {
        // Check if drop contains files
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
          event.preventDefault();
          
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!coordinates) return false;
          
          imageFiles.forEach(file => {
            // Upload the image
            uploadAttachment(file).then(result => {
              const node = view.state.schema.nodes.image.create({
                src: result.url,
              });
              
              const transaction = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(transaction);
            }).catch(error => {
              console.error('Failed to upload dropped image:', error);
              alert('Failed to upload image: ' + error.message);
            });
          });
          
          return true;
        }
        
        return false;
      },
    },
    onUpdate: ({ editor }: any) => {
      // Convert HTML back to Markdown
      isLocalUpdate.current = true;
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      lastMarkdown.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;

    // Initial load or external update
    if (!isInitialized.current || (content !== lastMarkdown.current && !isLocalUpdate.current)) {
      try {
        const html = marked.parse(content, { 
          gfm: true, 
          breaks: true 
        }) as string;
        editor.commands.setContent(html, { emitUpdate: false });
        lastMarkdown.current = content;
        isInitialized.current = true;
      } catch (error) {
        console.error('Failed to parse markdown:', error);
        // Fallback to plain content
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
    isLocalUpdate.current = false;
  }, [content, editor]);

  // Add custom keyboard shortcuts after editor is created
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!editor.isFocused) return;

      const { state } = editor;
      const { selection } = state;
      const { $from, from, to } = selection;
      const isInCodeBlock = $from.parent.type.name === 'codeBlock';

      // Handle Tab in code block
      if (event.key === 'Tab' && isInCodeBlock) {
        event.preventDefault();
        
        if (from !== to) {
          // Selection exists: indent each line
          const selectedText = state.doc.textBetween(from, to, '\n');
          const lines = selectedText.split('\n');
          const indentedText = lines.map(line => '    ' + line).join('\n');
          
          const tr = state.tr.replaceWith(from, to, state.schema.text(indentedText));
          editor.view.dispatch(tr);
        } else {
          // No selection: just insert 4 spaces
          editor.commands.insertContent('    ');
        }
        return;
      }

      // Handle Tab outside code block
      if (event.key === 'Tab' && !isInCodeBlock) {
        event.preventDefault();
        
        if (from !== to) {
          // Get selected text and split by line breaks
          const selectedText = state.doc.textBetween(from, to, '\n', '\n');
          
          // Check if selection spans multiple paragraphs
          const hasParagraphBreak = selectedText.includes('\n\n');
          
          if (hasParagraphBreak) {
            // Multiple paragraphs: indent each paragraph
            const tr = state.tr;
            let offset = 0;
            
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.isTextblock && pos >= from && pos < to) {
                tr.insertText('    ', pos + 1 + offset);
                offset += 4;
              }
            });
            
            editor.view.dispatch(tr);
          } else {
            // Single paragraph or inline text: treat as one block
            // Just insert 4 spaces at the beginning
            editor.commands.insertContentAt(from, '    ');
          }
        } else {
          // No selection: insert 4 spaces
          editor.commands.insertContent('    ');
        }
        return;
      }
    };

    // Attach to editor's DOM element
    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        console.log('Uploading file:', file.name);
        
        // Upload image directly
        const result = await uploadAttachment(file);
        
        console.log('Upload result:', result);
        console.log('Inserting image with URL:', result.url);
        
        // Insert image with uploaded URL
        editor.chain().focus().setImage({ src: result.url }).run();
        
        console.log('Image inserted successfully');
          
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image: ' + (error as Error).message);
      }
    };
    
    input.click();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const toggleCodeBlock = () => {
    editor.chain().focus().toggleCodeBlock().run();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const addBacklink = () => {
    const { from } = editor.state.selection;
    editor.chain().focus().insertContent('[[]]').run();
    // Move cursor between brackets
    editor.commands.setTextSelection(from + 2);
    closeContextMenu();
  };

  const addExternalLink = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    
    if (selectedText) {
      // If text is selected, wrap it and put cursor in ()
      editor.chain().focus().insertContent(`[${selectedText}]()`).run();
      editor.commands.setTextSelection(from + selectedText.length + 3);
    } else {
      // If no selection, insert empty structure and put cursor in []
      editor.chain().focus().insertContent('[]()'). run();
      editor.commands.setTextSelection(from + 1);
    }
    closeContextMenu();
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        console.log('Uploading file from context menu:', file.name);
        
        // Upload image directly
        const result = await uploadAttachment(file);
        
        console.log('Upload result:', result);
        console.log('Inserting image with URL:', result.url);
        
        // Insert image with uploaded URL
        editor.chain().focus().setImage({ src: result.url }).run();
        
        console.log('Image inserted successfully');
          
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image: ' + (error as Error).message);
      }
    };
    input.click();
    closeContextMenu();
  };

  const insertHorizontalRule = () => {
    editor.chain().focus().setHorizontalRule().run();
    closeContextMenu();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
    } catch (err) {
      console.error('Failed to paste:', err);
    }
    closeContextMenu();
  };

  const handlePastePlain = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
    } catch (err) {
      console.error('Failed to paste:', err);
    }
    closeContextMenu();
  };

  const selectAll = () => {
    editor.chain().focus().selectAll().run();
    closeContextMenu();
  };

  return (
    <div 
      className="h-full flex flex-col bg-white dark:bg-gray-900"
      onContextMenu={handleContextMenu}
      onClick={closeContextMenu}
    >
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-1 px-3 py-2 overflow-x-auto flex-shrink-0">
        {/* Undo/Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 text-gray-700 dark:text-gray-300"
          title="Undo"
        >
          <Undo size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 text-gray-700 dark:text-gray-300"
          title="Redo"
        >
          <Redo size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Heading 3"
        >
          <Heading3 size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Text Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('bold') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Bold"
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('italic') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Italic"
        >
          <Italic size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('strike') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('code') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Inline Code"
        >
          <Code size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Links & Images */}
        <button
          onClick={addLink}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('link') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Add Link"
        >
          <Link2 size={18} />
        </button>
        <button
          onClick={addImage}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300"
          title="Add Image"
        >
          <ImageIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('bulletList') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Bullet List"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('orderedList') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('taskList') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Task List"
        >
          <CheckSquare size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Quote & Code Block */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('blockquote') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Blockquote"
        >
          <Quote size={18} />
        </button>
        <button
          onClick={toggleCodeBlock}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 ${
            editor.isActive('codeBlock') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : ''
          }`}
          title="Code Block"
        >
          <Code size={18} />
        </button>
        <button
          onClick={addTable}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300"
          title="Insert Table"
        >
          <TableIcon size={18} />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        <style jsx global>{`
          .ProseMirror {
            outline: none;
            color: rgb(17 24 39);
          }
          .dark .ProseMirror {
            color: rgb(243 244 246);
          }
          .ProseMirror h1 {
            font-size: 2.25em;
            font-weight: 700;
            margin-top: 0.67em;
            margin-bottom: 0.67em;
            line-height: 1.1111111;
          }
          .ProseMirror h2 {
            font-size: 1.5em;
            font-weight: 600;
            margin-top: 2em;
            margin-bottom: 1em;
            line-height: 1.3333333;
          }
          .ProseMirror h3 {
            font-size: 1.25em;
            font-weight: 600;
            margin-top: 1.6em;
            margin-bottom: 0.6em;
            line-height: 1.6;
          }
          .ProseMirror p {
            margin-top: 1.25em;
            margin-bottom: 1.25em;
            line-height: 1.75;
          }
          .ProseMirror strong {
            font-weight: 600;
            color: rgb(17 24 39);
          }
          .dark .ProseMirror strong {
            color: rgb(243 244 246);
          }
          .ProseMirror em {
            font-style: italic;
          }
          .ProseMirror code {
            background-color: rgb(243 244 246);
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            font-size: 0.875em;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .dark .ProseMirror code {
            background-color: rgb(31 41 55);
            color: rgb(243 244 246);
          }
          .ProseMirror pre {
            background-color: rgb(31 41 55);
            color: rgb(243 244 246);
            padding: 1em;
            border-radius: 0.375rem;
            overflow-x: auto;
            margin-top: 1.75em;
            margin-bottom: 1.75em;
          }
          .ProseMirror pre code {
            background-color: transparent;
            padding: 0;
            color: inherit;
            font-size: 0.875em;
          }
          .ProseMirror blockquote {
            border-left: 4px solid rgb(209 213 219);
            padding-left: 1em;
            font-style: italic;
            margin-top: 1.6em;
            margin-bottom: 1.6em;
            color: rgb(107 114 128);
          }
          .dark .ProseMirror blockquote {
            border-left-color: rgb(75 85 99);
            color: rgb(156 163 175);
          }
          .ProseMirror ul,
          .ProseMirror ol {
            padding-left: 1.625em;
            margin-top: 1.25em;
            margin-bottom: 1.25em;
          }
          .ProseMirror ul {
            list-style-type: disc;
          }
          .ProseMirror ol {
            list-style-type: decimal;
          }
          .ProseMirror li {
            margin-top: 0.5em;
            margin-bottom: 0.5em;
          }
          .ProseMirror ul[data-type="taskList"] {
            list-style: none;
            padding: 0;
          }
          .ProseMirror ul[data-type="taskList"] li {
            display: flex;
            align-items: flex-start;
          }
          .ProseMirror ul[data-type="taskList"] li > label {
            flex: 0 0 auto;
            margin-right: 0.5rem;
            user-select: none;
          }
          .ProseMirror ul[data-type="taskList"] li > div {
            flex: 1 1 auto;
          }
          .ProseMirror a {
            color: rgb(99 102 241);
            text-decoration: underline;
          }
          .dark .ProseMirror a {
            color: rgb(129 140 248);
          }
          .ProseMirror table {
            border-collapse: collapse;
            margin: 1.5em 0;
            overflow: hidden;
            table-layout: fixed;
            width: 100%;
          }
          .ProseMirror table td,
          .ProseMirror table th {
            border: 2px solid rgb(209 213 219);
            padding: 0.5em 0.75em;
            position: relative;
            vertical-align: top;
          }
          .dark .ProseMirror table td,
          .dark .ProseMirror table th {
            border-color: rgb(75 85 99);
          }
          .ProseMirror table th {
            background-color: rgb(243 244 246);
            font-weight: 600;
            text-align: left;
          }
          .dark .ProseMirror table th {
            background-color: rgb(31 41 55);
          }
          .ProseMirror img {
            max-width: 100%;
            height: auto;
            border-radius: 0.375rem;
          }
          .ProseMirror hr {
            border: none;
            border-top: 2px solid rgb(229 231 235);
            margin: 2em 0;
          }
          .dark .ProseMirror hr {
            border-top-color: rgb(55 65 81);
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Add Link (Backlink) */}
          <button
            onClick={addBacklink}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <Link2 size={16} />
            Add Link
          </button>

          {/* Add External Link */}
          <button
            onClick={addExternalLink}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <ExternalLink size={16} />
            Add External Link
          </button>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* Format Submenu */}
          <div className="relative group">
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-2">
                <Type size={16} />
                Format
              </span>
              <ChevronRight size={16} />
            </button>
            <div className="hidden group-hover:block absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
              <button onClick={() => { editor.chain().focus().toggleBold().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Bold size={16} />
                Bold
              </button>
              <button onClick={() => { editor.chain().focus().toggleItalic().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Italic size={16} />
                Italic
              </button>
              <button onClick={() => { editor.chain().focus().toggleStrike().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Strikethrough size={16} />
                Strikethrough
              </button>
              <button onClick={() => { editor.chain().focus().toggleCode().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Code size={16} />
                Inline Code
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button onClick={() => { editor.chain().focus().unsetAllMarks().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Eraser size={16} />
                Clear Formatting
              </button>
            </div>
          </div>

          {/* Paragraph Submenu */}
          <div className="relative group">
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-2">
                <AlignLeft size={16} />
                Paragraph
              </span>
              <ChevronRight size={16} />
            </button>
            <div className="hidden group-hover:block absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
              <button onClick={() => { editor.chain().focus().toggleBulletList().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <List size={16} />
                Bullet List
              </button>
              <button onClick={() => { editor.chain().focus().toggleOrderedList().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <ListOrdered size={16} />
                Numbered List
              </button>
              <button onClick={() => { editor.chain().focus().toggleTaskList().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckSquare size={16} />
                Task List
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Heading1 size={16} />
                Heading 1
              </button>
              <button onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Heading2 size={16} />
                Heading 2
              </button>
              <button onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Heading3 size={16} />
                Heading 3
              </button>
              <button onClick={() => { editor.chain().focus().setParagraph().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <FileText size={16} />
                Body Text
              </button>
              <button onClick={() => { editor.chain().focus().toggleBlockquote().run(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Quote size={16} />
                Quote
              </button>
            </div>
          </div>

          {/* Insert Submenu */}
          <div className="relative group">
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-2">
                <Hash size={16} />
                Insert
              </span>
              <ChevronRight size={16} />
            </button>
            <div className="hidden group-hover:block absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
              <button onClick={() => { addTable(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <TableIcon size={16} />
                Table
              </button>
              <button onClick={() => { insertHorizontalRule(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Minus size={16} />
                Horizontal Rule
              </button>
              <button onClick={() => { toggleCodeBlock(); closeContextMenu(); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Code size={16} />
                Code Block
              </button>
              <button onClick={handleImageUpload} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <ImageIcon size={16} />
                Image
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* Paste */}
          <button
            onClick={handlePaste}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            Paste
          </button>

          {/* Paste as Plain Text */}
          <button
            onClick={handlePastePlain}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            Paste as Plain Text
          </button>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* Select All */}
          <button
            onClick={selectAll}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            Select All
          </button>
        </div>
      )}
    </div>
  );
}

