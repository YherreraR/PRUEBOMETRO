
import React from 'react';

interface Props {
  onPrint: () => void;
  hasEvaluation: boolean;
}

const Header: React.FC<Props> = ({ onPrint, hasEvaluation }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <span className="text-xl font-bold">π</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Evaluador Matemático</h1>
            <p className="text-xs text-indigo-600 font-medium hidden sm:block">Alineado a Textos Sumo Primero 🇨🇱</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-2 sm:gap-6">
          <a href="https://www.curriculumnacional.cl" target="_blank" rel="noopener noreferrer" className="hidden lg:flex text-sm font-medium text-slate-600 hover:text-indigo-600 items-center gap-1">
            Currículum Nacional
          </a>
          
          <div className="hidden md:block h-8 w-px bg-slate-200 mx-2"></div>
          
          <button 
            onClick={onPrint}
            disabled={!hasEvaluation}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${
              !hasEvaluation 
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
