import React from 'react';
import ReactDOM from 'react-dom/client'; // Changed import from 'react-dom' to 'react-dom/client'
import App from './App';

// Get the root element from your HTML (typically with id 'root')
const container = document.getElementById('root');

// Create a root using React 18 API
const root = ReactDOM.createRoot(container);

// Render your application using the 'root' object
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);