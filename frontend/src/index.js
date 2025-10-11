import React from "react";
import ReactDOM from "react-dom/client";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "@/index.css";
import App from "@/App";
import { Toaster } from 'sonner';

// Apply Geist fonts to document
document.documentElement.className = `${GeistSans.className} ${GeistMono.variable} antialiased`;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
    <Toaster position="top-right" richColors />
  </React.StrictMode>,
);
