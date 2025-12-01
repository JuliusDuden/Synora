'use client';

import { useState, useEffect } from 'react';
import { X, Share2, Users, Check, Eye, Edit3, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Connect {
  id: string;
  connected_user_id: string;
  connected_username: string;
  connected_email: string;
}

interface ShareInfo {
  id: string;
  shared_with_id: string;
  shared_with_username: string;
  shared_with_email: string;
  permission: string;
  created_at: string;
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'project' | 'note' | 'task';
  itemId: string;
  itemName: string;
}

export default function ShareDialog({ isOpen, onClose, itemType, itemId, itemName }: ShareDialogProps) {
  const [connects, setConnects] = useState<Connect[]>([]);
  const [currentShares, setCurrentShares] = useState<ShareInfo[]>([]);
  const [selectedConnects, setSelectedConnects] = useState<string[]>([]);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, itemType, itemId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [connectsData, sharesData] = await Promise.all([
        api.getConnects(),
        api.getItemShares(itemType, itemId)
      ]);
      setConnects(connectsData);
      setCurrentShares(sharesData);
    } catch (err) {
      console.error('Failed to load share data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleConnect = (connectId: string) => {
    setSelectedConnects(prev => 
      prev.includes(connectId)
        ? prev.filter(id => id !== connectId)
        : [...prev, connectId]
    );
  };

  const handleShare = async () => {
    if (selectedConnects.length === 0) return;

    try {
      setSaving(true);
      await api.shareItem(itemType, itemId, selectedConnects, permission);
      setSelectedConnects([]);
      await loadData();
    } catch (err) {
      alert('Fehler beim Teilen');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnshare = async (shareInfo: ShareInfo) => {
    // Find the connect ID for this shared_with user
    const connect = connects.find(c => c.connected_user_id === shareInfo.shared_with_id);
    if (!connect) return;

    try {
      await api.unshareItem(itemType, itemId, connect.id);
      await loadData();
    } catch (err) {
      alert('Fehler beim Entfernen der Freigabe');
      console.error(err);
    }
  };

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'project': return 'Projekt';
      case 'note': return 'Notiz';
      case 'task': return 'Aufgabe';
      default: return 'Element';
    }
  };

  // Filter connects that are not already shared
  const availableConnects = connects.filter(
    c => !currentShares.some(s => s.shared_with_id === c.connected_user_id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {getItemTypeLabel()} teilen
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[300px]">
                {itemName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Shares */}
              {currentShares.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                    Bereits geteilt mit
                  </h3>
                  <div className="space-y-2">
                    {currentShares.map(share => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {share.shared_with_username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white text-sm">
                              {share.shared_with_username}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {share.permission === 'edit' ? (
                                <><Edit3 className="w-3 h-3" /> Bearbeiten</>
                              ) : (
                                <><Eye className="w-3 h-3" /> Ansehen</>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnshare(share)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Freigabe entfernen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Shares */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                  Mit Connects teilen
                </h3>
                
                {availableConnects.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4 text-center">
                    {connects.length === 0 
                      ? 'Du hast noch keine Connects. Füge zuerst welche hinzu!'
                      : 'Bereits mit allen Connects geteilt.'}
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 mb-4">
                      {availableConnects.map(connect => (
                        <button
                          key={connect.id}
                          onClick={() => toggleConnect(connect.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                            selectedConnects.includes(connect.id)
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {connect.connected_username.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-800 dark:text-white text-sm">
                                {connect.connected_username}
                              </p>
                              <p className="text-xs text-gray-500">{connect.connected_email}</p>
                            </div>
                          </div>
                          {selectedConnects.includes(connect.id) && (
                            <Check className="w-5 h-5 text-indigo-500" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Permission Selection */}
                    {selectedConnects.length > 0 && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">
                          Berechtigung
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPermission('view')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 transition-colors ${
                              permission === 'view'
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            Ansehen
                          </button>
                          <button
                            onClick={() => setPermission('edit')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 transition-colors ${
                              permission === 'edit'
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Edit3 className="w-4 h-4" />
                            Bearbeiten
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && selectedConnects.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleShare}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Mit {selectedConnects.length} Connect{selectedConnects.length > 1 ? 's' : ''} teilen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
