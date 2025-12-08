import React, { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';

interface ScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (script: string) => void;
}

export const ScriptImportModal: React.FC<ScriptImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleImport = () => {
    onImport(text);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText size={20} className="text-blue-400" />
            Import Script
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
          <div className="text-sm text-slate-400 space-y-2">
            <p>Paste your script below. We'll automatically detect speaker names and split the dialogue.</p>
            <div className="bg-slate-800/50 p-3 rounded-lg font-mono text-xs text-slate-500 border border-slate-700/50">
              <span className="font-bold text-slate-400">Format example:</span><br/>
              Alex: Hey Sarah, did you see the new feature?<br/>
              Sarah: Yes! It looks amazing.
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm placeholder-slate-600"
            placeholder="Paste your conversation script here..."
          />
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleImport}
            disabled={!text.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload size={16} />
            Import Script
          </button>
        </div>
      </div>
    </div>
  );
};