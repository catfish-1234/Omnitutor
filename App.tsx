
import { useState, useRef, useEffect } from 'react';
import { Subject, Role } from './types';
import { useFirestore } from './hooks/useFirestore';
import { useAI } from './hooks/useAI';
import { ChatBubble } from './components/ChatBubble';
import { SubjectSelector } from './components/SubjectSelector';
import { SettingsModal } from './components/SettingsModal';
import { signInWithPopup, signOut, auth, GoogleAuthProvider, onAuthStateChanged, signInAnonymously } from './firebase';

function App() {
  const [activeSubject, setActiveSubject] = useState<Subject>(Subject.MATH);
  const [input, setInput] = useState('');
  const [user, setUser] = useState<any>(auth.currentUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const { messages, addMessage, loadingHistory, userId, createNewChat } = useFirestore(activeSubject);
  const { sendMessage, isLoading: isThinking, statusMessage } = useAI();

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u: any) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch((err: any) => {
          console.error("Anonymous auth failed", err);
          if (err.code === 'auth/admin-restricted-operation') {
            // This error usually means Anonymous Auth is disabled in Firebase Console
            // We can't use alert() inside useEffect comfortably, so we log it.
            // Ideally we'd set an error state to show in the UI.
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleAttachment = () => {
    // Stub for future implementation
    alert("File attachments are coming soon!");
  };

  const handleVoice = () => {
    // Stub for future implementation
    alert("Voice input is coming soon!");
  };

  const handleNewChat = () => {
    createNewChat();
  };

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Textarea auto-resize logic
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      if (input === '') textareaRef.current.style.height = '52px';
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isThinking || !userId) return;

    const userText = input.trim();
    setInput(''); // Clear immediately

    // 1. Optimistic Update / Persistence
    await addMessage(userText, Role.USER);

    // 2. Call Gemini
    try {
      const response = await sendMessage(userText, activeSubject, messages);

      // 3. Persist Response
      await addMessage(response, Role.MODEL);
    } catch (error) {
      console.error("Failed to get response", error);
      // Optional: Add visible error feedback to user
      await addMessage("Sorry, I'm having trouble connecting to the AI tutor right now. Please try again later.", Role.MODEL);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} />

      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-700/50 bg-sidebar flex-shrink-0 transition-colors duration-200">
        <div className="p-5 flex items-center gap-3">
          <img alt="OmniTutor Logo" className="h-10 w-auto" src="/logo.png" />
          <h1 className="text-xl font-bold tracking-tight text-white">OmniTutor</h1>
        </div>
        <div className="px-4 pb-4">
          <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          <div>
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Today</h3>
            <div className="flex flex-col gap-1">
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg bg-primary/20 text-indigo-200 font-medium text-sm transition-colors text-left group border border-primary/30">
                <span className="material-symbols-outlined text-[20px] text-indigo-300">
                  {activeSubject === Subject.MATH ? 'calculate' :
                    activeSubject === Subject.PHYSICS ? 'science' :
                      activeSubject === Subject.CHEMISTRY ? 'biotech' :
                        activeSubject === Subject.BIOLOGY ? 'eco' :
                          activeSubject === Subject.HISTORY ? 'history_edu' :
                            activeSubject === Subject.LITERATURE ? 'book_2' :
                              activeSubject === Subject.CODING ? 'code' : 'school'}
                </span>
                <span className="truncate">Active Session: {activeSubject}</span>
              </button>
            </div>
          </div>
          <div>
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested</h3>
            <div className="flex flex-col gap-1">
              {!user || user.isAnonymous ? (
                <>
                  <button onClick={() => setActiveSubject(Subject.MATH)} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors text-left group">
                    <span className="material-symbols-outlined text-[20px] text-slate-500 group-hover:text-slate-400">calculate</span>
                    <span className="truncate">Algebra Basics</span>
                  </button>
                  <button onClick={() => setActiveSubject(Subject.HISTORY)} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors text-left group">
                    <span className="material-symbols-outlined text-[20px] text-slate-500 group-hover:text-slate-400">history_edu</span>
                    <span className="truncate">World War II</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setActiveSubject(Subject.PHYSICS)} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors text-left group">
                    <span className="material-symbols-outlined text-[20px] text-slate-500 group-hover:text-slate-400">science</span>
                    <span className="truncate">Physics Help</span>
                  </button>
                  <button onClick={() => setActiveSubject(Subject.CODING)} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors text-left group">
                    <span className="material-symbols-outlined text-[20px] text-slate-500 group-hover:text-slate-400">code</span>
                    <span className="truncate">Coding Assistant</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/50">
          {!user || user.isAnonymous ? (
            <button onClick={handleSignIn} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors font-medium">
              <span>Sign In</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left group relative cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
              <div className="size-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs border border-slate-600 overflow-hidden">
                {user?.photoURL ? <img src={user.photoURL} alt="User" /> : 'ME'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.displayName || 'User'}</p>
              </div>
              <button className="text-slate-500 hover:text-white transition-colors p-1" title="Settings">
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </button>
            </div>
          )}
        </div>

        {
          authError && (
            <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {authError}
            </div>
          )
        }
      </aside >

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative w-full bg-background-light dark:bg-slate-900 overflow-hidden">

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-sidebar z-20 text-white shrink-0">
          <div className="flex items-center gap-2">
            <img alt="OmniTutor Logo" className="h-8 w-auto" src="/logo.png" />
            <span className="font-bold text-lg">OmniTutor</span>
          </div>
          <button className="text-slate-300 hover:text-white">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        {/* Chat List - Takes available space */}
        <div className="flex-1 overflow-y-auto scroll-smooth w-full p-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="flex justify-center">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1 rounded-full shadow-sm">
                Today
              </span>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center opacity-60 mt-10 p-6">
                <span className="material-symbols-outlined text-6xl text-indigo-300 mb-4">school</span>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Hello, {user?.displayName?.split(' ')[0] || 'Guest'}!</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  I'm your {activeSubject} tutor. Ask me a question below to get started!
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))
            )}

            {/* Thinking Indicator */}
            {(isThinking || statusMessage) && (
              <div className="flex justify-start gap-4 animate-pulse">
                <div className="shrink-0 mt-1">
                  <img alt="AI Avatar" className="size-8 object-contain" src="/logo.png" />
                </div>
                <div className="bg-surface-light dark:bg-surface-dark px-6 py-4 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200">
                  {statusMessage ? (
                    <div className="flex gap-2 items-center text-amber-600 dark:text-amber-400 font-medium text-sm">
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                      <span>{statusMessage}</span>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area - Fixed at bottom via flex layout */}
        <div className="w-full bg-background-light dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-4 md:py-6 shrink-0 bg-opacity-95 backdrop-blur-sm z-10">
          <div className="max-w-3xl mx-auto w-full">
            <div className="bg-surface-light dark:bg-surface-dark border border-slate-300 dark:border-slate-600 rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200 flex flex-col sm:flex-row overflow-visible">

              {/* Custom Subject Selector (Pill Style) */}
              <SubjectSelector activeSubject={activeSubject} onSelect={setActiveSubject} />

              {/* Text Input */}
              <div className="flex-1 relative flex items-center">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-0 focus:ring-0 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-3.5 px-4 resize-none min-h-[52px] max-h-32 text-base leading-relaxed"
                  placeholder="Ask a question..."
                  rows={1}
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 px-3 py-2 sm:py-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/50 justify-between sm:justify-start bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent">
                <button
                  onClick={handleAttachment}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors tooltip-trigger"
                  title="Attach file"
                >
                  <span className="material-symbols-outlined text-[20px]">attach_file</span>
                </button>
                <button
                  onClick={handleVoice}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors hidden sm:block"
                  title="Voice Input"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || isThinking}
                  className="bg-primary hover:bg-primary-hover text-white p-2 rounded-xl transition-colors shadow-sm flex items-center justify-center ml-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px] group-hover:translate-x-0.5 transition-transform">send</span>
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
              OmniTutor can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </main>
    </div >
  );
}

export default App;