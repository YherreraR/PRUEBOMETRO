
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EvaluationContent, DocumentSettings } from '../types';
import { marked } from 'https://esm.sh/marked';

interface Props {
  evaluation: EvaluationContent;
  settings: DocumentSettings;
  isEditable?: boolean;
}

declare global {
  interface Window {
    MathJax: any;
  }
}

const LATEX_COMMANDS = [
  { label: '\\frac{a}{b}', value: '\\frac{}{}', desc: 'Fracción' },
  { label: '\\sqrt{x}', value: '\\sqrt{}', desc: 'Raíz cuadrada' },
  { label: '\\sum_{i=1}^{n}', value: '\\sum_{i=1}^{n}', desc: 'Sumatoria' },
  { label: '\\infty', value: '\\infty', desc: 'Infinito' },
  { label: '\\alpha', value: '\\alpha', desc: 'Alfa' },
  { label: '\\beta', value: '\\beta', desc: 'Beta' },
  { label: '\\Delta', value: '\\Delta', desc: 'Delta' },
  { label: '\\approx', value: '\\approx', desc: 'Aproximadamente' },
  { label: '\\neq', value: '\\neq', desc: 'Distinto de' },
  { label: '\\leq', value: '\\leq', desc: 'Menor o igual' },
  { label: '\\geq', value: '\\geq', desc: 'Mayor o igual' },
  { label: '\\pi', value: '\\pi', desc: 'Número Pi' },
  { label: '\\angle', value: '\\angle', desc: 'Ángulo' },
  { label: '\\cdot', value: '\\cdot', desc: 'Punto de multiplicación' },
];

const MathToolbar: React.FC<{ onInsert: (text: string) => void }> = ({ onInsert }) => {
  const tools = [
    { label: 'Fracción', snippet: '$\\frac{a}{b}$', icon: '÷' },
    { label: 'Raíz', snippet: '$\\sqrt{x}$', icon: '√' },
    { label: 'Potencia', snippet: '$x^n$', icon: 'xⁿ' },
    { label: 'Multiplicar', snippet: '$\\cdot$', icon: '·' },
    { label: 'Dividir', snippet: '$:$', icon: ':' },
    { label: 'Igualdad', snippet: '$=$', icon: '=' },
    { label: 'Desigualdad', snippet: '$\\neq$', icon: '≠' },
    { label: 'Mayor/Menor', snippet: '$\\leq$', icon: '≤' },
    { label: 'Pi', snippet: '$\\pi$', icon: 'π' },
    { label: 'Ángulo', snippet: '$\\angle$', icon: '∠' },
  ];

  return (
    <div className="flex flex-wrap gap-1 mb-2 p-1.5 bg-slate-100 rounded-lg border border-slate-200 no-print">
      {tools.map((tool) => (
        <button
          key={tool.label}
          onClick={() => onInsert(tool.snippet)}
          className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-300 rounded hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};

const DocumentPreview: React.FC<Props> = ({ evaluation: initialEvaluation, settings, isEditable = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [evaluation, setEvaluation] = useState<EvaluationContent>(initialEvaluation);
  const [customWeightingItems, setCustomWeightingItems] = useState<Array<{ id: number; label: string; value: string }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [autocomplete, setAutocomplete] = useState<{ show: boolean; x: number; y: number; filter: string; index: number }>({
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

  const handleEditorKeyDown = (index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete.show) {
      const filtered = LATEX_COMMANDS.filter(cmd => cmd.label.toLowerCase().includes(autocomplete.filter.toLowerCase()));
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, index: (prev.index + 1) % filtered.length }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, index: (prev.index - 1 + filtered.length) % filtered.length }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[autocomplete.index]) {
          const textarea = e.currentTarget;
          const start = textarea.selectionStart;
          const content = evaluation.sections[index].content;
          const beforeMatch = content.substring(0, start - autocomplete.filter.length - 1);
          const afterMatch = content.substring(start);
          const newContent = beforeMatch + filtered[autocomplete.index].value + afterMatch;
          updateSectionContent(index, newContent);
          setAutocomplete({ ...autocomplete, show: false });
        }
      } else if (e.key === 'Escape') {
        setAutocomplete({ ...autocomplete, show: false });
      }
    }
  };

  const handleEditorChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    const textBefore = val.substring(0, cursor);
    const match = textBefore.match(/\\([a-zA-Z]*)$/);

    if (match) {
      setAutocomplete({
        show: true,
        x: 20,
        y: 80,
        filter: match[1],
        index: 0
      });
    } else {
      setAutocomplete(prev => ({ ...prev, show: false }));
    }
    updateSectionContent(index, val);
  };

  const addSection = () => {
    setEvaluation(prev => ({
      ...prev,
      sections: [...prev.sections, { title: 'Nueva Sección', content: 'Escribe aquí el contenido...' }]
    }));
  };

  const addDevelopmentQuestion = () => {
    const questionTemplate = `**Enunciado:** Escribe aquí la pregunta o el problema matemático a resolver...\n\n**Respuesta:**\n__________________________________________________________________________\n__________________________________________________________________________\n__________________________________________________________________________`;
    setEvaluation(prev => ({
      ...prev,
      sections: [...prev.sections, { title: 'Pregunta de Desarrollo', content: questionTemplate }]
    }));
  };

  const removeSection = (index: number) => {
    setEvaluation(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const addWeightingItem = () => {
    setCustomWeightingItems(prev => [
      ...prev,
      { id: Date.now(), label: 'Nuevo Ítem (ej. Puntualidad)', value: '-- pts' }
    ]);
  };

  const removeWeightingItem = (id: number) => {
    setCustomWeightingItems(prev => prev.filter(item => item.id !== id));
  };

  const renderMarkdown = (content: string) => {
    try {
      return { __html: marked.parse(content) };
    } catch (e) {
      return { __html: content };
    }
  };

  const highlightLaTeX = (text: string) => {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/(\$.*?\$)/g, '<span class="text-indigo-600 bg-indigo-50 font-bold px-0.5 rounded">$1</span>');
  };

  const editableTitleStyles = "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-indigo-50 rounded px-1 transition-all duration-200 cursor-text";
  const editableParagraphStyles = "focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-slate-50 rounded px-1 transition-all duration-200 cursor-text";

  return (
    <div 
      ref={containerRef}
      className={`relative bg-white mx-auto text-slate-900 w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] shadow-2xl print:shadow-none print:p-[15mm] print:w-full print:m-0 ${settings.fontSize} transition-all duration-300`} 
      id="printable-eval"
    >
      {isEditable && (
        <div className="absolute top-4 right-4 no-print flex flex-col items-end gap-2">
          <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[10px] font-bold border border-amber-200 flex items-center gap-2 shadow-sm animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            MODO EDICIÓN ACTIVO
          </div>
          <p className="text-[9px] text-slate-400 font-medium bg-white/80 px-2 py-1 rounded text-right">Haz clic para editar. Usa \ para autocompletar matemática.</p>
        </div>
      )}

      {/* Header */}
      <div className={`flex justify-between items-start border-b-2 pb-6 mb-8 ${settings.headerColor.includes('text-slate-900') ? 'border-slate-800' : 'border-indigo-600'}`}>
        <div className="flex-1 space-y-2">
          <h3 contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(settings.schoolName)} className={`font-black text-xl uppercase tracking-tight leading-tight text-indigo-900 text-left ${isEditable ? editableTitleStyles : ""}`}>{settings.schoolName}</h3>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Docente:</span>
              <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(settings.teacherName)} className={`text-[10px] font-bold text-slate-600 text-left min-w-[100px] block ${isEditable ? editableParagraphStyles : ""}`}>{settings.teacherName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Asignatura:</span>
              <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(settings.subject)} className={`text-[10px] font-bold text-slate-600 text-left min-w-[100px] block ${isEditable ? editableParagraphStyles : ""}`}>{settings.subject}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 ml-4">
           <table className="border-collapse border-2 border-slate-800 text-[10px] w-40 bg-white shadow-sm">
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-1.5 font-bold bg-slate-100 uppercase">Pje. Ideal</td>
                  <td className={`border border-slate-800 p-1.5 text-center font-black ${isEditable ? "focus:outline-none focus:bg-indigo-50" : ""}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation("40")}>40</td>
                </tr>
                <tr className="bg-indigo-50/50">
                  <td className="border border-slate-800 p-1.5 font-black text-indigo-900 uppercase">NOTA</td>
                  <td className="border border-slate-800 p-1.5"></td>
                </tr>
              </tbody>
           </table>
        </div>
      </div>

      {/* Student Data */}
      <div className="grid grid-cols-12 gap-y-5 gap-x-6 mb-10 border-2 border-slate-100 p-5 rounded-xl bg-slate-50/20">
        <div className="col-span-8 border-b-2 border-slate-300 pb-1 flex justify-between items-end">
          <span className="text-[9px] font-black text-slate-500 uppercase block tracking-tight">Nombre del Estudiante</span>
          <span className="text-[9px] text-slate-300 font-mono">________________________________________________</span>
        </div>
        <div className="col-span-4 border-b-2 border-slate-300 pb-1 flex justify-between items-end">
          <span className="text-[9px] font-black text-slate-500 uppercase block tracking-tight">Curso</span>
          <span className="text-[9px] text-slate-300 font-mono">__________</span>
        </div>
      </div>

      {/* Instructions */}
      {settings.showInstructions && (
        <div className="mb-8 border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/30 print-avoid-break">
          <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2 underline underline-offset-4 decoration-indigo-200">
            Instrucciones Generales
          </h4>
          <div contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation("Lea atentamente cada pregunta antes de responder.")} className={`text-[10px] text-slate-600 leading-relaxed italic text-left ${isEditable ? editableParagraphStyles : ""}`}>
            Lea atentamente cada pregunta antes de responder. Utilice lápiz mina para sus cálculos y lápiz pasta para su respuesta definitiva si es necesario. No se permite el uso de calculadora a menos que se indique lo contrario. Mantenga el orden y la limpieza de su instrumento. Dispone de 90 minutos para completar esta evaluación.
          </div>
        </div>
      )}

      {/* Title */}
      <div className="text-center mb-10">
        <h1 contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(evaluation.title, 'title')} className={`text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2 text-center block w-full ${isEditable ? editableTitleStyles : ""}`}>{evaluation.title}</h1>
        <div className="inline-block px-3 py-1 bg-indigo-900 text-white rounded text-[9px] font-black tracking-widest uppercase shadow-sm">Evaluación Formativa • Mineduc Chile</div>
      </div>

      {/* Curriculum Context - Refactored for responsiveness and clarity */}
      <div className="mb-8 border-2 border-slate-800 rounded-2xl overflow-hidden print-avoid-break bg-white shadow-lg shadow-slate-100 ring-1 ring-slate-900/5">
        <div className="bg-slate-900 text-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex flex-wrap justify-between items-center gap-2">
          <span className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Especificación Curricular y Logros
          </span>
          <span className="text-[8px] font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Decreto 67 • Mineduc</span>
        </div>
        
        <div className="p-4 sm:p-8 space-y-6 bg-gradient-to-b from-slate-50/50 to-white">
          {/* OA Detail Panel */}
          <div className="relative overflow-hidden border-l-4 border-indigo-600 pl-4 sm:pl-6 bg-indigo-50/30 py-4 sm:py-5 pr-4 rounded-r-2xl shadow-sm ring-1 ring-indigo-500/10">
            <h5 className="text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
              Objetivo de Aprendizaje (OA)
            </h5>
            <div className="text-[11px] font-bold text-slate-800 leading-relaxed italic text-left">
              <span className={`text-indigo-900 mr-2 underline underline-offset-4 decoration-indigo-200 font-black px-1 ${isEditable ? editableTitleStyles : ""}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(evaluation.oa_code, 'oa_code')}>{evaluation.oa_code}</span>: 
              <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(evaluation.oa_description, 'oa_description')} className={`ml-1 leading-relaxed inline-block ${isEditable ? editableParagraphStyles : ""}`}>"{evaluation.oa_description}"</span>
            </div>
          </div>
          
          {/* Indicators Table Wrapper */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-2">
              <h5 className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Indicadores de Monitoreo de Logro
              </h5>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-xl bg-white ring-1 ring-slate-900/5">
              {/* Responsive Scrollable Container */}
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] w-[70%]">Descriptor de Desempeño Sugerido</th>
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] text-center w-[30%] border-l border-slate-200 bg-slate-200/20">Valoración de Logro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluation.indicators.map((ind, i) => (
                      <tr key={i} className="group transition-all duration-200 hover:bg-indigo-50/20">
                        <td className="px-4 sm:px-6 py-4 text-[11px] text-slate-700 leading-relaxed font-medium">
                          <div className="flex items-start gap-3">
                            <span className="text-slate-300 font-mono text-[9px] mt-0.5 shrink-0 group-hover:text-indigo-400 transition-colors">0{i+1}</span>
                            <div 
                              contentEditable={isEditable} 
                              suppressContentEditableWarning 
                              onBlur={handleValidation(ind, 'indicator', i)} 
                              className={`text-left w-full outline-none focus:bg-white focus:ring-1 focus:ring-indigo-100 p-1 rounded-lg ${isEditable ? "cursor-text" : ""}`}
                            >
                              {ind}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 border-l border-slate-100 bg-slate-50/30">
                          <div className="flex justify-around items-center gap-2 sm:gap-4">
                            {[
                              { label: 'L', title: 'Logrado', color: 'bg-emerald-500' },
                              { label: 'P', title: 'En Proceso', color: 'bg-amber-500' },
                              { label: 'PL', title: 'Por Lograr', color: 'bg-rose-500' }
                            ].map(item => (
                              <div key={item.label} className="flex flex-col items-center gap-1.5 group/box cursor-help" title={item.title}>
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-slate-200 bg-white shadow-inner transition-all duration-300 group-hover/box:border-indigo-400 group-hover/box:scale-110"></div>
                                <span className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-tighter group-hover/box:text-indigo-600">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer / Legend */}
              <div className="bg-slate-900 px-4 sm:px-6 py-3 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest"><b className="text-white">L:</b> Logrado</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest"><b className="text-white">P:</b> En Proceso</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest"><b className="text-white">PL:</b> Por Lograr</span>
                </div>
                <span className="text-[7px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-900/30">Instrumento Formativo Oficial</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections & WYSIWYG Math Editor */}
      <div className="space-y-12 pb-12">
        {evaluation.sections.map((section, idx) => (
          <div key={idx} className="print-avoid-break relative group">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center font-black text-lg rounded-lg shrink-0">{idx + 1}</div>
              <h2 contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(section.title, 'section_title', idx)} className={`text-lg font-black text-slate-800 uppercase tracking-tight border-b-2 border-slate-900 flex-1 text-left ${isEditable ? editableTitleStyles : ""}`}>{section.title}</h2>
              {isEditable && (
                <button onClick={() => removeSection(idx)} className="no-print opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-all shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                </button>
              )}
            </div>

            {isEditable && editingIndex === idx ? (
              <div className="bg-slate-50 border-2 border-indigo-200 rounded-xl p-4 no-print shadow-lg animate-in fade-in zoom-in-95 duration-200 relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Editor Inteligente LaTeX / Markdown
                  </span>
                  <button onClick={() => setEditingIndex(null)} className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full font-bold hover:bg-indigo-700 shadow-sm transition-colors">Cerrar Editor</button>
                </div>
                
                <MathToolbar onInsert={(snippet) => insertAtCursor(idx, snippet)} />
                
                <div className="relative group/editor">
                  <div 
                    className="absolute inset-0 p-3 text-sm font-mono whitespace-pre-wrap break-words pointer-events-none text-transparent leading-normal overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: highlightLaTeX(section.content) }}
                  ></div>
                  
                  <textarea
                    id={`editor-${idx}`}
                    value={section.content}
                    onChange={(e) => handleEditorChange(idx, e)}
                    onKeyDown={(e) => handleEditorKeyDown(idx, e)}
                    className="relative w-full min-h-[150px] p-3 text-sm font-mono bg-transparent border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-slate-800 leading-normal caret-indigo-600 z-10"
                    placeholder="Escribe aquí... Usa $ para matemática (ej: $x^2 + 5$) o \ para comandos"
                    autoFocus
                  />

                  {autocomplete.show && (
                    <div 
                      className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-2xl py-1 min-w-[180px] no-print animate-in fade-in zoom-in-95 duration-100"
                      style={{ left: autocomplete.x, top: autocomplete.y + 20 }}
                    >
                      <div className="px-3 py-1.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sugerencias LaTeX</span>
                        <kbd className="text-[7px] px-1 py-0.5 bg-white border rounded text-slate-400 font-bold">↵</kbd>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {LATEX_COMMANDS.filter(cmd => cmd.label.toLowerCase().includes(autocomplete.filter.toLowerCase())).map((cmd, i) => (
                          <button
                            key={cmd.label}
                            onClick={() => {
                              insertAtCursor(idx, cmd.value);
                              setAutocomplete(prev => ({ ...prev, show: false }));
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-3 hover:bg-indigo-50 transition-colors ${autocomplete.index === i ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-700'}`}
                          >
                            <code className="font-bold">{cmd.label}</code>
                            <span className={`text-[8px] opacity-70 uppercase font-black ${autocomplete.index === i ? 'text-indigo-100' : 'text-slate-400'}`}>{cmd.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 bg-white border border-slate-100 rounded-lg">
                   <p className="text-[9px] font-black text-slate-300 uppercase mb-2">Vista Previa Real:</p>
                   <div className="prose prose-slate max-w-none math-container text-slate-800" dangerouslySetInnerHTML={renderMarkdown(section.content)}></div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => isEditable && setEditingIndex(idx)}
                className={`prose prose-slate max-w-none math-container leading-relaxed text-slate-800 px-4 min-h-[50px] text-left block w-full transition-all rounded-lg ${isEditable ? "hover:bg-indigo-50/50 cursor-pointer group-hover:ring-1 group-hover:ring-indigo-100" : ""}`}
                style={{ fontSize: '1.05em' }}
                dangerouslySetInnerHTML={renderMarkdown(section.content)}
              >
              </div>
            )}
            {isEditable && editingIndex !== idx && (
              <div className="no-print opacity-0 group-hover:opacity-100 absolute -right-8 top-12 flex flex-col gap-1 transition-all">
                <button onClick={() => setEditingIndex(idx)} className="p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors" title="Editar Contenido">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              </div>
            )}
          </div>
        ))}

        {isEditable && (
          <div className="no-print pt-6 border-t-2 border-dashed border-slate-200 flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={addSection} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all border-2 border-indigo-100 shadow-sm">Añadir Sección</button>
            <button onClick={addDevelopmentQuestion} className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all border-2 border-emerald-100 shadow-sm">Añadir Pregunta Desarrollo</button>
          </div>
        )}
      </div>

      {/* Skills and Attitudes */}
      <div className="mb-10 border-2 border-emerald-800 rounded-xl overflow-hidden print-avoid-break bg-white shadow-md">
        <div className="bg-emerald-800 text-white px-4 py-3 text-[10px] font-black uppercase tracking-widest">Habilidades y Actitudes Evaluadas</div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h5 className="text-[9px] font-black text-emerald-600 uppercase mb-3 flex items-center gap-2">
                <div className="w-1 h-1 bg-emerald-600 rounded-full"></div>
                Habilidades Disciplinares
              </h5>
              <div className="flex flex-wrap gap-1.5">{evaluation.skills?.map((skill, i) => (<span key={i} contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(skill, 'skill', i)} className={`text-[8px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded uppercase shadow-sm ${isEditable ? editableTitleStyles : ""}`}>{skill}</span>))}</div>
            </div>
            <div>
              <h5 className="text-[9px] font-black text-emerald-600 uppercase mb-3 flex items-center gap-2">
                <div className="w-1 h-1 bg-emerald-600 rounded-full"></div>
                Objetivos Actitudinales
              </h5>
              <ul className="space-y-1.5">{evaluation.attitudes?.map((att, i) => (<li key={i} className="text-[9px] text-slate-600 leading-tight flex gap-2 items-start"><span className="font-black text-emerald-500 shrink-0">✓</span><span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(att, 'attitude', i)} className={`text-left block w-full rounded px-1 ${isEditable ? editableParagraphStyles : ""}`}>{att}</span></li>))}</ul>
            </div>
        </div>
      </div>

      {/* Sources */}
      {evaluation.sources && evaluation.sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 no-print">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fuentes de Consulta (Mineduc):</h4>
          <div className="space-y-1">{evaluation.sources.map((source, i) => (<a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="block text-[9px] text-indigo-500 hover:underline">• {source.title}</a>))}</div>
        </div>
      )}

      {/* Ponderación */}
      <div className="mb-6 border-2 border-slate-200 rounded-xl overflow-hidden print-avoid-break no-print">
        <div className="bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
           <span>Resumen de Ponderaciones (Modificable)</span>
           {isEditable && <button onClick={addWeightingItem} className="text-[8px] bg-slate-200 px-2 py-0.5 rounded hover:bg-slate-300 transition-colors">Añadir Ítem</button>}
        </div>
        <div className="p-4">
          <table className="w-full text-[10px] border-collapse">
            <tbody>
              {evaluation.sections.map((sec, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2 font-bold text-slate-600">{idx+1}. {sec.title}</td>
                  <td contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation("-- pts")} className="py-2 text-right font-black text-indigo-600 w-24">-- pts</td>
                </tr>
              ))}
              {customWeightingItems.map(item => (
                <tr key={item.id} className="border-b border-slate-100 group">
                  <td className="py-2 font-bold text-slate-600 flex justify-between items-center">
                    <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(item.label)} className="focus:outline-none">{item.label}</span>
                    <button onClick={() => removeWeightingItem(item.id)} className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </td>
                  <td contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(item.value)} className="py-2 text-right font-black text-indigo-600 w-24 focus:outline-none">{item.value}</td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td className="py-2 px-2 font-black uppercase text-slate-900">Total Evaluación</td>
                <td contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation("40 pts")} className="py-2 px-2 text-right font-black text-slate-900 focus:outline-none">40 pts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-10 print-avoid-break">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t-2 border-slate-100 pt-8">
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Autoevaluación Global del Estudiante</h4>
              <div className="flex justify-around items-end pb-1">{['Logrado', 'En Proceso', 'Por Lograr'].map((status) => (<div key={status} className="flex flex-col items-center gap-2 cursor-pointer group"><div className="w-9 h-9 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-indigo-500 group-hover:text-indigo-500 shadow-sm transition-all"><div className="w-4 h-4 rounded-sm border-2 border-current"></div></div><span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{status}</span></div>))}</div>
           </div>
           <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 shadow-sm">
              <h4 className="text-[9px] font-black text-indigo-400 uppercase mb-2 tracking-widest">Retroalimentación Docente Sugerida</h4>
              <div contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation("[Sin retroalimentación definida]")} className={`min-h-[80px] focus:outline-none text-left rounded-lg p-1 ${isEditable ? editableParagraphStyles : ""}`}>
                <div className="h-8 border-b border-indigo-100 border-dashed"></div>
                <div className="h-8 border-b border-indigo-100 border-dashed"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
