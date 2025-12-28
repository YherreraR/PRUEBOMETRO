
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <span className="text-xl font-bold">π</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Evaluador Matemático</h1>
            <p className="text-xs text-indigo-600 font-medium">Alineado a Textos Sumo Primero 🇨🇱</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a href="https://www.curriculumnacional.cl" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1">
            Currículum Nacional
          </a>
          <a href="https://www.curriculumnacional.cl/portal/Asignatura/Matematica/Sumo-Primero/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1">
            Acceso Sumo Primero
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-200 transition-colors">
            Biblioteca
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
