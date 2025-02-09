import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/designTokens.css'; // Global design tokens
import './index.css'; // Other global styles if any

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
