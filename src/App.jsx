import { useMemo, useState } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from './theme';
import PdfUploadChatGPTApp from './PdfUploadChatGPTApp';

export default function App() {
  const [themeMode, setThemeMode] = useState(() => {
    const storedTheme = localStorage.getItem('theme-mode');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  const handleThemeToggle = () => {
    setThemeMode((currentMode) => {
      const nextMode = currentMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', nextMode);
      return nextMode;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App" style={{ minHeight: '100vh', padding: '2rem' }}>
        <PdfUploadChatGPTApp
          isDarkMode={themeMode === 'dark'}
          onToggleDarkMode={handleThemeToggle}
        />
      </div>
    </ThemeProvider>
  );
}
