import React from 'react';
import ReactDOM from 'react-dom/client';
import Page from './app/page';
import { AuthProvider } from './src/auth/AuthContext.tsx'; // ← Correct path to your file location

// We import page from app/page which acts as the new App root.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <Page />
    </AuthProvider>
  </React.StrictMode>
);
