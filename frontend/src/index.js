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
      duration={1500}
      icons={{
        success: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
        error: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
        warning: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
        info: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
      }}
      toastOptions={{
        style: {
          background: 'rgba(12, 12, 14, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          color: 'rgba(255, 255, 255, 0.85)',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          gap: '8px',
          minHeight: 'unset',
        },
      }}
    />
  </React.StrictMode>,
);
