import React, { useState, useEffect } from 'react';
import { auth, signOut, updateProfile } from '../firebase';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

type Tab = 'general' | 'profile' | 'appearance' | 'account';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
    const [enterToSend, setEnterToSend] = useState(localStorage.getItem('enterToSend') !== 'false'); // Default true

    useEffect(() => {
        localStorage.setItem('enterToSend', String(enterToSend));
        // We need to trigger an update in App.tsx? 
        // LocalStorage usage in React often requires an event or context to sync across components.
        // For simplicity, we can dispatch a custom event or just assume App reads it on mount/focus.
        // A better way is to pass a callback or use a Context. 
        // Given existing code structure, dispatching storage event works for cross-tab, but same-tab needs manual dispatch.
        window.dispatchEvent(new Event('storage'));
    }, [enterToSend]);

    // Sync displayName when user changes
    useEffect(() => {
        if (user) setDisplayName(user.displayName || '');
    }, [user]);

    // Theme Logic
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            // System
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsUpdating(true);
        try {
            await updateProfile(user, {
                displayName: displayName
            });
            // Force reload or state update if needed, typically Auth listener handles it? 
            // Auth listener might not trigger on simple profile update immediate reflection?
            // Usually it does.
        } catch (e) {
            console.error(e);
            alert("Failed to update profile");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && user) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    try {
                        // Use Base64 as photoURL (Not recommended for prod but allowed for < 100kb usually)
                        // Verify size? 
                        await updateProfile(user, {
                            photoURL: event.target.result as string
                        });
                    } catch (error) {
                        console.error("Failed to update avatar", error);
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-48 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">tune</span>
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">person</span>
                            Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('appearance')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'appearance' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">palette</span>
                            Appearance
                        </button>
                        <button
                            onClick={() => setActiveTab('account')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'account' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                            Account
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-900">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Chat Preferences</h3>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <div className="font-medium text-slate-900 dark:text-white">Press Enter to Send</div>
                                            <div className="text-sm text-slate-500">
                                                {enterToSend ? 'Enter sends, Shift+Enter new line' : 'Enter new line, Ctrl+Enter sends'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEnterToSend(!enterToSend)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enterToSend ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enterToSend ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="relative group cursor-pointer">
                                        <div className="size-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold border-2 border-indigo-200 overflow-hidden">
                                            {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : 'ME'}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="material-symbols-outlined text-white">edit</span>
                                        </div>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarChange} accept="image/*" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{user?.displayName || 'Guest User'}</h3>
                                        <p className="text-slate-500 text-sm">{user?.email || 'No email linked'}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isUpdating}
                                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isUpdating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Theme Preference</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <button onClick={() => setTheme('light')} className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'}`}>
                                            <span className="material-symbols-outlined text-3xl">light_mode</span>
                                            <span className="text-sm font-medium">Light</span>
                                        </button>
                                        <button onClick={() => setTheme('dark')} className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'}`}>
                                            <span className="material-symbols-outlined text-3xl">dark_mode</span>
                                            <span className="text-sm font-medium">Dark</span>
                                        </button>
                                        <button onClick={() => setTheme('system')} className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${theme === 'system' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'}`}>
                                            <span className="material-symbols-outlined text-3xl">contrast</span>
                                            <span className="text-sm font-medium">System</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="space-y-6">
                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <h4 className="text-red-700 dark:text-red-400 font-medium mb-2">Danger Zone</h4>
                                    <p className="text-red-600/80 dark:text-red-400/80 text-sm mb-4">Sign out of your account on this device.</p>
                                    <button onClick={() => { signOut(auth); onClose(); }} className="px-4 py-2 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-800 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
