'use client';

import { useState, useEffect } from 'react';
import { Plus, Star, Trash2, Tag, Lightbulb } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import { api } from '@/lib/api';

interface Idea {
  id: string;
  title: string;
  description?: string;
  tags?: string;
  category?: string;
  created_at: string;
}

export default function IdeasView() {
  const { t } = useTranslation();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: '', description: '', tags: '', category: '' });
  const [filterTag, setFilterTag] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      const data = await api.getIdeas();
      setIdeas(data);
    } catch (error) {
      console.error('Failed to load ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const createIdea = async () => {
    if (!newIdea.title.trim()) return;

    try {
      const idea = await api.createIdea({
        title: newIdea.title,
        description: newIdea.description || null,
        tags: newIdea.tags || null,
        category: newIdea.category || null,
      });
      
      setIdeas([...ideas, idea]);
      setNewIdea({ title: '', description: '', tags: '', category: '' });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create idea:', error);
      alert('Failed to create idea');
    }
  };

  const deleteIdea = async (id: string) => {
    if (!confirm('Diese Idee löschen?')) return;

    try {
      await api.deleteIdea(id);
      setIdeas(ideas.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete idea:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t.common.loading}</div>
      </div>
    );
  }

  const allTags = Array.from(new Set(
    ideas
      .filter(i => i.tags)
      .flatMap(i => i.tags!.split(',').map(t => t.trim()).filter(Boolean))
  ));
  
  const filteredIdeas = filterTag 
    ? ideas.filter(i => i.tags?.includes(filterTag))
    : ideas;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {t.ideas.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {ideas.length} {t.ideas.title}
            </p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            {t.ideas.newIdea}
          </button>
        </div>

        {/* Create Form */}
        {isCreating && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-3">
            <input
              type="text"
              value={newIdea.title}
              onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              placeholder={t.ideas.ideaTitle + '...'}
              autoFocus
            />
            <textarea
              value={newIdea.description}
              onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
              placeholder={t.ideas.ideaDescription + '...'}
              rows={3}
            />
            <input
              type="text"
              value={newIdea.tags}
              onChange={(e) => setNewIdea({ ...newIdea, tags: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              placeholder="Tags (kommagetrennt)..."
            />
            <div className="flex gap-2">
              <button
                onClick={createIdea}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                {t.ideas.create}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewIdea({ title: '', description: '', tags: '', category: '' });
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t.ideas.cancel}
              </button>
            </div>
          </div>
        )}

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={16} className="text-gray-400" />
            <button
              onClick={() => setFilterTag('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !filterTag
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Alle
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterTag === tag
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Ideas Grid */}
        {filteredIdeas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIdeas.map(idea => (
              <IdeaCard key={idea.id} idea={idea} onDelete={deleteIdea} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <Lightbulb size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filterTag ? `Keine Ideen mit Tag "${filterTag}"` : 'Keine Ideen'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {filterTag ? 'Versuche einen anderen Tag' : 'Erstelle deine erste Idee'}
            </p>
            {!filterTag && (
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                Idee erstellen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface IdeaCardProps {
  idea: Idea;
  onDelete: (id: string) => void;
}

function IdeaCard({ idea, onDelete }: IdeaCardProps) {
  const tagArray = idea.tags ? idea.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-medium text-gray-900 dark:text-white flex-1">
          {idea.title}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(idea.id)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
      {idea.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
          {idea.description}
        </p>
      )}
      {idea.category && (
        <div className="mb-2">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs text-blue-700 dark:text-blue-300 font-medium">
            {idea.category}
          </span>
        </div>
      )}
      {tagArray.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tagArray.map(tag => (
            <span 
              key={tag}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {idea.created_at && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400">
            {new Date(idea.created_at).toLocaleDateString('de-DE')}
          </p>
        </div>
      )}
    </div>
  );
}
