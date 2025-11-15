import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { Toaster } from 'sonner';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
    <Toaster 
      position="top-right"
      duration={3000}
      toastOptions={{
        style: {
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          padding: '14px 18px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
        },
        className: 'custom-toast',
      }}
    />
  </React.StrictMode>,
);
