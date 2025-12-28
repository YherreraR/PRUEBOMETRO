
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
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg no-print overflow-hidden mb-4">
      <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto scrollbar-none">
        {(Object.keys(MATH_TEMPLATES) as Array<keyof typeof MATH_TEMPLATES>).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'basic' ? 'Básico' : tab === 'operators' ? 'Operadores' : tab === 'advanced' ? 'Avanzado' : 'Griego'}
          </button>
        ))}
      </div>
      <div className="p-3 grid grid-cols-5 sm:grid-cols-6 gap-2">
        {MATH_TEMPLATES[activeTab].map((tool) => (
          <button
            key={tool.label}
            onClick={() => onInsert(`$${tool.snippet}$`)}
            className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group shadow-sm active:scale-95"
            title={tool.label}
          >
            <span className="text-lg font-serif text-slate-800 group-hover:text-indigo-600 mb-1">{tool.icon}</span>
            <span className="text-[7px] text-slate-400 uppercase font-black truncate w-full text-center">{tool.label}</span>
          </button>
        ))}
      </div>
      <div className="px-3 py-1.5 bg-indigo-900 text-[8px] text-indigo-200 font-bold uppercase tracking-widest flex justify-between items-center">
        <span>Asistente Visual Matemático</span>
        <span>Haz clic para insertar estructura</span>
      </div>
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
          const newContent = beforeMatch + filtered[autocomplete.index].snippet + afterMatch;
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

  const addIndicator = () => {
    setEvaluation(prev => ({
      ...prev,
      indicators: [...prev.indicators, "Nuevo indicador de logro sugerido..."]
    }));
  };

  const removeIndicator = (index: number) => {
    setEvaluation(prev => ({
      ...prev,
      indicators: prev.indicators.filter((_, i) => i !== index)
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
          <p className="text-[9px] text-slate-400 font-medium bg-white/80 px-2 py-1 rounded text-right">Haz clic para editar. Usa el asistente para matemática compleja.</p>
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

      {/* Curriculum Context */}
      <div className="mb-8 border-2 border-slate-800 rounded-2xl overflow-hidden print-avoid-break bg-white shadow-lg shadow-slate-100 ring-1 ring-slate-900/5">
        <div className="bg-slate-900 text-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex flex-wrap justify-between items-center gap-3">
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
          
          {/* Indicators Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-2">
              <h5 className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Indicadores de Monitoreo de Logro
              </h5>
              {isEditable && (
                <button 
                  onClick={addIndicator}
                  className="no-print text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Añadir Indicador
                </button>
              )}
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-xl bg-white ring-1 ring-slate-900/5">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="w-full text-left border-collapse min-w-[600px] table-fixed">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] w-[65%]">
                        Descriptor de Desempeño Sugerido
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] text-center w-[35%] border-l border-slate-200 bg-slate-200/20">
                        Valoración de Logro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluation.indicators.map((ind, i) => (
                      <tr key={i} className="group transition-all duration-200 hover:bg-indigo-50/10">
                        <td className="px-4 sm:px-6 py-4 text-[11px] text-slate-700 leading-relaxed font-medium">
                          <div className="flex items-start gap-3">
                            <span className="text-slate-300 font-mono text-[9px] mt-1 shrink-0 group-hover:text-indigo-400 transition-colors">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="flex-1 relative">
                              <div 
                                contentEditable={isEditable} 
                                suppressContentEditableWarning 
                                onBlur={handleValidation(ind, 'indicator', i)} 
                                className={`text-left w-full outline-none focus:bg-white focus:ring-1 focus:ring-indigo-100 p-1.5 rounded-lg pr-8 leading-normal ${isEditable ? "cursor-text" : ""}`}
                              >
                                {ind}
                              </div>
                              {isEditable && (
                                <button 
                                  onClick={() => removeIndicator(i)}
                                  className="no-print absolute right-0 top-1.5 opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-600 transition-all p-1"
                                  title="Eliminar Indicador"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 110-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 border-l border-slate-100 bg-slate-50/40">
                          <div className="flex justify-around items-center gap-2">
                            {[
                              { label: 'L', title: 'Logrado' },
                              { label: 'P', title: 'En Proceso' },
                              { label: 'PL', title: 'Por Lograr' }
                            ].map(item => (
                              <div key={item.label} className="flex flex-col items-center gap-1.5 group/box cursor-help shrink-0" title={item.title}>
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border-2 border-slate-200 bg-white shadow-inner transition-all duration-300 group-hover/box:border-indigo-400 group-hover/box:bg-indigo-50 group-hover/box:scale-110"></div>
                                <span className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-tighter group-hover/box:text-indigo-600 transition-colors">
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-900 px-4 sm:px-6 py-4 border-t border-slate-800 flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest"><b className="text-white">L:</b> Logrado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    <span className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest"><b className="text-white">P:</b> En Proceso</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                    <span className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest"><b className="text-white">PL:</b> Por Lograr</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-indigo-900/40 px-3 py-1.5 rounded-full border border-indigo-800/50">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[7px] font-black text-indigo-300 uppercase tracking-[0.15em]">Instrumento Formativo Oficial</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections & WYSIWYG Editor */}
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
              <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-6 no-print shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative ring-4 ring-indigo-500/10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                    Editor Asistido de Contenido
                  </span>
                  <button onClick={() => setEditingIndex(null)} className="text-[10px] bg-indigo-600 text-white px-4 py-1.5 rounded-full font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">Finalizar Edición</button>
                </div>
                
                <MathVisualAssistant onInsert={(snippet) => insertAtCursor(idx, snippet)} />
                
                <div className="relative group/editor">
                  <div 
                    className="absolute inset-0 p-4 text-sm font-mono whitespace-pre-wrap break-words pointer-events-none text-transparent leading-normal overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: highlightLaTeX(section.content) }}
                  ></div>
                  
                  <textarea
                    id={`editor-${idx}`}
                    value={section.content}
                    onChange={(e) => handleEditorChange(idx, e)}
                    onKeyDown={(e) => handleEditorKeyDown(idx, e)}
                    className="relative w-full min-h-[200px] p-4 text-sm font-mono bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-y text-slate-800 leading-relaxed caret-indigo-600 z-10 shadow-inner"
                    placeholder="Describe la actividad... Puedes usar negritas (**texto**), listas (* ítem) y expresiones matemáticas ($x^2$)."
                    autoFocus
                  />

                  {autocomplete.show && (
                    <div 
                      className="absolute z-50 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 min-w-[200px] no-print animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
                      style={{ left: autocomplete.x, top: autocomplete.y + 25 }}
                    >
                      <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sugerencias Rápidas</span>
                        <kbd className="text-[7px] px-1.5 py-0.5 bg-white border rounded shadow-sm text-slate-400 font-black">ENTER</kbd>
                      </div>
                      <div className="max-h-60 overflow-y-auto scrollbar-thin">
                        {LATEX_COMMANDS.filter(cmd => cmd.label.toLowerCase().includes(autocomplete.filter.toLowerCase())).map((cmd, i) => (
                          <button
                            key={cmd.label}
                            onClick={() => {
                              insertAtCursor(idx, cmd.snippet);
                              setAutocomplete(prev => ({ ...prev, show: false }));
                            }}
                            className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-4 transition-colors ${autocomplete.index === i ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50'}`}
                          >
                            <code className="font-bold">{cmd.label}</code>
                            {/* Fixed: MATH_TEMPLATES objects do not have a desc property. Using static text instead. */}
                            <span className={`text-[7px] uppercase font-black px-1.5 py-0.5 rounded ${autocomplete.index === i ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>Estructura</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm ring-1 ring-slate-900/5">
                   <div className="flex items-center justify-between mb-4">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                       Previsualización en Tiempo Real
                     </p>
                     <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Modo WYSIWYG Activo</span>
                   </div>
                   <div className="prose prose-slate max-w-none math-container text-slate-800 border-l-2 border-indigo-100 pl-4" dangerouslySetInnerHTML={renderMarkdown(section.content)}></div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => isEditable && setEditingIndex(idx)}
                className={`prose prose-slate max-w-none math-container leading-relaxed text-slate-800 px-4 min-h-[50px] text-left block w-full transition-all rounded-xl border border-transparent ${isEditable ? "hover:bg-indigo-50/30 hover:border-indigo-100 cursor-pointer group-hover:shadow-sm" : ""}`}
                style={{ fontSize: '1.05em' }}
                dangerouslySetInnerHTML={renderMarkdown(section.content)}
              >
              </div>
            )}
            {isEditable && editingIndex !== idx && (
              <div className="no-print opacity-0 group-hover:opacity-100 absolute -right-12 top-0 flex flex-col gap-2 transition-all">
                <button onClick={() => setEditingIndex(idx)} className="p-3 bg-white text-indigo-600 rounded-full shadow-xl border border-indigo-50 hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 active:scale-95" title="Abrir Editor Asistido">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>
            )}
          </div>
        ))}

        {isEditable && (
          <div className="no-print pt-10 border-t-4 border-slate-100 flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={addSection} className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">Añadir Nueva Sección</button>
            <button onClick={addDevelopmentQuestion} className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-600 border-2 border-emerald-100 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all shadow-xl shadow-emerald-50 active:scale-95">Añadir Ítem de Desarrollo</button>
          </div>
        )}
      </div>

      {/* Skills and Attitudes */}
      <div className="mb-10 border-2 border-emerald-800 rounded-2xl overflow-hidden print-avoid-break bg-white shadow-xl ring-1 ring-emerald-900/5">
        <div className="bg-emerald-800 text-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          Habilidades y Actitudes Evaluadas
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-emerald-50">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Habilidades Disciplinares
              </h5>
              <div className="flex flex-wrap gap-2">{evaluation.skills?.map((skill, i) => (<span key={i} contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(skill, 'skill', i)} className={`text-[9px] font-black px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full uppercase shadow-sm ${isEditable ? editableTitleStyles : ""}`}>{skill}</span>))}</div>
            </div>
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-emerald-50">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Objetivos Actitudinales
              </h5>
              <ul className="space-y-2.5">{evaluation.attitudes?.map((att, i) => (<li key={i} className="text-[10px] text-slate-600 leading-tight flex gap-3 items-start"><span className="font-black text-emerald-500 text-xs shrink-0 mt-0.5">●</span><span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(att, 'attitude', i)} className={`text-left block w-full rounded px-2 py-1 ${isEditable ? editableParagraphStyles : ""}`}>{att}</span></li>))}</ul>
            </div>
        </div>
      </div>

      {/* Sources */}
      {evaluation.sources && evaluation.sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 no-print">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
             Evidencia de Alineamiento Mineduc
          </h4>
          <div className="flex flex-wrap gap-3">{evaluation.sources.map((source, i) => (<a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
            {source.title}
          </a>))}</div>
        </div>
      )}

      {/* Ponderación */}
      <div className="mb-10 border-2 border-slate-200 rounded-2xl overflow-hidden print-avoid-break no-print bg-white shadow-xl ring-1 ring-slate-900/5">
        <div className="bg-slate-900 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex justify-between items-center">
           <span className="text-white flex items-center gap-3">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
             Ponderación y Puntaje
           </span>
           {isEditable && <button onClick={addWeightingItem} className="text-[8px] bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 hover:text-white hover:border-slate-500 transition-all font-black uppercase tracking-widest">Añadir Ítem Externo</button>}
        </div>
        <div className="p-8">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 text-left font-black text-slate-400 uppercase tracking-widest">Indicador / Sección</th>
                <th className="py-3 text-right font-black text-slate-400 uppercase tracking-widest w-32">Puntaje / Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {evaluation.sections.map((sec, idx) => (
                <tr key={idx} className="group hover:bg-slate-50/50">
                  <td className="py-4 font-bold text-slate-700 flex items-center gap-3">
                    <span className="text-slate-300 font-mono text-[9px]">{idx+1}</span>
                    {sec.title}
                  </td>
                  <td contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation("-- pts")} className="py-4 text-right font-black text-indigo-600 focus:outline-none">-- pts</td>
                </tr>
              ))}
              {customWeightingItems.map(item => (
                <tr key={item.id} className="group hover:bg-rose-50/30">
                  <td className="py-4 font-bold text-slate-700 flex justify-between items-center pr-4">
                    <div className="flex items-center gap-3">
                       <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                       <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(item.label)} className="focus:outline-none">{item.label}</span>
                    </div>
                    <button onClick={() => removeWeightingItem(item.id)} className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                  </td>
                  <td contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(item.value)} className="py-4 text-right font-black text-rose-500 focus:outline-none">{item.value}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/50 border-t-2 border-indigo-100">
                <td className="py-5 px-4 font-black uppercase text-indigo-900 tracking-widest text-[12px]">Puntaje Total del Instrumento</td>
                <td contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation("40 pts")} className="py-5 px-4 text-right font-black text-indigo-900 text-[14px] focus:outline-none">40 pts</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-10 print-avoid-break">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t-2 border-slate-100 pt-10">
           <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Autoevaluación del Desempeño</h4>
              <div className="flex justify-around items-center">{['Logrado', 'En Proceso', 'Por Lograr'].map((status) => (<div key={status} className="flex flex-col items-center gap-3 cursor-pointer group"><div className="w-12 h-12 rounded-2xl border-2 border-slate-200 bg-white flex items-center justify-center text-slate-300 group-hover:border-indigo-500 group-hover:text-indigo-500 group-hover:shadow-lg group-hover:shadow-indigo-100 transition-all duration-300"><div className="w-5 h-5 rounded border-2 border-current"></div></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-indigo-600">{status}</span></div>))}</div>
           </div>
           <div className="p-8 bg-indigo-50/30 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Retroalimentación Pedagógica</h4>
              <div contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation("[Sin retroalimentación definida]")} className={`min-h-[100px] focus:outline-none text-left rounded-xl p-2 leading-relaxed text-slate-700 italic border-2 border-dashed border-indigo-100/50 ${isEditable ? editableParagraphStyles : ""}`}>
                <p className="text-[11px] mb-4">Espacio reservado para observaciones del docente sobre el proceso de aprendizaje evidenciado en este instrumento.</p>
                <div className="h-px bg-indigo-100/50 w-full mb-4"></div>
                <div className="h-px bg-indigo-100/50 w-full"></div>
              </div>
           </div>
        </div>
        <div className="mt-8 text-center no-print">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Generado por Inteligencia Artificial • Alineado a Estándares Mineduc 2025</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
