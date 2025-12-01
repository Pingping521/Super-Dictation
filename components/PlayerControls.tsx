import React, { useRef, useState } from 'react';
import { PlayerState } from '../types';
import { Button } from './Button';

interface PlayerControlsProps {
  mediaRef: React.RefObject<HTMLMediaElement>;
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  mediaRef,
  playerState,
  setPlayerState,
  onTogglePlay,
  onPrev,
  onNext,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !mediaRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const width = rect.width;
    const percentage = Math.min(Math.max(clickX / width, 0), 1);
    const newTime = percentage * playerState.duration;
    mediaRef.current.currentTime = newTime;
    setPlayerState(prev => ({ ...prev, currentTime: newTime }));
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];

  const handleSpeedChange = (speed: number) => {
    if (mediaRef.current) mediaRef.current.playbackRate = speed;
    setPlayerState(prev => ({ ...prev, playbackRate: speed }));
    setShowSpeedMenu(false);
  };

  return (
    <div className="bg-white border-t-2 border-black p-2 pb-6 shadow-[0_-4px_0_0_rgba(0,0,0,1)] z-50 relative w-full">
      <div className="max-w-2xl mx-auto px-2">
        {/* Progress Bar */}
        <div 
          ref={progressBarRef}
          className="relative h-5 w-full bg-gray-200 border-2 border-black rounded-full mb-3 cursor-pointer overflow-hidden touch-none"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-brand-orange transition-all duration-100"
            style={{ width: `${(playerState.currentTime / (playerState.duration || 1)) * 100}%` }}
          />
        </div>

        {/* Controls Row - Optimized for Mobile */}
        <div className="flex justify-between items-center w-full">
          
          {/* Left: Time */}
          <div className="text-xs font-bold font-mono w-10 flex-none">
              {formatTime(playerState.currentTime)}
          </div>

          {/* Center: Controls (Flexible width, centered) */}
          <div className="flex items-center justify-center gap-1 flex-1 min-w-0 px-1">
              {/* Prev */}
              <Button 
                  variant="secondary" 
                  className="px-2 h-9 rounded-lg text-xs font-bold shadow-fun-sm whitespace-nowrap scale-95"
                  onClick={onPrev}
              >
                  上一句
              </Button>

              {/* Play */}
              <Button 
                  variant="primary" 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl !p-0 shadow-fun flex-none mx-1"
                  onClick={onTogglePlay}
              >
                  {playerState.isPlaying ? '⏸' : '▶'}
              </Button>

              {/* Next */}
              <Button 
                  variant="secondary" 
                  className="px-2 h-9 rounded-lg text-xs font-bold shadow-fun-sm whitespace-nowrap scale-95"
                  onClick={onNext}
              >
                  下一句
              </Button>
          </div>
          
          {/* Right: Speed */}
          <div className="relative w-10 flex-none flex justify-end">
              {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white border-2 border-black rounded-xl shadow-fun p-1 flex flex-col gap-1 w-14 z-50">
                      {speeds.map(s => (
                          <button 
                              key={s}
                              onClick={() => handleSpeedChange(s)}
                              className={`px-1 py-1 text-xs font-bold rounded hover:bg-gray-100 ${playerState.playbackRate === s ? 'bg-brand-yellow' : ''}`}
                          >
                              {s}x
                          </button>
                      ))}
                  </div>
              )}
              <Button 
                  variant="secondary" 
                  className="w-10 h-8 px-0 flex items-center justify-center text-xs" 
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              >
                  {playerState.playbackRate}x
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};