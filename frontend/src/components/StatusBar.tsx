'use client';

import { useState } from 'react';
import { Info, FileText, Link2, Eye, Code, Type } from 'lucide-react';
import { type Note } from '@/lib/api';

interface StatusBarProps {
  note: Note | null;
  content: string;
  backlinksCount: number;
  editorMode: 'markdown' | 'wysiwyg' | 'reading';
  onModeChange: (mode: 'markdown' | 'wysiwyg' | 'reading') => void;
  onShowInfo: () => void;
}

export default function StatusBar({
  note,
  content,
  backlinksCount,
  editorMode,
  onModeChange,
  onShowInfo,
}: StatusBarProps) {
  // Count words and characters
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="h-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-end px-4 text-xs">
      {/* Right side - Mode, Stats, Backlinks, Info */}
      <div className="flex items-center gap-4">
        {/* Backlinks */}
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
          <Link2 size={14} />
          <span>{backlinksCount} Backlinks</span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Editor Mode Toggle */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <button
            onClick={() => onModeChange('reading')}
            className={`flex items-center gap-1 px-2 py-1 transition-colors ${
              editorMode === 'reading'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Reading Mode - Preview only"
          >
            <Eye size={14} />
            <span className="font-medium">Reading</span>
          </button>
          <button
            onClick={() => onModeChange('markdown')}
            className={`flex items-center gap-1 px-2 py-1 transition-colors ${
              editorMode === 'markdown'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Markdown Mode - Edit with line numbers"
          >
            <Code size={14} />
            <span className="font-medium">Code</span>
          </button>
          <button
            onClick={() => onModeChange('wysiwyg')}
            className={`flex items-center gap-1 px-2 py-1 transition-colors ${
              editorMode === 'wysiwyg'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Rich Text Mode - Edit with formatting toolbar"
          >
            <Type size={14} />
            <span className="font-medium">Rich Text</span>
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Word and Character Count */}
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} characters</span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Info Button */}
        <button
          onClick={onShowInfo}
          className="flex items-center gap-1 px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="File Info"
        >
          <Info size={14} />
          <span className="font-medium">Info</span>
        </button>
      </div>
    </div>
  );
}
