import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import PdfUploadChatGPTApp from './PdfUploadChatGPTApp';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <PdfUploadChatGPTApp />
      </div>
    </ThemeProvider>
  );
}
