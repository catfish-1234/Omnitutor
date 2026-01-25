import React from 'react';
import { Message, Role } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 animate-fade-in-up">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <div className="bg-primary text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md shadow-indigo-200/50 dark:shadow-none">
            <p className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
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
            <button className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">thumb_up</span>
            </button>
            <button className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">thumb_down</span>
            </button>
            <button className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};