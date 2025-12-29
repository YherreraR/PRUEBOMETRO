
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EvaluationContent, DocumentSettings } from '../types';
import { marked } from 'marked';

interface Props {
  evaluation: EvaluationContent;
  settings: DocumentSettings;
  isEditable?: boolean;
  onSettingsChange?: (settings: DocumentSettings) => void;
}

declare global {
  interface Window {
    MathJax: any;
  }
}

const MATH_TEMPLATES = {
  basic: [
    { label: 'Fracción', value: '\\frac{a}{b}', snippet: '\\frac{}{}', icon: '÷' },
    { label: 'Raíz', value: '\\sqrt{x}', snippet: '\\sqrt{}', icon: '√' },
    { label: 'Potencia', value: 'x^n', snippet: '^', icon: 'xⁿ' },
    { label: 'Subíndice', value: 'x_i', snippet: '_', icon: 'xᵢ' },
    { label: 'Paréntesis', value: '(x)', snippet: '(', icon: '( )' },
  ],
  operators: [
    { label: 'Multiplicación', value: '\\cdot', snippet: '\\cdot', icon: '·' },
    { label: 'División', value: ':', snippet: ':', icon: ':' },
    { label: 'No igual', value: '\\neq', snippet: '\\neq', icon: '≠' },
    { label: 'Aproximado', value: '\\approx', snippet: '\\approx', icon: '≈' },
    { label: 'Menor o igual', value: '\\leq', snippet: '\\leq', icon: '≤' },
    { label: 'Mayor o igual', value: '\\geq', snippet: '\\geq', icon: '≥' },
  ],
  advanced: [
    { label: 'Sumatoria', value: '\\sum', snippet: '\\sum_{i=1}^{n}', icon: 'Σ' },
    { label: 'Ángulo', value: '\\angle', snippet: '\\angle', icon: '∠' },
    { label: 'Infinito', value: '\\infty', snippet: '\\infty', icon: '∞' },
    { label: 'Pi', value: '\\pi', snippet: '\\pi', icon: 'π' },
    { label: 'Delta', value: '\\Delta', snippet: '\\Delta', icon: 'Δ' },
  ],
  greek: [
    { label: 'Alfa', value: '\\alpha', snippet: '\\alpha', icon: 'α' },
    { label: 'Beta', value: '\\beta', snippet: '\\beta', icon: 'β' },
    { label: 'Gamma', value: '\\gamma', snippet: '\\gamma', icon: 'γ' },
    { label: 'Theta', value: '\\theta', snippet: '\\theta', icon: 'θ' },
    { label: 'Lambda', value: '\\lambda', snippet: '\\lambda', icon: 'λ' },
  ]
};

const LATEX_COMMANDS = [
  ...MATH_TEMPLATES.basic,
  ...MATH_TEMPLATES.operators,
  ...MATH_TEMPLATES.advanced,
  ...MATH_TEMPLATES.greek
];

const MathVisualAssistant: React.FC<{ onInsert: (text: string) => void }> = ({ onInsert }) => {
  const [activeTab, setActiveTab] = useState<keyof typeof MATH_TEMPLATES>('basic');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl no-print overflow-hidden mb-6">
      <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto scrollbar-none">
        {(Object.keys(MATH_TEMPLATES) as Array<keyof typeof MATH_TEMPLATES>).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'basic' ? 'Básico' : tab === 'operators' ? 'Operadores' : tab === 'advanced' ? 'Avanzado' : 'Griego'}
          </button>
        ))}
      </div>
      <div className="p-4 grid grid-cols-5 sm:grid-cols-6 gap-3">
        {MATH_TEMPLATES[activeTab].map((tool) => (
          <button
            key={tool.label}
            onClick={() => onInsert(`$${tool.snippet}$`)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group shadow-sm active:scale-95"
            title={tool.label}
          >
            <span className="text-xl font-serif text-slate-800 group-hover:text-indigo-600 mb-1">{tool.icon}</span>
            <span className="text-[7px] text-slate-400 uppercase font-black truncate w-full text-center">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const DocumentPreview: React.FC<Props> = ({ evaluation: initialEvaluation, settings, isEditable = true, onSettingsChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [evaluation, setEvaluation] = useState<EvaluationContent>(initialEvaluation);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [autocomplete, setAutocomplete] = useState<{ show: boolean; x: number; y: number; filter: string; index: number; target?: HTMLElement }>({
    show: false, x: 0, y: 0, filter: '', index: 0
  });
  const typesetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setEvaluation(initialEvaluation);
  }, [initialEvaluation]);

  const triggerTypeset = useCallback(() => {
    if (typesetTimeoutRef.current) window.clearTimeout(typesetTimeoutRef.current);
    typesetTimeoutRef.current = window.setTimeout(() => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => console.debug('MathJax error:', err));
      }
    }, 300);
  }, []);

  useEffect(() => {
    triggerTypeset();
    return () => {
      if (typesetTimeoutRef.current) window.clearTimeout(typesetTimeoutRef.current);
    };
  }, [evaluation, settings.fontSize, editingIndex, triggerTypeset]);

  const handleValidation = (placeholder: string, field?: string, index?: number) => (e: React.FocusEvent<HTMLElement>) => {
    const text = e.currentTarget.innerText.trim();
    const finalValue = text || placeholder;
    if (!text) e.currentTarget.innerText = placeholder;

    if (field) {
      if (['schoolName', 'teacherName', 'subject'].includes(field)) {
        if (onSettingsChange) {
          onSettingsChange({ ...settings, [field]: finalValue });
        }
        return;
      }

      setEvaluation(prev => {
        const next = { ...prev };
        if (field === 'title') next.title = finalValue;
        if (field === 'oa_code') next.oa_code = finalValue;
        if (field === 'oa_description') next.oa_description = finalValue;
        if (field === 'indicator' && index !== undefined) {
          next.indicators = [...next.indicators];
          next.indicators[index] = finalValue;
        }
        if (field === 'skill' && index !== undefined) {
          next.skills = [...(next.skills || [])];
          next.skills[index] = finalValue;
        }
        if (field === 'attitude' && index !== undefined) {
          next.attitudes = [...(next.attitudes || [])];
          next.attitudes[index] = finalValue;
        }
        if (field === 'section_title' && index !== undefined) {
          next.sections = [...next.sections];
          next.sections[index].title = finalValue;
        }
        return next;
      });
      triggerTypeset();
    }
  };

  const handleInlineInput = (e: React.FormEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const text = target.innerText;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const focusOffset = selection.focusOffset;
    const preCursorText = text.slice(0, focusOffset);
    const match = preCursorText.match(/\\([a-zA-Z]*)$/);

    if (match) {
      const rect = range.getBoundingClientRect();
      setAutocomplete({
        show: true,
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY,
        filter: match[1],
        index: 0,
        target: target
      });
    } else {
      setAutocomplete(prev => ({ ...prev, show: false }));
    }
  };

  const insertLaTeXAtCaret = (snippet: string) => {
    if (!autocomplete.target) return;
    const target = autocomplete.target;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const text = target.innerText;
    const focusOffset = selection.focusOffset;
    const preCursorText = text.slice(0, focusOffset);
    const postCursorText = text.slice(focusOffset);
    
    const beforeMatch = preCursorText.substring(0, preCursorText.lastIndexOf('\\'));
    target.innerText = beforeMatch + snippet + postCursorText;
    
    setAutocomplete(prev => ({ ...prev, show: false }));
    
    const newPos = beforeMatch.length + snippet.length;
    const range = document.createRange();
    const textNode = target.firstChild || target;
    try {
      range.setStart(textNode, newPos);
      range.setEnd(textNode, newPos);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch(e) {}
  };

  const updateSectionContent = (index: number, newContent: string) => {
    const newSections = [...evaluation.sections];
    newSections[index].content = newContent;
    setEvaluation({ ...evaluation, sections: newSections });
    triggerTypeset();
  };

  const insertAtCursor = (index: number, snippet: string) => {
    const textarea = document.getElementById(`editor-${index}`) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = evaluation.sections[index].content;
    const newContent = content.substring(0, start) + snippet + content.substring(end);
    
    updateSectionContent(index, newContent);
    
    setTimeout(() => {
      textarea.focus();
      const newPos = start + snippet.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const highlightLaTeX = (text: string) => {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/(\$.*?\$)/g, '<span class="text-indigo-600 bg-indigo-50 font-bold px-0.5 rounded border border-indigo-100">$1</span>');
  };

  const editableTitleStyles = "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-indigo-50 rounded-lg px-1 transition-all duration-200 cursor-text min-w-[50px] inline-block";
  const editableParagraphStyles = "focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-slate-50 rounded-lg px-1 transition-all duration-200 cursor-text min-w-[50px] inline-block";

  return (
    <div 
      ref={containerRef}
      className={`relative bg-white mx-auto text-slate-900 w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] shadow-2xl print:shadow-none print:p-[15mm] print:w-full print:m-0 ${settings.fontSize} transition-all duration-300 rounded-3xl print:rounded-none`} 
      id="printable-eval"
    >
      {autocomplete.show && (
        <div 
          className="fixed z-[100] bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 min-w-[180px] no-print animate-in fade-in zoom-in-95 duration-100 ring-4 ring-indigo-500/5"
          style={{ left: autocomplete.x, top: autocomplete.y + 5 }}
        >
          <div className="max-h-48 overflow-y-auto scrollbar-thin">
            {LATEX_COMMANDS.filter(cmd => cmd.label.toLowerCase().includes(autocomplete.filter.toLowerCase())).map((cmd, i) => (
              <button
                key={cmd.label}
                onClick={() => insertLaTeXAtCaret(cmd.snippet)}
                className={`w-full text-left px-4 py-3 text-[10px] flex items-center justify-between gap-4 transition-colors ${autocomplete.index === i ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50'}`}
              >
                <code className="font-bold">{cmd.label}</code>
                <span className={`text-[9px] font-serif ${autocomplete.index === i ? 'text-indigo-200' : 'text-slate-400'}`}>{cmd.icon}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Identificación */}
      <div className={`flex justify-between items-start border-b-2 pb-6 mb-8 ${settings.headerColor.includes('text-slate-900') ? 'border-slate-800' : 'border-indigo-600'}`}>
        <div className="flex-1 space-y-2 text-left">
          <h3 
            contentEditable={isEditable} 
            suppressContentEditableWarning 
            onInput={handleInlineInput}
            onBlur={handleValidation(settings.schoolName, 'schoolName')} 
            className={`font-black text-xl uppercase tracking-tight leading-tight text-indigo-900 ${isEditable ? editableTitleStyles : ""}`}
          >
            {settings.schoolName}
          </h3>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Docente:</span>
              <span 
                contentEditable={isEditable} 
                suppressContentEditableWarning 
                onInput={handleInlineInput}
                onBlur={handleValidation(settings.teacherName, 'teacherName')} 
                className={`text-[10px] font-bold text-slate-600 ${isEditable ? editableParagraphStyles : ""}`}
              >
                {settings.teacherName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignatura:</span>
              <span 
                contentEditable={isEditable} 
                suppressContentEditableWarning 
                onInput={handleInlineInput}
                onBlur={handleValidation(settings.subject, 'subject')} 
                className={`text-[10px] font-bold text-slate-600 ${isEditable ? editableParagraphStyles : ""}`}
              >
                {settings.subject}
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 ml-4">
           <table className="border-collapse border-2 border-slate-800 text-[10px] w-40 bg-white shadow-sm">
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-2 font-black bg-slate-100 uppercase tracking-widest">Pje. Ideal</td>
                  <td className="border border-slate-800 p-2 text-center font-black" contentEditable={isEditable} suppressContentEditableWarning>40</td>
                </tr>
                <tr className="bg-indigo-50/50">
                  <td className="border border-slate-800 p-2 font-black text-indigo-900 uppercase tracking-widest">Pje. Obt.</td>
                  <td className="border border-slate-800 p-2"></td>
                </tr>
                <tr>
                  <td className="border border-slate-800 p-2 font-black bg-indigo-900 text-white uppercase tracking-widest">Nota</td>
                  <td className="border border-slate-800 p-2"></td>
                </tr>
              </tbody>
           </table>
        </div>
      </div>

      {/* Datos Alumno */}
      <div className="grid grid-cols-12 gap-y-5 gap-x-6 mb-10 border-2 border-slate-100 p-6 rounded-3xl bg-slate-50/20">
        <div className="col-span-8 border-b-2 border-slate-300 pb-1 flex justify-between items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudiante</span>
          <span className="text-[9px] text-slate-300 font-mono">________________________________________________</span>
        </div>
        <div className="col-span-4 border-b-2 border-slate-300 pb-1 flex justify-between items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Curso / Fecha</span>
          <span className="text-[9px] text-slate-300 font-mono">________________</span>
        </div>
      </div>

      {/* Título */}
      <div className="text-center mb-10">
        <h1 
          contentEditable={isEditable} 
          suppressContentEditableWarning 
          onInput={handleInlineInput}
          onBlur={handleValidation(evaluation.title, 'title')} 
          className={`text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2 text-center w-full ${isEditable ? editableTitleStyles : ""}`}
        >
          {evaluation.title}
        </h1>
        <div className="inline-block px-4 py-1.5 bg-indigo-900 text-white rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-indigo-100">Instrumento de Evaluación • Mineduc</div>
      </div>

      {/* Alineación Curricular */}
      <div className="mb-8 border-2 border-slate-800 rounded-3xl overflow-hidden print-avoid-break bg-white shadow-xl ring-1 ring-slate-900/5">
        <div className="bg-slate-900 text-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] flex flex-wrap justify-between items-center gap-3">
          <span className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Especificación Pedagógica
          </span>
          <span className="bg-indigo-600 px-3 py-1 rounded-full text-[8px]">Curriculum Nacional</span>
        </div>
        
        <div className="p-8 space-y-8 bg-gradient-to-b from-slate-50/50 to-white">
          <div className="relative border-l-4 border-indigo-600 pl-6 py-4 bg-indigo-50/30 rounded-r-2xl shadow-sm">
            <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-3">Objetivo de Aprendizaje (OA)</h5>
            <div className="text-xs font-bold text-slate-800 text-left leading-relaxed">
              <span className={`text-indigo-900 font-black px-1 mr-2 ${isEditable ? editableTitleStyles : ""}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(evaluation.oa_code, 'oa_code')}>{evaluation.oa_code}</span>
              <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(evaluation.oa_description, 'oa_description')} className={`${isEditable ? editableParagraphStyles : ""}`}>"{evaluation.oa_description}"</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              Indicadores de Evaluación Mineduc
            </h5>
            <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-4 w-[75%]">Criterio de Desempeño</th>
                    <th className="px-6 py-4 text-center border-l border-slate-200">Logro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluation.indicators.map((ind, i) => (
                    <tr key={i} className="text-xs text-slate-700 group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 leading-relaxed font-medium">
                        <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(ind, 'indicator', i)} className={isEditable ? editableParagraphStyles : ""}>{ind}</span>
                      </td>
                      <td className="px-6 py-4 border-l border-slate-50">
                        <div className="flex justify-around gap-3 opacity-40">
                          <div className="w-6 h-6 border-2 border-slate-300 rounded-lg"></div>
                          <div className="w-6 h-6 border-2 border-slate-300 rounded-lg"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Habilidades y Actitudes */}
      <div className="mb-10 border-2 border-emerald-800 rounded-3xl overflow-hidden print-avoid-break bg-white shadow-xl ring-1 ring-emerald-900/5">
        <div className="bg-emerald-800 text-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Habilidades y Actitudes Evaluadas
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-10 bg-emerald-50/10">
            <div className="space-y-4 text-left">
              <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-emerald-100">
                Habilidades Disciplinares
              </h5>
              <div className="flex flex-wrap gap-2">
                {evaluation.skills?.map((skill, i) => (
                  <span 
                    key={i} 
                    contentEditable={isEditable} 
                    suppressContentEditableWarning 
                    onBlur={handleValidation(skill, 'skill', i)} 
                    className={`text-[10px] font-black px-4 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full uppercase tracking-tighter shadow-sm ${isEditable ? editableTitleStyles : ""}`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-4 text-left">
              <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-emerald-100">
                Objetivos Actitudinales
              </h5>
              <ul className="space-y-3">
                {evaluation.attitudes?.map((att, i) => (
                  <li key={i} className="text-xs text-slate-600 font-medium flex gap-3 items-start">
                    <span className="font-black text-emerald-500 text-sm shrink-0 mt-0.5">●</span>
                    <span 
                      contentEditable={isEditable} 
                      suppressContentEditableWarning 
                      onBlur={handleValidation(att, 'attitude', i)} 
                      className={`block w-full rounded-lg px-2 py-1 leading-snug ${isEditable ? editableParagraphStyles : ""}`}
                    >
                      {att}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="space-y-12 pb-12">
        {evaluation.sections.map((section, idx) => (
          <div key={idx} className="print-avoid-break relative group">
            <div className="flex items-center gap-5 mb-6">
              <div className="bg-slate-900 text-white w-10 h-10 flex items-center justify-center font-black text-xl rounded-2xl shrink-0 shadow-lg shadow-slate-200">{idx + 1}</div>
              <h2 contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(section.title, 'section_title', idx)} className={`text-xl font-black text-slate-800 uppercase tracking-tight border-b-4 border-slate-900 flex-1 text-left pb-1 ${isEditable ? editableTitleStyles : ""}`}>{section.title}</h2>
            </div>

            {isEditable && editingIndex === idx ? (
              <div className="bg-slate-50 border-4 border-indigo-200 rounded-[2rem] p-8 no-print shadow-2xl relative mb-8">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Edición Matemática Activa</span>
                  <button onClick={() => setEditingIndex(null)} className="text-[10px] bg-indigo-600 text-white px-6 py-2.5 rounded-full font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg">Listo</button>
                </div>
                
                <MathVisualAssistant onInsert={(snippet) => insertAtCursor(idx, snippet)} />
                
                <textarea
                  id={`editor-${idx}`}
                  value={section.content}
                  onChange={(e) => updateSectionContent(idx, e.target.value)}
                  className="w-full min-h-[300px] p-6 text-sm font-mono bg-white border-2 border-slate-200 rounded-[1.5rem] focus:border-indigo-500 outline-none resize-y"
                  autoFocus
                />
              </div>
            ) : (
              <div 
                onClick={() => isEditable && setEditingIndex(idx)}
                className={`prose prose-slate max-w-none math-container leading-relaxed text-slate-800 px-6 py-4 text-left transition-all rounded-3xl ${isEditable ? "hover:bg-indigo-50/50 cursor-pointer border-2 border-transparent hover:border-indigo-100" : ""}`}
                style={{ fontSize: '1.05em' }}
                dangerouslySetInnerHTML={{ __html: highlightLaTeX(String(marked.parse(section.content))) }}
              >
              </div>
            )}
            
            {isEditable && editingIndex !== idx && (
              <button onClick={() => setEditingIndex(idx)} className="no-print absolute -right-12 top-0 p-3 bg-white text-indigo-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all rounded-full shadow-xl border border-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-10 border-t-4 border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-10">
           <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm text-left">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Autoevaluación</h4>
              <div className="flex justify-around gap-6">
                {['Logrado', 'En Proceso', 'No Logrado'].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-slate-300 rounded-2xl"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">{s}</span>
                  </div>
                ))}
              </div>
           </div>
           <div className="p-8 bg-indigo-50/20 rounded-[2rem] border border-indigo-100 shadow-sm text-left flex flex-col">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Comentarios Docente</h4>
              <div className="flex-1 border-b-2 border-dashed border-indigo-200/50 mb-4 min-h-[40px]"></div>
              <div className="flex-1 border-b-2 border-dashed border-indigo-200/50 min-h-[40px]"></div>
           </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
