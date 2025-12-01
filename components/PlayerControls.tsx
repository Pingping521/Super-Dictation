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
    <div className="bg-white border-t-2 border-black p-4 pb-8 shadow-[0_-4px_0_0_rgba(0,0,0,1)] z-50 relative">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div 
          ref={progressBarRef}
          className="relative h-6 w-full bg-gray-200 border-2 border-black rounded-full mb-4 cursor-pointer overflow-hidden touch-none"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-brand-orange transition-all duration-100"
            style={{ width: `${(playerState.currentTime / (playerState.duration || 1)) * 100}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex justify-between items-center px-4 relative">
          
          {/* Left: Time */}
          <div className="text-xs font-bold font-mono w-10">
              {formatTime(playerState.currentTime)}
          </div>

          {/* Center: Prev | Play | Next */}
          <div className="flex items-center gap-2">
              {/* Prev */}
              <Button 
                  variant="secondary" 
                  className="px-3 h-10 rounded-xl text-xs sm:text-sm font-bold shadow-fun-sm whitespace-nowrap"
                  onClick={onPrev}
              >
                  上一句
              </Button>

              {/* Play */}
              <Button 
                  variant="primary" 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl !p-0 shadow-fun mx-2"
                  onClick={onTogglePlay}
              >
                  {playerState.isPlaying ? '⏸' : '▶'}
              </Button>

              {/* Next */}
              <Button 
                  variant="secondary" 
                  className="px-3 h-10 rounded-xl text-xs sm:text-sm font-bold shadow-fun-sm whitespace-nowrap"
                  onClick={onNext}
              >
                  下一句
              </Button>
          </div>
          
          {/* Right: Speed */}
          <div className="relative">
              {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white border-2 border-black rounded-xl shadow-fun p-1 flex flex-col gap-1 w-16 z-50">
                      {speeds.map(s => (
                          <button 
                              key={s}
                              onClick={() => handleSpeedChange(s)}
                              className={`px-2 py-1 text-sm font-bold rounded hover:bg-gray-100 ${playerState.playbackRate === s ? 'bg-brand-yellow' : ''}`}
                          >
                              {s}x
                          </button>
                      ))}
                  </div>
              )}
              <Button 
                  variant="secondary" 
                  className="w-12 h-10 px-0 flex items-center justify-center text-sm" 
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