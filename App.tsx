
import { useState, useRef, useEffect } from 'react';
import { Subject, Role, Attachment } from './types';
import { useFirestore, useChatList } from './hooks/useFirestore';
import { useAI } from './hooks/useAI';
import { useVoice } from './hooks/useVoice';
import { ChatBubble } from './components/ChatBubble';
import { SubjectSelector } from './components/SubjectSelector';
import { SettingsModal } from './components/SettingsModal';
import { signInWithPopup, signOut, auth, GoogleAuthProvider, onAuthStateChanged, signInAnonymously } from './firebase';

function App() {
  const [activeSubject, setActiveSubject] = useState<Subject>(Subject.MATH);
  const [input, setInput] = useState('');
  const [user, setUser] = useState<any>(auth.currentUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enterToSend, setEnterToSend] = useState(localStorage.getItem('enterToSend') !== 'false');

  const [sessionPrompts, setSessionPrompts] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Listen for storage changes (SettingsModal updates)
  useEffect(() => {
    const handleStorage = () => {
      setEnterToSend(localStorage.getItem('enterToSend') !== 'false');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const { messages, addMessage, loadingHistory, userId, createNewChat } = useFirestore(activeSubject);
  const { sessions: chatSessions, loading: loadingSessions } = useChatList();
  const { sendMessage, isLoading: isThinking, statusMessage } = useAI();
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoice();

  // Sync Voice Transcript to Input
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileType = file.type;
      const fileName = file.name;

      // Subject Restrictions
      if (activeSubject === Subject.CODING) {
        const allowedExtensions = ['.py', '.js', '.html', '.css', '.ts', '.json'];
        const isAllowed = allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

        if (isAllowed) {
          const textInfo = await file.text();
          setAttachment({
            content: textInfo,
            type: 'text',
            fileName: fileName,
            mimeType: fileType
          });
          return;
        }
      }

      if ([Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY, Subject.BIOLOGY].includes(activeSubject)) {
        // Allow images
        if (fileType.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setAttachment({
                content: event.target.result as string,
                type: 'image',
                fileName: fileName,
                mimeType: fileType
              });
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      // Default/Fallback Logic or Error
      alert(`File type not supported for ${activeSubject}. \nCoding: .py, .js, .html\nScience/Math: Images`);
      e.target.value = ''; // Reset input
    }
  };

  const handleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
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
    await addMessage(userText, Role.USER, attachment);

    // 2. Call Gemini
    try {
      // Add to session prompts if not exists
      if (!sessionPrompts.includes(userText)) {
        setSessionPrompts(prev => [...prev, userText]);
      }

      const response = await sendMessage(userText, activeSubject, messages, attachment);

      // Clear attachment after send
      setAttachment(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // 3. Persist Response
      await addMessage(response, Role.MODEL);
    } catch (error) {
      console.error("Failed to get response", error);
      // Optional: Add visible error feedback to user
      await addMessage("Sorry, I'm having trouble connecting to the AI tutor right now. Please try again later.", Role.MODEL);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (enterToSend) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    } else {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };



  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-slate-700/50 bg-sidebar transition-transform duration-300 md:translate-x-0 md:static md:flex ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">My Chats</h3>
            <div className="flex flex-col gap-1">
              {loadingSessions ? (
                <div className="text-slate-500 text-xs px-3">Loading...</div>
              ) : chatSessions.length === 0 ? (
                <div className="text-slate-500 text-xs px-3">No chats yet.</div>
              ) : (
                chatSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSubject(session.subject)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg font-medium text-sm transition-colors text-left group border ${activeSubject === session.subject ? 'bg-primary/20 text-indigo-200 border-primary/30' : 'text-slate-300 hover:bg-slate-800 border-transparent'}`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${activeSubject === session.subject ? 'text-indigo-300' : 'text-slate-500'}`}>
                      {session.subject === Subject.MATH ? 'calculate' :
                        session.subject === Subject.PHYSICS ? 'science' :
                          session.subject === Subject.CHEMISTRY ? 'biotech' :
                            session.subject === Subject.CODING ? 'code' : 'school'}
                    </span>
                    <span className="truncate">{session.subject}</span>
                  </button>
                ))
              )}
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
          <button className="text-slate-300 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
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
            <div className="bg-surface-light dark:bg-surface-dark border border-slate-300 dark:border-slate-600 rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200 flex flex-col sm:flex-row overflow-visible relative">

              {/* Prompt History Bubbles (Gemini Style) */}
              {sessionPrompts.length > 0 && (
                <div className="absolute top-[-36px] right-0 flex justify-end gap-2 overflow-x-auto max-w-full pb-2 no-scrollbar px-1">
                  {sessionPrompts.slice(-3).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(p)}
                      className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap max-w-[150px] truncate transition-colors opacity-0 animate-fade-in-up"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

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

                {/* Attachment Indicator */}
                {attachment && (
                  <div className="absolute top-[-40px] left-0 bg-white dark:bg-slate-800 p-2 rounded shadow flex items-center gap-2 text-xs border border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      {attachment.type === 'image' ? 'image' : 'description'}
                    </span>
                    <span className="truncate max-w-[150px]">{attachment.fileName}</span>
                    <button onClick={() => { setAttachment(undefined); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="hover:text-red-500">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 px-3 py-2 sm:py-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/50 justify-between sm:justify-start bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent relative">

                {/* Tools Menu */}
                <div className="relative group">
                  <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors" title="AI Tools">
                    <span className="material-symbols-outlined text-[20px]">handyman</span>
                  </button>
                  {/* Hover Dropdown */}
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all transform origin-bottom-left z-50 overflow-hidden flex flex-col">
                    <button
                      onClick={() => {
                        if (messages.length === 0) {
                          alert("Start a conversation first before generating a quiz.");
                          return;
                        }
                        setInput("Create a 5-question multiple choice quiz based on our conversation so far.");
                        if (textareaRef.current) textareaRef.current.focus();
                      }}
                      className="px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px] text-indigo-500">quiz</span>
                      Generate Quiz
                    </button>
                    <button
                      onClick={() => {
                        if (messages.length === 0) {
                          alert("Start a conversation first before creating flashcards.");
                          return;
                        }
                        setInput("Summarize the key concepts of this chat into a Markdown table with 'Front' and 'Back' columns for flashcards.");
                        if (textareaRef.current) textareaRef.current.focus();
                      }}
                      className="px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2 border-t border-slate-100 dark:border-slate-700"
                    >
                      <span className="material-symbols-outlined text-[18px] text-emerald-500">style</span>
                      Make Flashcards
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAttachment}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors tooltip-trigger"
                  title="Attach file"
                >
                  <span className="material-symbols-outlined text-[20px]">attach_file</span>
                </button>
                <button
                  onClick={handleVoice}
                  className={`p-2 rounded-full transition-colors hidden sm:block ${isListening ? 'text-red-500 bg-red-100 animate-pulse' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                  title={isListening ? "Stop Listening" : "Voice Input"}
                >
                  <span className="material-symbols-outlined text-[20px]">{isListening ? 'mic_off' : 'mic'}</span>
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
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
          </div>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
            OmniTutor can make mistakes. Consider checking important information.
          </p>
        </div>

      </main >
    </div >
  );
}

export default App;