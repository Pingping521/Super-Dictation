import React, { useState } from 'react';
import { TranscriptSegment } from '../types';
import { Button } from './Button';

interface SentenceItemProps {
  segment: TranscriptSegment;
  isActive: boolean;
  showEn: boolean;
  showZh: boolean;
  isLoopingThis: boolean;
  onWordClick: (word: string) => void;
  onToggleLoop: () => void;
  onSeek: () => void;
}

export const SentenceItem: React.FC<SentenceItemProps> = ({
  segment,
  isActive,
  showEn,
  showZh,
  isLoopingThis,
  onWordClick,
  onToggleLoop,
  onSeek,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  // Split sentence into words
  const words = segment.en.split(' ');

  // Visibility Logic:
  // If a master switch is ON, it enforces strict visibility (Only EN or Only ZH).
  // Local 'isRevealed' (Peek) only works if BOTH master switches are OFF.
  // This ensures "hide" is invalid/disabled when a master switch is active.
  const isEnglishVisible = showEn || (!showZh && isRevealed);
  const isChineseVisible = showZh || (!showEn && isRevealed);

  // Button only shows if no master switch is active (Dictation Mode)
  const showPeekButton = !showEn && !showZh;

  const handleWordClick = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    
    // Only allow click if English is visible
    if (!isEnglishVisible) return;

    // Remove punctuation for lookup
    const cleanWord = word.replace(/[.,!?;:"'()]/g, "");
    onWordClick(cleanWord);
  };

  return (
    <div 
      onClick={onSeek}
      className={`
        relative p-6 mb-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
        ${isActive 
          ? 'bg-brand-blue border-black shadow-fun scale-[1.02]' 
          : 'bg-white border-gray-200 hover:border-brand-blue'
        }
      `}
    >
      {/* English Text */}
      <div className={`mt-2 text-xl font-bold leading-relaxed ${!isEnglishVisible ? 'blur-md text-gray-300 select-none' : 'text-black'}`}>
        {words.map((word, idx) => (
          <span 
            key={idx} 
            className={`${isEnglishVisible ? 'hover:text-brand-orange hover:underline cursor-pointer' : 'cursor-default'} inline-block mr-1`}
            onClick={(e) => handleWordClick(e, word)}
          >
            {word}
          </span>
        ))}
      </div>

      {/* Chinese Text */}
      <div className={`mt-2 text-gray-700 font-medium ${!isChineseVisible ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
        {segment.zh}
      </div>

      {/* Active Controls */}
      {isActive && (
        <div className="mt-4 flex flex-wrap gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
           <Button 
            variant={isLoopingThis ? 'primary' : 'secondary'} 
            className="text-xs py-1 px-2 h-8"
            onClick={onToggleLoop}
          >
            {isLoopingThis ? '🔁 Looping' : '🔁 Loop Sentence'}
          </Button>
          
          {showPeekButton && (
             <Button 
             variant="ghost" 
             className="text-xs py-1 px-2 h-8 border border-gray-300 bg-white"
             onClick={() => setIsRevealed(!isRevealed)}
           >
             {isRevealed ? '🙈 Hide' : '👀 Peek'}
           </Button>
          )}
        </div>
      )}
    </div>
  );
};