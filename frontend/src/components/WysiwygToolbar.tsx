'use client';

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Table,
  CheckSquare,
} from 'lucide-react';

interface WysiwygToolbarProps {
  onInsert: (text: string, cursorOffset?: number) => void;
}

export default function WysiwygToolbar({ onInsert }: WysiwygToolbarProps) {
  const toolbarButtons = [
    {
      icon: Heading1,
      title: 'Heading 1',
      action: () => onInsert('# ', 0),
    },
    {
      icon: Heading2,
      title: 'Heading 2',
      action: () => onInsert('## ', 0),
    },
    {
      icon: Heading3,
      title: 'Heading 3',
      action: () => onInsert('### ', 0),
    },
    { divider: true },
    {
      icon: Bold,
      title: 'Bold',
      action: () => onInsert('****', -2),
    },
    {
      icon: Italic,
      title: 'Italic',
      action: () => onInsert('**', -1),
    },
    {
      icon: Strikethrough,
      title: 'Strikethrough',
      action: () => onInsert('~~~~', -2),
    },
    {
      icon: Code,
      title: 'Inline Code',
      action: () => onInsert('``', -1),
    },
    { divider: true },
    {
      icon: Link,
      title: 'Link',
      action: () => onInsert('[](url)', -5),
    },
    {
      icon: Image,
      title: 'Image',
      action: () => onInsert('![alt text](url)', -11),
    },
    { divider: true },
    {
      icon: List,
      title: 'Bullet List',
      action: () => onInsert('- ', 0),
    },
    {
      icon: ListOrdered,
      title: 'Numbered List',
      action: () => onInsert('1. ', 0),
    },
    {
      icon: CheckSquare,
      title: 'Task List',
      action: () => onInsert('- [ ] ', 0),
    },
    { divider: true },
    {
      icon: Quote,
      title: 'Blockquote',
      action: () => onInsert('> ', 0),
    },
    {
      icon: Code,
      title: 'Code Block',
      action: () => onInsert('```\n\n```', -4),
    },
    {
      icon: Table,
      title: 'Table',
      action: () => onInsert('| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |', 0),
    },
  ];

  return (
    <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-1 px-3 overflow-x-auto">
      {toolbarButtons.map((button, index) => {
        if ('divider' in button) {
          return (
            <div
              key={`divider-${index}`}
              className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"
            />
          );
        }

        const Icon = button.icon;
        return (
          <button
            key={index}
            onClick={button.action}
            title={button.title}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300"
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
