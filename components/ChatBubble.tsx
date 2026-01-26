import React, { useState } from 'react';
import { Message, Role } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { db, collection, addDoc, serverTimestamp } from '../firebase';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleFeedback = async (rating: 'up' | 'down') => {
    if (feedback === rating) return; // Prevent duplicate
    setFeedback(rating);

    try {
      // Write to 'feedback' collection
      await addDoc(collection(db, 'feedback'), {
        messageId: message.id || 'unknown',
        content: message.content,
        rating: rating,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Error sending feedback", e);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 animate-fade-in-up">
        {/* User Bubble - Unchanged */}
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <div className="bg-primary text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md shadow-indigo-200/50 dark:shadow-none">
            <p className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          {/* Attachment Rendering Stub if needed */}
          {message.attachment && (
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">attachment</span>
              {message.attachment.fileName || 'Attachment'}
            </div>
          )}
        </div>
        <div className="size-8 rounded-full bg-indigo-200 border-2 border-white shadow-sm shrink-0 mt-auto hidden sm:flex items-center justify-center text-indigo-700 font-bold text-xs">
          YOU
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-4 animate-fade-in-up">
      <div className="shrink-0 mt-1">
        <img alt="AI Avatar" className="size-8 object-contain" src="/logo.png" />
      </div>
      <div className="flex flex-col max-w-[90%] sm:max-w-[85%]">
        <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 px-6 py-5 rounded-2xl rounded-tl-sm shadow-sm space-y-4">
          <div className="text-slate-800 dark:text-slate-200 text-[15px] sm:text-base leading-7">
            <MarkdownRenderer content={message.content || ''} />
          </div>
          <div className="flex items-center gap-2 mt-2 ml-1 border-t border-slate-100 dark:border-slate-800 pt-3">
            <button
              onClick={() => handleFeedback('up')}
              className={`p-1 rounded transition-colors ${feedback === 'up' ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="Helpful"
            >
              <span className={`material-symbols-outlined text-[18px] ${feedback === 'up' ? 'fill-current' : ''}`}>thumb_up</span>
            </button>
            <button
              onClick={() => handleFeedback('down')}
              className={`p-1 rounded transition-colors ${feedback === 'down' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="Not Helpful"
            >
              <span className={`material-symbols-outlined text-[18px] ${feedback === 'down' ? 'fill-current' : ''}`}>thumb_down</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button
              onClick={handleCopy}
              className={`p-1 rounded transition-colors flex items-center gap-1 ${copied ? 'text-green-600 dark:text-green-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="Copy"
            >
              <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'content_copy'}</span>
              {copied && <span className="text-xs font-medium">Copied</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};