
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

/**
 * Enhanced Clerk key retrieval.
 */
const getClerkKey = (): string | null => {
    try {
        const metaEnv = (import.meta as any).env || {};
        const processEnv = (window as any).process?.env || {};
        const allEnv = { ...processEnv, ...metaEnv };
        
        const standardKey = allEnv.VITE_CLERK_PUBLISHABLE_KEY || allEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
        if (standardKey && typeof standardKey === 'string' && standardKey.trim().startsWith('pk_') && standardKey.trim() !== 'pk_test_your_clerk_key_here') {
            return standardKey.trim();
        }

        for (const value of Object.values(allEnv)) {
            if (typeof value === 'string' && value.trim().startsWith('pk_') && value.trim() !== 'pk_test_your_clerk_key_here') {
                if (!value.trim().startsWith('sk_')) return value.trim();
            }
        }
    } catch (e) {
        console.error("Clerk key lookup error:", e);
    }
    return null;
};

const PUBLISHABLE_KEY = getClerkKey();
const rootElement = document.getElementById('root');

if (rootElement) {
    const root = createRoot(rootElement);
    if (!PUBLISHABLE_KEY) {
        root.render(
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white font-sans text-center">
                <div className="max-w-md w-full bg-slate-800 p-10 rounded-[2.5rem] border border-red-500/30 shadow-2xl">
                    <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black mb-4">ലോഗിൻ കീ ലഭ്യമല്ല</h1>
                    <div className="text-slate-400 text-sm space-y-4 mb-8 text-left bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                        <p>ലോഗിൻ സിസ്റ്റം പ്രവർത്തിക്കാൻ ആവശ്യമായ <b>VITE_CLERK_PUBLISHABLE_KEY</b> കണ്ടെത്താനായില്ല.</p>
                        <p className="text-xs font-bold text-yellow-500">പരിഹാരം:</p>
                        <ol className="list-decimal list-inside space-y-2 text-[11px]">
                            <li>Vercel Settings → Environment Variables തുറക്കുക.</li>
                            <li><b>VITE_CLERK_PUBLISHABLE_KEY</b> എന്ന പേരിൽ കീ നൽകുക.</li>
                            <li>സേവ് ചെയ്ത ശേഷം Vercel-ൽ ഒന്നുകൂടി <b>Redeploy</b> ചെയ്യുക.</li>
                        </ol>
                    </div>
                    <button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95">
                        വീണ്ടും ശ്രമിക്കുക (Retry)
                    </button>
                </div>
            </div>
        );
    } else {
        root.render(
            <React.StrictMode>
                <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
                    <ThemeProvider>
                        <LanguageProvider>
                            <App />
                        </LanguageProvider>
                    </ThemeProvider>
                </ClerkProvider>
            </React.StrictMode>
        );
    }
}
