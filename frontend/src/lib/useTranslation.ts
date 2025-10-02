/**
 * useTranslation Hook
 * React hook to use translations in components
 */

import { useState, useEffect } from 'react';
import { getTranslations, getCurrentLanguage, type Translations, type Language } from './translations';

export function useTranslation() {
  const [language, setLanguage] = useState<Language>('de');
  const [t, setT] = useState<Translations>(getTranslations('de'));

  useEffect(() => {
    // Load initial language
    const currentLang = getCurrentLanguage();
    setLanguage(currentLang);
    setT(getTranslations(currentLang));

    // Listen for language changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'settings') {
        const currentLang = getCurrentLanguage();
        setLanguage(currentLang);
        setT(getTranslations(currentLang));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Custom event listener for same-tab updates
  useEffect(() => {
    const handleLanguageChange = () => {
      const currentLang = getCurrentLanguage();
      setLanguage(currentLang);
      setT(getTranslations(currentLang));
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  return { t, language };
}
