'use client';

import { useState, useEffect } from 'react';
import { api, type NoteList } from '@/lib/api';
import { FileText, Plus, Calendar, Tag } from 'lucide-react';
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

  useEffect(() => {
    loadData();
  }, []);

  // Reload when currentNote changes (new note created)
  useEffect(() => {
    if (currentNote) {
      loadData();
    }
  }, [currentNote]);

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

  const createDaily = async () => {
    try {
      const result = await api.createDailyNote();
      onNoteSelect(result.name);
      loadData();
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

  const filteredNotes = notes.filter((note: NoteList) =>
    note.name.toLowerCase().includes(filter.toLowerCase()) ||
    (note.title && note.title.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      {/* Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onCreateNote}
          className="w-full flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          {t.notes.newNote}
        </button>
        <button
          onClick={createDaily}
          className="w-full flex items-center gap-2 px-4 py-2 mt-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Calendar size={16} />
          {t.notes.dailyNote}
        </button>
      </div>

      {/* Filter */}
      <div className="p-4">
        <input
          type="text"
          placeholder={t.notes.filterPlaceholder}
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">{t.notes.loading}</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t.notes.noNotes}</div>
        ) : (
          <div className="space-y-1">
            {filteredNotes.map((note) => (
              <button
                key={note.name}
                onClick={() => onNoteSelect(note.name)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  currentNote === note.name
                    ? 'bg-primary-500 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText size={16} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {note.title || note.name}
                    </div>
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
          <Tag size={14} />
          {t.notes.tags}
        </div>
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
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
    </div>
  );
}
