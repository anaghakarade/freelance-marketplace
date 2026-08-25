// Re-export everything from the .jsx version so that existing imports
// pointing to 'i18n/i18n' (without an explicit extension) keep working.
// The JSX lives in i18n.jsx — Vite handles it correctly there.
export { useTranslation, I18nProvider } from './i18n.jsx';
