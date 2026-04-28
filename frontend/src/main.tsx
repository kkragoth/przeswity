import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';

function App() {
    return (
        <div className="min-h-dvh flex items-center justify-center">
            <div className="rounded-lg border bg-white shadow-sm p-8">
                <h1 className="text-2xl font-semibold">Prześwity</h1>
                <p className="mt-2 text-stone-600">Frontend scaffold loaded.</p>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
