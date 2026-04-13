'use client';

import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, UserCheck, Search,
  Mail, Clock, Check, X, Trash2, Bell, Inbox, Send
} from 'lucide-react';
import { api } from '@/lib/api';

interface Connect {
  id: string;
  user_id: string;
  connected_user_id: string;
  connected_username: string;
  connected_email: string;
  created_at: string;
}

interface ConnectRequest {
  id: string;
  requester_id: string;
  requester_username: string;
  requester_email: string;
  target_id: string;
  target_username: string;
  target_email: string;
  status: string;
  created_at: string;
}

interface UserSearchResult {
  id: string;
  username: string;
  email: string;
}

interface SharedItem {
  id: string;
  item_type: 'project' | 'note' | 'task';
  item_id: string;
  owner_id: string;
  owner_username: string;
  shared_with_id: string;
  permission: 'view' | 'edit';
  created_at: string;
}

export default function ConnectsView() {
  const [connects, setConnects] = useState<Connect[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConnectRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectRequest[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedItem[]>([]);
  const [sharedByMe, setSharedByMe] = useState<SharedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'connects' | 'requests' | 'search' | 'shared'>('connects');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timeout = setTimeout(() => setStatusMessage(null), 2800);
    return () => clearTimeout(timeout);
  }, [statusMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [connectsData, incomingData, outgoingData, withMeData, byMeData] = await Promise.all([
        api.getConnects(),
        api.getIncomingRequests(),
        api.getOutgoingRequests(),
        api.getItemsSharedWithMe(),
        api.getItemsSharedByMe(),
      ]);
      setConnects(connectsData);
      setIncomingRequests(incomingData);
      setOutgoingRequests(outgoingData);
      setSharedWithMe(withMeData);
      setSharedByMe(byMeData);
    } catch (err) {
      setError('Fehler beim Laden der Connects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await api.searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (user: UserSearchResult) => {
    try {
      await api.sendConnectRequest(user.email);
      setSearchResults(searchResults.filter(u => u.id !== user.id));
      setSearchQuery('');
      setStatusMessage(`Anfrage an ${user.username} gesendet.`);
      await loadData();
      setActiveTab('requests');
    } catch (err: any) {
      alert(err.message || 'Fehler beim Senden der Anfrage');
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await api.acceptConnectRequest(requestId);
      setStatusMessage('Anfrage angenommen. Ihr seid jetzt verbunden.');
      await loadData();
    } catch (err) {
      alert('Fehler beim Akzeptieren der Anfrage');
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await api.rejectConnectRequest(requestId);
      setStatusMessage('Anfrage abgelehnt.');
      await loadData();
    } catch (err) {
      alert('Fehler beim Ablehnen der Anfrage');
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await api.cancelConnectRequest(requestId);
      setStatusMessage('Anfrage zurückgezogen.');
      await loadData();
    } catch (err) {
      alert('Fehler beim Abbrechen der Anfrage');
    }
  };

  const removeConnect = async (connectId: string) => {
    if (!confirm('Möchtest du diese Verbindung wirklich entfernen?')) return;
    
    try {
      await api.removeConnect(connectId);
      setStatusMessage('Verbindung wurde entfernt.');
      await loadData();
    } catch (err) {
      alert('Fehler beim Entfernen der Verbindung');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const totalRequests = incomingRequests.length + outgoingRequests.length;
  const totalShares = sharedWithMe.length + sharedByMe.length;

  const itemTypeLabel = (type: string) => {
    if (type === 'note') return 'Notiz';
    if (type === 'project') return 'Projekt';
    if (type === 'task') return 'Aufgabe';
    return 'Element';
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-sky-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Connects</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Team, Freigaben und eingehende Inhalte zentral verwalten</p>
            </div>
          </div>
          {incomingRequests.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full">
              <Bell className="w-4 h-4" />
              <span className="text-sm font-medium">{incomingRequests.length} neue Anfragen</span>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="mb-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/35 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {statusMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('connects')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'connects'
                ? 'brand-pill text-white'
                : 'glass-panel text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/70'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Connects ({connects.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'brand-pill text-white'
                : 'glass-panel text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/70'
            }`}
          >
            <Clock className="w-4 h-4" />
            Anfragen
            {totalRequests > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{totalRequests}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'search'
                ? 'brand-pill text-white'
                : 'glass-panel text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/70'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Neuer Connect
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'shared'
                ? 'brand-pill text-white'
                : 'glass-panel text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/70'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Shared Center ({totalShares})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-1 sm:p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : (
          <>
            {/* Connects List */}
            {activeTab === 'connects' && (
              <div className="space-y-3">
                {connects.length === 0 ? (
                  <div className="glass-panel rounded-2xl text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Du hast noch keine Connects</p>
                    <button
                      onClick={() => setActiveTab('search')}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                    >
                      Ersten Connect hinzufügen
                    </button>
                  </div>
                ) : (
                  connects.map(connect => (
                    <div
                      key={connect.id}
                      className="glass-panel rounded-2xl flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {connect.connected_username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {connect.connected_username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {connect.connected_email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          Verbunden seit {formatDate(connect.created_at)}
                        </span>
                        <button
                          onClick={() => removeConnect(connect.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Connect entfernen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Requests */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {/* Incoming */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Eingehende Anfragen ({incomingRequests.length})
                  </h3>
                  {incomingRequests.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4">Keine eingehenden Anfragen</p>
                  ) : (
                    <div className="space-y-2">
                      {incomingRequests.map(request => (
                        <div
                          key={request.id}
                          className="glass-panel rounded-2xl flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {request.requester_username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">
                                {request.requester_username}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {request.requester_email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => acceptRequest(request.id)}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              title="Akzeptieren"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => rejectRequest(request.id)}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="Ablehnen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outgoing */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Ausstehende Anfragen ({outgoingRequests.length})
                  </h3>
                  {outgoingRequests.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4">Keine ausstehenden Anfragen</p>
                  ) : (
                    <div className="space-y-2">
                      {outgoingRequests.map(request => (
                        <div
                          key={request.id}
                          className="glass-panel rounded-2xl flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                              {request.target_username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">
                                {request.target_username}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {request.target_email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                              Ausstehend
                            </span>
                            <button
                              onClick={() => cancelRequest(request.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Anfrage abbrechen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                <div className="relative glass-panel rounded-2xl p-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Suche nach Benutzername oder E-Mail..."
                    className="w-full pl-10 pr-4 py-3 bg-transparent border border-white/40 dark:border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-800 dark:text-white"
                  />
                </div>

                {isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                  </div>
                )}

                {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    Keine Benutzer gefunden
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map(user => (
                      <div
                        key={user.id}
                        className="glass-panel rounded-2xl flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                              {user.username}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendRequest(user)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          Verbinden
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.length < 2 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Gib mindestens 2 Zeichen ein, um nach Benutzern zu suchen
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Shared Center */}
            {activeTab === 'shared' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-panel rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Inbox className="w-4 h-4" />
                      Mit mir geteilt ({sharedWithMe.length})
                    </h3>
                    <div className="space-y-2">
                      {sharedWithMe.length === 0 && <p className="text-xs text-slate-500">Noch keine eingehenden Freigaben.</p>}
                      {sharedWithMe.map((item) => (
                        <div key={item.id} className="rounded-xl border border-white/40 dark:border-slate-700/45 bg-white/40 dark:bg-slate-900/35 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{itemTypeLabel(item.item_type)} #{item.item_id.slice(0, 8)}</p>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">{item.permission}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Von {item.owner_username}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Von mir geteilt ({sharedByMe.length})
                    </h3>
                    <div className="space-y-2">
                      {sharedByMe.length === 0 && <p className="text-xs text-slate-500">Du hast noch nichts geteilt.</p>}
                      {sharedByMe.map((item) => (
                        <div key={item.id} className="rounded-xl border border-white/40 dark:border-slate-700/45 bg-white/40 dark:bg-slate-900/35 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{itemTypeLabel(item.item_type)} #{item.item_id.slice(0, 8)}</p>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200">{item.permission}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Owner: {item.owner_username}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
