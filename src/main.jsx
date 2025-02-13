import React from 'react';
import ReactDOM from 'react-dom';
import PdfUploadChatGPTApp from './PdfUploadChatGPTApp';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PdfUploadChatGPTApp />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
);