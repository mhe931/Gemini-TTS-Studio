import React, { useState } from 'react';
import { Bot, Mic, MessagesSquare, Wand2, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { VoiceName, TTSMode, GeneratedAudio, ConversationLine } from './types';
import { generateSingleSpeakerAudio, generateMultiSpeakerAudio } from './services/geminiService';
import { decodeBase64, createMp3Blob } from './utils/audioUtils';
import { VoiceSelector } from './components/VoiceSelector';
import { AudioPlayer } from './components/AudioPlayer';
import { ScriptImportModal } from './components/ScriptImportModal';

const App: React.FC = () => {
  const [mode, setMode] = useState<TTSMode>(TTSMode.Single);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Single Speaker State
  const [singleText, setSingleText] = useState("Greetings! I am ready to convert your text into lifelike speech.");
  const [singleVoice, setSingleVoice] = useState<VoiceName>(VoiceName.Fenrir);

  // Multi Speaker State
  const [speaker1Name, setSpeaker1Name] = useState("Alex");
  const [speaker1Voice, setSpeaker1Voice] = useState<VoiceName>(VoiceName.Kore);
  const [speaker2Name, setSpeaker2Name] = useState("Sarah");
  const [speaker2Voice, setSpeaker2Voice] = useState<VoiceName>(VoiceName.Puck);
  const [conversationLines, setConversationLines] = useState<ConversationLine[]>([
    { speaker: 'Speaker A', text: 'Have you seen the latest updates to the Gemini API?' },
    { speaker: 'Speaker B', text: 'Yes! The audio capabilities are incredible.' },
    { speaker: 'Speaker A', text: 'Especially the multi-speaker support. It sounds so natural.' },
  ]);

  // History / Results
  const [history, setHistory] = useState<GeneratedAudio[]>([]);

  const handleScriptImport = (scriptText: string) => {
    const lines = scriptText.split('\n');
    const newConversationLines: ConversationLine[] = [];
    const speakerMap = new Map<string, 'Speaker A' | 'Speaker B'>();
    let foundSpeaker1 = '';
    let foundSpeaker2 = '';

    const getSpeakerSlot = (name: string): 'Speaker A' | 'Speaker B' => {
      if (speakerMap.has(name)) return speakerMap.get(name)!;
      
      if (!foundSpeaker1) {
        foundSpeaker1 = name;
        speakerMap.set(name, 'Speaker A');
        return 'Speaker A';
      } else if (foundSpeaker1 === name) {
        return 'Speaker A';
      }
      
      if (!foundSpeaker2) {
        foundSpeaker2 = name;
        speakerMap.set(name, 'Speaker B');
        return 'Speaker B';
      } else if (foundSpeaker2 === name) {
        return 'Speaker B';
      }

      // Default to Speaker A if more than 2 speakers found (limitation of current UI)
      return 'Speaker A'; 
    };

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const match = line.match(/^([^:]+):\s*(.+)$/);
      
      if (match) {
        const name = match[1].trim();
        const text = match[2].trim();
        const slot = getSpeakerSlot(name);
        
        newConversationLines.push({ speaker: slot, text });
      } else {
        // Append continuation lines to the previous speaker's text
        if (newConversationLines.length > 0) {
           const prevLine = newConversationLines[newConversationLines.length - 1];
           prevLine.text = (prevLine.text + ` ${line.trim()}`).trim();
        }
      }
    }

    // Filter out any empty lines that might have been created
    const filteredLines = newConversationLines.filter(line => line.text.trim().length > 0);

    if (filteredLines.length > 0) {
      setConversationLines(filteredLines);
      if (foundSpeaker1) setSpeaker1Name(foundSpeaker1);
      if (foundSpeaker2) setSpeaker2Name(foundSpeaker2);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      let base64Audio = '';
      let snippet = '';

      if (mode === TTSMode.Single) {
        if (!singleText.trim()) throw new Error("Please enter some text.");
        base64Audio = await generateSingleSpeakerAudio(singleText, singleVoice);
        snippet = singleText.slice(0, 50) + (singleText.length > 50 ? '...' : '');
      } else {
        if (conversationLines.some(l => !l.text.trim())) throw new Error("Please fill in all conversation lines.");
        base64Audio = await generateMultiSpeakerAudio(
            conversationLines,
            { name: speaker1Name, voice: speaker1Voice },
            { name: speaker2Name, voice: speaker2Voice }
        );
        snippet = "Conversation: " + conversationLines[0].text.slice(0, 30) + "...";
      }

      const pcmData = decodeBase64(base64Audio);
      // Gemini TTS defaults to 24000Hz for this model
      // Use createMp3Blob instead of createWavBlob
      const mp3Blob = createMp3Blob(pcmData, 24000);
      const url = URL.createObjectURL(mp3Blob);

      const newItem: GeneratedAudio = {
        id: Date.now().toString(),
        url,
        timestamp: Date.now(),
        mode,
        textSnippet: snippet,
      };

      setHistory(prev => [newItem, ...prev]);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const addConversationLine = () => {
    setConversationLines([...conversationLines, { 
      speaker: conversationLines.length % 2 === 0 ? 'Speaker A' : 'Speaker B', 
      text: '' 
    }]);
  };

  const updateConversationLine = (index: number, field: keyof ConversationLine, value: string) => {
    const newLines = [...conversationLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setConversationLines(newLines);
  };

  const removeConversationLine = (index: number) => {
    if (conversationLines.length <= 1) return;
    setConversationLines(conversationLines.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 flex justify-center">
      <ScriptImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleScriptImport}
      />
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header Section */}
        <div className="lg:col-span-12 flex flex-col items-center justify-center mb-6 space-y-2">
           <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20 mb-2">
              <Sparkles className="w-8 h-8 text-blue-400" />
           </div>
           <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
             Gemini TTS Studio
           </h1>
           <p className="text-slate-400 text-center max-w-lg">
             Professional-grade speech synthesis powered by the Gemini 2.5 Flash model. 
             Generate lifelike single-speaker audio or dynamic multi-speaker conversations.
           </p>
        </div>

        {/* Main Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Mode Tabs */}
          <div className="flex bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMode(TTSMode.Single)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === TTSMode.Single ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic size={16} />
              Single Speaker
            </button>
            <button
              onClick={() => setMode(TTSMode.Conversation)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === TTSMode.Conversation ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessagesSquare size={16} />
              Conversation
            </button>
          </div>

          {/* Configuration Area */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
            
            {mode === TTSMode.Single ? (
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
                     <span>Supports multilingual input including Finnish.</span>
                     <span>{singleText.length} chars</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <label className="text-xs text-blue-400 font-bold uppercase">Speaker A Name</label>
                    <input 
                      type="text" 
                      value={speaker1Name}
                      onChange={(e) => setSpeaker1Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                    />
                    <VoiceSelector label="Voice" selectedVoice={speaker1Voice} onChange={setSpeaker1Voice} />
                  </div>
                  <div className="space-y-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <label className="text-xs text-indigo-400 font-bold uppercase">Speaker B Name</label>
                    <input 
                      type="text" 
                      value={speaker2Name}
                      onChange={(e) => setSpeaker2Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                    />
                    <VoiceSelector label="Voice" selectedVoice={speaker2Voice} onChange={setSpeaker2Voice} />
                  </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dialogue Script</label>
                      <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors px-2 py-1 hover:bg-slate-800 rounded"
                      >
                        <FileText size={14} />
                        Paste Script
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {conversationLines.map((line, idx) => (
                        <div key={idx} className="flex gap-2 items-start group">
                           <div 
                            onClick={() => updateConversationLine(idx, 'speaker', line.speaker === 'Speaker A' ? 'Speaker B' : 'Speaker A')}
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer select-none transition-colors mt-2 ${
                              line.speaker === 'Speaker A' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
                            }`}
                            title="Click to toggle speaker"
                           >
                             {line.speaker === 'Speaker A' ? 'A' : 'B'}
                           </div>
                           <textarea
                              rows={2}
                              value={line.text}
                              onChange={(e) => updateConversationLine(idx, 'text', e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 resize-none"
                              placeholder={`What does ${line.speaker === 'Speaker A' ? speaker1Name : speaker2Name} say?`}
                           />
                           <button 
                             onClick={() => removeConversationLine(idx)}
                             className="mt-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             &times;
                           </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={addConversationLine}
                      className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-blue-400 hover:border-blue-400 transition-colors text-sm font-medium"
                    >
                      + Add Line
                    </button>
                </div>
              </div>
            )}
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
                     <AudioPlayer src={item.url} label={item.mode === TTSMode.Single ? 'Single Speaker' : 'Conversation'} />
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