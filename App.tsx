import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TranscriptSegment, AppState, PlayerState, VocabWord } from './types';
import { generateTranscript, getWordDefinition } from './services/geminiService';
import { Button } from './components/Button';
import { PlayerControls } from './components/PlayerControls';
import { SentenceItem } from './components/SentenceItem';
import { VocabModal } from './components/VocabModal';

const App: React.FC = () => {
  // --- State ---
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  
  // Player State
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    volume: 1.0,
    loopSingleSentence: false,
    isLoopingAll: false, // Default to false (manual loop only)
  });

  // Learning State
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [loopSegmentId, setLoopSegmentId] = useState<number | null>(null);
  const [showEn, setShowEn] = useState(false); // Default hidden
  const [showZh, setShowZh] = useState(false); // Default hidden
  
  // Vocab / Interactions
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);
  const [isLoadingWord, setIsLoadingWord] = useState(false);

  // --- Effects ---

  // Handle File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create local URL for player
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith('video') ? 'video' : 'audio');
    setAppState(AppState.PROCESSING);

    try {
      const data = await generateTranscript(file);
      setTranscript(data);
      setAppState(AppState.LEARNING);
    } catch (error) {
      alert("Error generating transcript. Please try a smaller file or check your API Key.");
      setAppState(AppState.UPLOAD);
    }
  };

  // 1. Precise Loop Watcher
  useEffect(() => {
    if (!playerState.isPlaying || loopSegmentId === null) return;
    
    const media = mediaRef.current;
    if (!media) return;

    const segment = transcript.find(s => s.id === loopSegmentId);
    if (!segment) return;

    let animId: number;
    
    const checkLoop = () => {
      // High precision check for loop end
      // Added padding: +0.5s at end to capture full word, -0.1s at start to capture attack
      if (media.currentTime >= segment.end + 0.5) {
        media.currentTime = Math.max(0, segment.start - 0.1);
      }
      animId = requestAnimationFrame(checkLoop);
    };
    
    animId = requestAnimationFrame(checkLoop);
    
    return () => cancelAnimationFrame(animId);
  }, [playerState.isPlaying, loopSegmentId, transcript]);


  // 2. General Player Sync (Progress Bar & Active Segment)
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    // Apply native loop attribute
    media.loop = playerState.isLoopingAll;

    const updateTime = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: media.currentTime,
        duration: media.duration || 0,
        isPlaying: !media.paused
      }));

      // Find active segment
      // Note: We don't handle loop logic here anymore, it is handled by the high-precision effect above
      const current = transcript.find(s => media.currentTime >= s.start && media.currentTime < s.end);
      if (current) {
        setActiveSegmentId(current.id);
      }
    };

    media.addEventListener('timeupdate', updateTime);
    media.addEventListener('loadedmetadata', updateTime);
    media.addEventListener('ended', () => setPlayerState(p => ({ ...p, isPlaying: false })));

    return () => {
      media.removeEventListener('timeupdate', updateTime);
      media.removeEventListener('loadedmetadata', updateTime);
    };
  }, [transcript, playerState.isLoopingAll]);

  // Scroll to active segment
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeSegmentId !== null && activeSegmentRef.current) {
         activeSegmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSegmentId]);

  // --- Handlers ---

  const togglePlay = useCallback(() => {
    if (mediaRef.current) {
      if (!mediaRef.current.paused) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
    }
  }, []);

  const handleWordClick = async (word: string) => {
    // 1. Speak word immediately using browser API
    window.speechSynthesis.cancel(); // Cancel any existing speech
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);

    // 2. Fetch definition
    setIsLoadingWord(true);
    setSelectedWord(null);
    if(mediaRef.current) mediaRef.current.pause(); // Auto pause
    
    // Find context context
    const contextSeg = transcript.find(t => t.id === activeSegmentId) || transcript[0];
    
    try {
      const def = await getWordDefinition(word, contextSeg?.en || "");
      setSelectedWord(def);
    } catch (e) {
      console.error(e);
      // Fallback
      setSelectedWord({ word, definition: "Could not load definition", example: "N/A" });
    } finally {
      setIsLoadingWord(false);
    }
  };

  const handleSeekToSegment = useCallback((seg: TranscriptSegment) => {
    if (mediaRef.current) {
        // Add slight negative buffer to start time to ensure attack isn't clipped
        mediaRef.current.currentTime = Math.max(0, seg.start - 0.1);
        mediaRef.current.play();
    }
  }, []);

  const handlePrevSegment = useCallback(() => {
    if (!transcript.length) return;
    const currentIndex = activeSegmentId !== null 
      ? transcript.findIndex(t => t.id === activeSegmentId) 
      : 0;
    
    let targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    const target = transcript[targetIndex];
    
    // Clear loop to avoid getting stuck in a loop from another segment
    setLoopSegmentId(null);
    handleSeekToSegment(target);
  }, [transcript, activeSegmentId, handleSeekToSegment]);

  const handleNextSegment = useCallback(() => {
    if (!transcript.length) return;
    const currentIndex = activeSegmentId !== null 
      ? transcript.findIndex(t => t.id === activeSegmentId) 
      : -1;
    
    let targetIndex = currentIndex < transcript.length - 1 ? currentIndex + 1 : 0;
    const target = transcript[targetIndex];

    // Clear loop to avoid getting stuck in a loop from another segment
    setLoopSegmentId(null);
    handleSeekToSegment(target);
  }, [transcript, activeSegmentId, handleSeekToSegment]);

  // Independent toggle handlers
  const handleToggleEn = () => {
    setShowEn(!showEn);
  };

  const handleToggleZh = () => {
    setShowZh(!showZh);
  };

  // Keyboard Shortcuts for Desktop/Pad (Space, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Avoid conflict with inputs if added in future
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'ArrowLeft') {
            handlePrevSegment();
        } else if (e.code === 'ArrowRight') {
            handleNextSegment();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handlePrevSegment, handleNextSegment]);

  // --- Renders ---

  if (appState === AppState.UPLOAD) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-brand-yellow text-center">
        <h1 className="text-4xl font-black mb-2 tracking-tighter">SUPER DICTATION</h1>
        <p className="text-lg font-bold mb-8">尚雯婕外语学习法</p>
        
        <div className="relative w-full max-w-md group cursor-pointer">
           <input 
              type="file" 
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
           />
           <div className="bg-white p-8 rounded-3xl border-4 border-black shadow-fun transition-transform group-hover:-translate-y-1 group-active:translate-y-0 group-active:shadow-none">
             <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 bg-gray-50 flex flex-col items-center">
               <span className="text-5xl block mb-4">📂</span>
               <p className="text-2xl font-black text-black">UPLOAD</p>
               <p className="text-gray-500 font-bold mt-2">Audio or Video</p>
             </div>
           </div>
        </div>
        <p className="mt-8 text-xs font-bold opacity-50">Powered by Gemini 2.5 Flash</p>
      </div>
    );
  }

  if (appState === AppState.PROCESSING) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-brand-blue">
        <div className="animate-spin text-6xl mb-4">💿</div>
        <h2 className="text-2xl font-black text-white stroke-black" style={{ WebkitTextStroke: '1px black'}}>PROCESSING...</h2>
        <p className="text-white font-bold mt-2 text-center max-w-xs">Uploading & Analyzing...<br/>(Large videos may take a minute)</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FFF8E1]">
      {/* Header */}
      <header className="flex-none p-4 bg-white border-b-2 border-black flex justify-between items-center z-20">
         <div>
            <h1 className="font-black text-lg sm:text-xl italic">尚雯婕外语学习法</h1>
            <p className="text-xs font-bold text-gray-500">听写训练课</p>
         </div>
      </header>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto p-4 pb-48 no-scrollbar relative">
        
        {/* Hidden Media Element */}
        {mediaType === 'audio' ? (
             <audio ref={mediaRef} src={mediaUrl || ""} />
        ) : (
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-4 border-2 border-black shadow-fun max-w-2xl mx-auto">
                 <video ref={mediaRef as React.RefObject<HTMLVideoElement>} src={mediaUrl || ""} className="w-full h-full" />
            </div>
        )}

        {/* Global Text Controls */}
        <div className="sticky top-0 z-10 bg-[#FFF8E1]/90 backdrop-blur-sm py-2 mb-4 flex gap-2 justify-center">
            <button 
                onClick={handleToggleEn}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-black font-bold text-sm cursor-pointer transition-all active:scale-95 ${showEn ? 'bg-brand-blue shadow-fun-sm' : 'bg-gray-100 text-gray-400 hover:bg-white'}`}
            >
                {showEn ? 'English' : 'English'}
            </button>
            <button 
                onClick={handleToggleZh}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-black font-bold text-sm cursor-pointer transition-all active:scale-95 ${showZh ? 'bg-brand-orange text-white shadow-fun-sm' : 'bg-gray-100 text-gray-400 hover:bg-white'}`}
            >
                {showZh ? '中文' : '中文'}
            </button>
        </div>

        {/* Transcript List */}
        <div className="max-w-2xl mx-auto space-y-6">
            {transcript.map((seg) => (
                <div key={seg.id} ref={activeSegmentId === seg.id ? activeSegmentRef : null}>
                    <SentenceItem
                        segment={seg}
                        isActive={activeSegmentId === seg.id}
                        showEn={showEn}
                        showZh={showZh}
                        isLoopingThis={loopSegmentId === seg.id}
                        onSeek={() => {
                            // Explicitly clear loop when manually selecting a different sentence
                            setLoopSegmentId(null);
                            handleSeekToSegment(seg);
                        }}
                        onWordClick={handleWordClick}
                        onToggleLoop={() => {
                            if (loopSegmentId === seg.id) setLoopSegmentId(null);
                            else {
                                setLoopSegmentId(seg.id);
                                handleSeekToSegment(seg);
                            }
                        }}
                    />
                </div>
            ))}
        </div>
      </main>

      {/* Word Definition Modal (Save removed) */}
      <VocabModal 
        wordData={selectedWord} 
        isLoading={isLoadingWord}
        onClose={() => setSelectedWord(null)}
      />

      {/* Fixed Bottom Player */}
      <div className="flex-none fixed bottom-0 left-0 right-0 z-40">
        <PlayerControls
            mediaRef={mediaRef}
            playerState={playerState}
            setPlayerState={setPlayerState}
            onTogglePlay={togglePlay}
            onPrev={handlePrevSegment}
            onNext={handleNextSegment}
        />
      </div>
    </div>
  );
};

export default App;