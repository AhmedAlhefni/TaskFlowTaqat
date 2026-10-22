import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  const savedLanguage = localStorage.getItem('taskflow_lang');
  const language = savedLanguage === 'ar' ? 'ar' : 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
} catch {
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
}

createRoot(document.getElementById('root')!).render(<App />);
