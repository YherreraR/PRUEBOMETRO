
import React, { useState } from 'react';

interface Props {
  onExportPDF: () => void;
  onExportText: () => void;
  onCopyText: () => void;
  hasEvaluation: boolean;
}

const Header: React.FC<Props> = ({ onExportPDF, onExportText, onCopyText, hasEvaluation }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <span className="text-xl font-black">π</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight uppercase">EvalMat Chile</h1>
            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest hidden sm:block">Alineado a Currículum Nacional 🇨🇱</p>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!hasEvaluation}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm ${
              !hasEvaluation 
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar / Guardar
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showExportMenu && hasEvaluation && (
            <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 ring-1 ring-black/5">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Opciones de Archivo</p>
              </div>
              
              <button 
                onClick={() => { onExportPDF(); setShowExportMenu(false); }}
                className="w-full px-5 py-4 text-left hover:bg-indigo-50 flex items-center gap-4 group transition-colors"
              >
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Exportar PDF</p>
                  <p className="text-[10px] text-slate-500 font-medium">Usa la opción "Guardar como PDF"</p>
                </div>
              </button>

              <button 
                onClick={() => { onExportText(); setShowExportMenu(false); }}
                className="w-full px-5 py-4 text-left hover:bg-indigo-50 border-t border-slate-50 flex items-center gap-4 group transition-colors"
              >
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Descargar Texto (.txt)</p>
                  <p className="text-[10px] text-slate-500 font-medium">Archivo editable estructurado</p>
                </div>
              </button>

              <button 
                onClick={() => { onCopyText(); setShowExportMenu(false); }}
                className="w-full px-5 py-4 text-left hover:bg-emerald-50 border-t border-slate-50 flex items-center gap-4 group transition-colors"
              >
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Copiar Texto</p>
                  <p className="text-[10px] text-slate-500 font-medium">Pegar directamente en Word</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
      {showExportMenu && <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)}></div>}
    </header>
  );
};

export default Header;
