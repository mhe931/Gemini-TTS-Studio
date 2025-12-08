import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Volume2, Clock } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  label: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, label }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Reset state when src changes
    setIsPlaying(false);
    setProgress(0);
    if(audioRef.current) {
        audioRef.current.load();
    }
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (dur > 0) {
      setProgress((current / dur) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Volume2 size={16} className="text-blue-400" />
          {label}
        </h3>
        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
          <Clock size={12} />
          {formatTime(duration)}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md active:scale-95"
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
        </button>

        <div className="flex-1">
          <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <a
          href={src}
          download={`gemini-tts-${Date.now()}.wav`}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Download WAV"
        >
          <Download size={20} />
        </a>
      </div>
    </div>
  );
};