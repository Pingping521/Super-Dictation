import React from 'react';
import { VocabWord } from '../types';
import { Button } from './Button';

interface VocabModalProps {
  wordData: VocabWord | null;
  isLoading: boolean;
  onClose: () => void;
}

export const VocabModal: React.FC<VocabModalProps> = ({ wordData, isLoading, onClose }) => {
  if (!wordData && !isLoading) return null;

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wordData?.word) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordData.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white border-2 border-black shadow-fun rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-8 flex flex-col items-center gap-4">
             <div className="animate-spin text-4xl">🤔</div>
             <p className="font-bold text-gray-500">Thinking...</p>
          </div>
        ) : wordData ? (
          <>
            <div className="bg-brand-yellow p-6 border-b-2 border-black flex justify-between items-start flex-none">
              <div>
                 <h2 className="text-3xl font-black">{wordData.word}</h2>
                 <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {wordData.partOfSpeech && (
                        <span className="italic font-serif text-gray-800 bg-white/50 px-2 py-0.5 rounded-md text-sm border border-black/10">
                            {wordData.partOfSpeech}
                        </span>
                    )}
                    {wordData.phonetic && (
                        <span className="text-gray-700 font-mono text-sm">
                            /{wordData.phonetic.replace(/\//g, '')}/
                        </span>
                    )}
                 </div>
              </div>
              <button 
                onClick={handlePlayAudio}
                className="bg-white hover:bg-gray-100 p-3 rounded-xl border-2 border-black shadow-fun-sm active:translate-y-1 active:shadow-none transition-all flex items-center justify-center flex-none"
                title="Listen again"
               >
                 🔊
               </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="font-bold text-xs uppercase text-gray-500 tracking-wider">Translation</h3>
                <p className="text-xl font-bold">{wordData.definition}</p>
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase text-gray-500 tracking-wider">Example</h3>
                <p className="italic text-gray-700">"{wordData.example}"</p>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};