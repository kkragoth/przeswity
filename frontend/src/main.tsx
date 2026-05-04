import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import './styles/globals.css';
import '@/editor/styles/tokens.css';
import '@/components/layout/topbar.css';
import './i18n';
import '@/api/client';
import { router } from '@/app/router';
import { ThemeProvider } from '@/contexts/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    </React.StrictMode>,
);
