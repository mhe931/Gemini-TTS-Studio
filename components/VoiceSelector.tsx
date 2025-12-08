import React from 'react';
import { VoiceName } from '../types';
import { Mic2 } from 'lucide-react';

interface VoiceSelectorProps {
  label: string;
  selectedVoice: VoiceName;
  onChange: (voice: VoiceName) => void;
  className?: string;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ label, selectedVoice, onChange, className }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <Mic2 size={14} />
        {label}
      </label>
      <select
        value={selectedVoice}
        onChange={(e) => onChange(e.target.value as VoiceName)}
        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors hover:bg-slate-750"
      >
        {Object.values(VoiceName).map((voice) => (
          <option key={voice} value={voice}>
            {voice}
          </option>
        ))}
      </select>
    </div>
  );
};