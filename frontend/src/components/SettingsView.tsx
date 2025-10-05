'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Download, Trash2, Database, Globe } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

interface Settings {
  darkMode: boolean;
  language: string;
}

export default function SettingsView() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    language: 'de',
  });

  useEffect(() => {
    loadSettings();
    
    // Listen for dark mode changes from other components
    const handleDarkModeChange = (event: any) => {
      const newDarkMode = event.detail?.darkMode;
      if (newDarkMode !== undefined) {
        setSettings(prev => ({ ...prev, darkMode: newDarkMode }));
      }
    };
    
    window.addEventListener('darkModeChange', handleDarkModeChange);
    
    return () => {
      window.removeEventListener('darkModeChange', handleDarkModeChange);
    };
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('settings');
    if (saved) {
      const parsedSettings = JSON.parse(saved);
      setSettings(parsedSettings);
      
      // Apply dark mode to DOM immediately on load
      if (parsedSettings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Detect system dark mode preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultSettings = { darkMode: isDark, language: 'de' };
      setSettings(defaultSettings);
      localStorage.setItem('settings', JSON.stringify(defaultSettings));
      
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    }
  };

  const saveSettings = (newSettings: Settings) => {
    localStorage.setItem('settings', JSON.stringify(newSettings));
    setSettings(newSettings);
    
    // Apply dark mode
    if (newSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Trigger language change event for other components
    window.dispatchEvent(new Event('languageChange'));
  };

  const toggleDarkMode = () => {
    const newSettings = { ...settings, darkMode: !settings.darkMode };
    saveSettings(newSettings);
    
    // Notify other components (like main app)
    window.dispatchEvent(new CustomEvent('darkModeChange', { 
      detail: { darkMode: newSettings.darkMode } 
    }));
  };

  const changeLanguage = (language: string) => {
    saveSettings({ ...settings, language });
  };

  const languages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const exportData = () => {
    const data = {
      notes: localStorage.getItem('notes'),
      projects: localStorage.getItem('projects'),
      tasks: localStorage.getItem('tasks'),
      ideas: localStorage.getItem('ideas'),
      habits: localStorage.getItem('habits'),
      settings: localStorage.getItem('settings'),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synora-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (confirm(t.settings.deleteConfirm)) {
      if (confirm(t.settings.deleteConfirmText)) {
        localStorage.removeItem('notes');
        localStorage.removeItem('projects');
        localStorage.removeItem('tasks');
        localStorage.removeItem('ideas');
        localStorage.removeItem('habits');
        alert(t.settings.dataDeleted);
        window.location.reload();
      }
    }
  };

  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return (total / 1024).toFixed(2);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {t.settings.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.settings.subtitle}
          </p>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t.settings.appearance}
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.darkMode ? (
                  <Moon size={20} className="text-gray-400" />
                ) : (
                  <Sun size={20} className="text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t.settings.darkMode}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.settings.darkModeDesc}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.darkMode ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                    settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Language Selection */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <Globe size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t.settings.language}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.settings.languageDesc}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      settings.language === lang.code
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t.settings.dataManagement}
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t.settings.storage}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getStorageSize()} KB {t.settings.storageUsed}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                <Download size={16} />
                {t.settings.exportData}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t.settings.exportDesc}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <button
                onClick={clearAllData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 size={16} />
                {t.settings.deleteAll}
              </button>
              <p className="text-xs text-red-600 dark:text-red-400 text-center">
                {t.settings.deleteWarning}
              </p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t.settings.about}
            </h2>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t.settings.version}</span>
              <span className="text-gray-900 dark:text-white font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t.settings.platform}</span>
              <span className="text-gray-900 dark:text-white font-medium">Web</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800">
              {t.appName} - {t.appMotto} {t.settings.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
