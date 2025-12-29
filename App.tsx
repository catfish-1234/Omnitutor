import React, { useState, useRef, useEffect } from 'react';
import { Subject, Role } from './types';
import { useFirestore } from './hooks/useFirestore';
import { useGemini } from './hooks/useGemini';
import { ChatBubble } from './components/ChatBubble';

function App() {
  const [activeSubject, setActiveSubject] = useState<Subject>(Subject.MATH);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Custom Hooks
  const { messages, addMessage, loadingHistory, userId } = useFirestore(activeSubject);
  const { sendMessage, isLoading: isThinking } = useGemini();

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
      
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-700/50 bg-sidebar flex-shrink-0 transition-colors duration-200">
        <div className="p-5 flex items-center gap-3">
          <img alt="OmniTutor Logo" className="h-10 w-auto" src="/logo.png" />
          <h1 className="text-xl font-bold tracking-tight text-white">OmniTutor</h1>
        </div>
        <div className="px-4 pb-4">
          <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          <div>
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Today</h3>
            <div className="flex flex-col gap-1">
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg bg-primary/20 text-indigo-200 font-medium text-sm transition-colors text-left group border border-primary/30">
                <span className="material-symbols-outlined text-[20px] text-indigo-300">functions</span>
                <span className="truncate">Active Session: {activeSubject}</span>
              </button>
            </div>
          </div>
          <div>
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested</h3>
             <div className="flex flex-col gap-1">
                <button onClick={() => setActiveSubject(Subject.PHYSICS)} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors text-left group">
                  <span className="material-symbols-outlined text-[20px] text-slate-500 group-hover:text-slate-400">science</span>
                  <span className="truncate">Physics Help</span>
                </button>
                <button onClick={() => setActiveSubject(Subject.CODING)} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors text-left group">
                  <span className="material-symbols-outlined text-[20px] text-slate-500 group-hover:text-slate-400">code</span>
                  <span className="truncate">Coding Assistant</span>
                </button>
             </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/50">
          <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left">
            <div className="size-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs border border-slate-600">
               ME
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Student User</p>
              <p className="text-xs text-slate-400 truncate">Free Plan</p>
            </div>
            <span className="material-symbols-outlined text-slate-500">settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative w-full bg-background-light dark:bg-slate-900">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-sidebar z-20 text-white">
          <div className="flex items-center gap-2">
            <img alt="OmniTutor Logo" className="h-8 w-auto" src="/logo.png" />
            <span className="font-bold text-lg">OmniTutor</span>
          </div>
          <button className="text-slate-300 hover:text-white">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scroll-smooth w-full">
          <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6 pb-40">
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
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Hello!</h3>
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
            {isThinking && (
               <div className="flex justify-start gap-4 animate-pulse">
                  <div className="size-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-1">
                    <img alt="AI Avatar" className="h-5 w-auto" src="/logo.png" />
                  </div>
                  <div className="bg-surface-light dark:bg-surface-dark px-6 py-4 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200">
                      <div className="flex gap-1">
                         <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                         <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                         <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                      </div>
                  </div>
               </div>
            )}
            
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area (Fixed Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-background-light dark:bg-slate-900 bg-opacity-95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 px-4 py-4 md:py-6 z-10">
          <div className="max-w-3xl mx-auto">
            <div className="bg-surface-light dark:bg-surface-dark border border-slate-300 dark:border-slate-600 rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200 flex flex-col sm:flex-row overflow-hidden">
              
              {/* Subject Select */}
              <div className="relative flex items-center border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700 px-3 py-2 sm:py-0 bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent">
                <span className="material-symbols-outlined absolute left-3 text-primary text-[20px] pointer-events-none">functions</span>
                <select 
                    value={activeSubject}
                    onChange={(e) => setActiveSubject(e.target.value as Subject)}
                    className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 pl-8 pr-8 py-2 outline-none cursor-pointer appearance-none min-w-[130px] border-none focus:ring-0"
                >
                    {Object.values(Subject).map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                    ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
              </div>

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
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors tooltip-trigger" title="Attach file">
                  <span className="material-symbols-outlined text-[20px]">attach_file</span>
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors hidden sm:block" title="Voice Input">
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
    </div>
  );
}

export default App;