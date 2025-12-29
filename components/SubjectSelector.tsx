import React from 'react';
import { Subject } from '../types';

interface SubjectSelectorProps {
  currentSubject: Subject;
  onSelect: (subject: Subject) => void;
}

const subjects = Object.values(Subject);

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({ currentSubject, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6 justify-center">
      {subjects.map((sub) => (
        <button
          key={sub}
          onClick={() => onSelect(sub)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
            ${currentSubject === sub 
              ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}
          `}
        >
          {sub}
        </button>
      ))}
    </div>
  );
};