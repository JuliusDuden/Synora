'use client';

import { type Note } from '@/lib/api';
import { Link2, Tag, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface BacklinksProps {
  note: Note | null;
  onLinkClick: (link: string) => void;
}

export default function Backlinks({ note, onLinkClick }: BacklinksProps) {
  if (!note) return null;

  return (
    <div className="p-4 space-y-6">
      {/* Metadata */}
      <div>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Calendar size={16} />
          Metadata
        </h3>
        <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          {note.created && (
            <div>
              Created: {format(new Date(note.created), 'MMM d, yyyy')}
            </div>
          )}
          {note.modified && (
            <div>
              Modified: {format(new Date(note.modified), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Tag size={16} />
            Tags
          </h3>
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      {note.links.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Link2 size={16} />
            Links ({note.links.length})
          </h3>
          <div className="space-y-1">
            {note.links.map((link) => (
              <button
                key={link}
                onClick={() => onLinkClick(link)}
                className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {link}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backlinks */}
      {note.backlinks.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Link2 size={16} />
            Backlinks ({note.backlinks.length})
          </h3>
          <div className="space-y-1">
            {note.backlinks.map((backlink) => (
              <button
                key={backlink}
                onClick={() => onLinkClick(backlink)}
                className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                ← {backlink}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
