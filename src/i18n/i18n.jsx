import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './translations/en';
import { hi } from './translations/hi';

const translations = { en, hi };

const I18nContext = createContext();

export const useTranslation = () => useContext(I18nContext);

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('workstream-locale') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('workstream-locale', locale);
    // Apply lang attribute to html element
    document.documentElement.setAttribute('lang', locale);
    // For logical layout extensibility
    document.documentElement.setAttribute('dir', 'ltr');
  }, [locale]);

  const t = (key) => {
    if (!key) return '';
    const keys = key.split('.');

    // Resolve for active locale
    let value = translations[locale];
    for (const k of keys) {
      value = value ? value[k] : null;
    }
    if (value !== undefined && value !== null) return value;

    // Fallback to English
    let fallbackValue = translations['en'];
    for (const k of keys) {
      fallbackValue = fallbackValue ? fallbackValue[k] : null;
    }
    return fallbackValue !== undefined && fallbackValue !== null ? fallbackValue : key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};
