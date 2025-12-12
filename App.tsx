import React, { useState } from 'react';
import { Bot, Mic, MessagesSquare, Wand2, Sparkles, AlertCircle } from 'lucide-react';
import { VoiceName, TTSMode, GeneratedAudio } from './types';
import { generateSingleSpeakerAudio } from './services/geminiService';
import { createMp3Blob } from './utils/audioUtils';
import { VoiceSelector } from './components/VoiceSelector';
import { AudioPlayer } from './components/AudioPlayer';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single Speaker State
  const [singleText, setSingleText] = useState("Greetings! I am ready to convert your text into lifelike speech.");
  const [singleVoice, setSingleVoice] = useState<VoiceName>(VoiceName.Fenrir);

  // History / Results
  const [history, setHistory] = useState<GeneratedAudio[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      let pcmData: Uint8Array | null = null;
      let snippet = '';

      if (!singleText.trim()) throw new Error("Please enter some text.");
      
      pcmData = await generateSingleSpeakerAudio(singleText, singleVoice);
      snippet = singleText.slice(0, 50) + (singleText.length > 50 ? '...' : '');

      if (!pcmData) {
        throw new Error("Failed to generate audio.");
      }

      // Default sample rate for this TTS model is 24000Hz
      const mp3Blob = createMp3Blob(pcmData, 24000);
      const url = URL.createObjectURL(mp3Blob);

      const newItem: GeneratedAudio = {
        id: Date.now().toString(),
        url,
        timestamp: Date.now(),
        mode: TTSMode.Single,
        textSnippet: snippet,
      };

      setHistory(prev => [newItem, ...prev]);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 flex justify-center">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header Section */}
        <div className="lg:col-span-12 flex flex-col items-center justify-center mb-6 space-y-2">
           <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20 mb-2">
              <Sparkles className="w-8 h-8 text-blue-400" />
           </div>
           <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
             TTS Studio
           </h1>
           <p className="text-slate-400 text-center max-w-lg">
             Professional-grade speech synthesis.
           </p>
        </div>

        {/* Main Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Configuration Area */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
            <div className="space-y-4">
              <VoiceSelector 
                label="Select Voice" 
                selectedVoice={singleVoice} 
                onChange={setSingleVoice} 
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Script Text
                </label>
                <textarea
                  value={singleText}
                  onChange={(e) => setSingleText(e.target.value)}
                  className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all placeholder-slate-600"
                  placeholder="Enter the text you want to synthesize..."
                />
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Supports multilingual input.</span>
                    <span>{singleText.length} chars</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-col gap-4">
             {error && (
               <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-200 text-sm">
                 <AlertCircle size={18} />
                 {error}
               </div>
             )}
             
             <button
               onClick={handleGenerate}
               disabled={loading}
               className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                 loading
                 ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                 : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white active:scale-[0.99]'
               }`}
             >
               {loading ? (
                 <>
                   <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   Synthesizing...
                 </>
               ) : (
                 <>
                   <Wand2 size={20} />
                   Generate Audio
                 </>
               )}
             </button>
          </div>
        </div>

        {/* Sidebar / History */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6 flex-1 min-h-[400px]">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
               <Bot size={16} />
               Generated Library
             </h2>
             
             {history.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50">
                  <MessagesSquare size={48} strokeWidth={1} />
                  <p className="text-sm text-center">No audio generated yet.<br/>Start by entering text on the left.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {history.map((item) => (
                   <div key={item.id} className="animate-fade-in-down">
                     <AudioPlayer src={item.url} label="Single Speaker" />
                     <p className="text-xs text-slate-500 mt-2 px-1 truncate">
                       {item.textSnippet}
                     </p>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;