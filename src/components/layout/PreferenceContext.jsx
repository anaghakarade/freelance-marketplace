import React, { createContext, useContext, useState, useEffect } from 'react';

const PreferenceContext = createContext();

export const usePreference = () => useContext(PreferenceContext);

export const PreferenceProvider = ({ children }) => {
  // Theme state: 'light', 'dark', or 'system'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('workstream-theme') || 'system';
  });

  // Motion state: 'standard' or 'reduced'
  const [motion, setMotion] = useState(() => {
    const saved = localStorage.getItem('workstream-motion');
    if (saved) return saved;
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'reduced';
    }
    return 'standard';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (t) => {
      let activeTheme = t;
      if (t === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      root.setAttribute('data-theme', activeTheme);
    };

    applyTheme(theme);
    localStorage.setItem('workstream-theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme]);

  // Apply motion class to document
  useEffect(() => {
    localStorage.setItem('workstream-motion', motion);
    const root = document.documentElement;
    if (motion === 'reduced') {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [motion]);

  return (
    <PreferenceContext.Provider value={{ theme, setTheme, motion, setMotion }}>
      {children}
    </PreferenceContext.Provider>
  );
};
