
import React, { useEffect, useRef, useState } from 'react';
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

const DocumentPreview: React.FC<Props> = ({ evaluation: initialEvaluation, settings, isEditable = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [evaluation, setEvaluation] = useState<EvaluationContent>(initialEvaluation);
  const [customWeightingItems, setCustomWeightingItems] = useState<Array<{ id: number; label: string; value: string }>>([]);

  // Update local state if initialEvaluation changes (e.g. new generation)
  useEffect(() => {
    setEvaluation(initialEvaluation);
  }, [initialEvaluation]);

  useEffect(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      const timer = setTimeout(() => {
        window.MathJax.typesetPromise([containerRef.current]);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [evaluation, settings.fontSize]);

  const handleValidation = (placeholder: string) => (e: React.FocusEvent<HTMLElement>) => {
    const text = e.currentTarget.innerText.trim();
    if (!text) {
      e.currentTarget.innerText = placeholder;
    }
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

  // Helper to render markdown to HTML for initial view
  const renderMarkdown = (content: string) => {
    try {
      return { __html: marked.parse(content) };
    } catch (e) {
      return { __html: content };
    }
  };

  // Common editable styles
  const editableTitleStyles = "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-indigo-50 rounded px-1 transition-all duration-200 cursor-text";
  const editableParagraphStyles = "focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-slate-50 rounded px-1 transition-all duration-200 cursor-text";

  return (
    <div 
      ref={containerRef}
      className={`
        relative bg-white mx-auto text-slate-900
        w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm]
        shadow-2xl print:shadow-none print:p-[15mm] print:w-full print:m-0
        ${settings.fontSize} transition-all duration-300
      `} 
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
          <p className="text-[9px] text-slate-400 font-medium bg-white/80 px-2 py-1 rounded">Haz clic para editar. Los cambios se reflejan al imprimir.</p>
        </div>
      )}

      {/* Header Section */}
      <div className={`flex justify-between items-start border-b-2 pb-6 mb-8 ${settings.headerColor.includes('text-slate-900') ? 'border-slate-800' : 'border-indigo-600'}`}>
        <div className="flex-1 space-y-2">
          <h3 
            contentEditable={isEditable} 
            suppressContentEditableWarning
            onBlur={handleValidation(settings.schoolName)}
            className={`font-black text-xl uppercase tracking-tight leading-tight text-indigo-900 text-left ${isEditable ? editableTitleStyles : ""}`}
          >
            {settings.schoolName}
          </h3>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Docente:</span>
              <span 
                contentEditable={isEditable} 
                suppressContentEditableWarning 
                onBlur={handleValidation(settings.teacherName)}
                className={`text-[10px] font-bold text-slate-600 text-left min-w-[100px] block ${isEditable ? editableParagraphStyles : ""}`}
              >
                {settings.teacherName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Asignatura:</span>
              <span 
                contentEditable={isEditable} 
                suppressContentEditableWarning 
                onBlur={handleValidation(settings.subject)}
                className={`text-[10px] font-bold text-slate-600 text-left min-w-[100px] block ${isEditable ? editableParagraphStyles : ""}`}
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
                  <td className="border border-slate-800 p-1.5 font-bold bg-slate-100 uppercase">Pje. Ideal</td>
                  <td 
                    className={`border border-slate-800 p-1.5 text-center font-black ${isEditable ? "focus:outline-none focus:bg-indigo-50" : ""}`}
                    contentEditable={isEditable} 
                    suppressContentEditableWarning
                    onBlur={handleValidation("40")}
                  >
                    40
                  </td>
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

      {/* Conditional General Instructions Section */}
      {settings.showInstructions && (
        <div className="mb-8 border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/30 print-avoid-break">
          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Instrucciones Generales
          </h4>
          <div 
            contentEditable={isEditable}
            suppressContentEditableWarning
            onBlur={handleValidation("Lea atentamente cada pregunta antes de responder.")}
            className={`text-[10px] text-slate-600 leading-relaxed italic text-left ${isEditable ? editableParagraphStyles : ""}`}
          >
            Lea atentamente cada pregunta antes de responder. Utilice lápiz mina para sus cálculos y lápiz pasta para su respuesta definitiva si es necesario. No se permite el uso de calculadora a menos que se indique lo contrario. Mantenga el orden y la limpieza de su instrumento. Dispone de 90 minutos para completar esta evaluación.
          </div>
        </div>
      )}

      {/* Title */}
      <div className="text-center mb-10">
        <h1 
          contentEditable={isEditable} 
          suppressContentEditableWarning 
          onBlur={handleValidation(evaluation.title)}
          className={`text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2 text-center block w-full ${isEditable ? editableTitleStyles : ""}`}
        >
          {evaluation.title}
        </h1>
        <div className="inline-block px-3 py-1 bg-indigo-900 text-white rounded text-[9px] font-black tracking-widest uppercase">
          Evaluación Formativa • Mineduc Chile
        </div>
      </div>

      {/* Curriculum Context */}
      <div className="mb-6 border-2 border-slate-800 rounded-xl overflow-hidden print-avoid-break">
        <div className="bg-slate-800 text-white px-4 py-3 text-[10px] font-black uppercase tracking-widest flex justify-between items-center shadow-sm">
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
            </svg>
            Alineación Curricular y Seguimiento
          </span>
          <span className="text-[8px] opacity-70 bg-white/10 px-2 py-0.5 rounded">Fuentes: Currículum Nacional</span>
        </div>
        <div className="p-4 sm:p-6 space-y-8 bg-slate-50/10">
          <div className="border-l-4 border-indigo-600 pl-5 bg-white py-4 pr-4 rounded-r-lg shadow-sm">
            <h5 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
              Objetivo de Aprendizaje Seleccionado
            </h5>
            <div className="text-[11px] font-bold text-slate-800 leading-relaxed italic text-left">
              <span 
                className={`text-indigo-800 mr-1 underline font-black ${isEditable ? editableTitleStyles : ""}`} 
                contentEditable={isEditable} 
                suppressContentEditableWarning
                onBlur={handleValidation(evaluation.oa_code)}
              >
                {evaluation.oa_code}
              </span>: 
              <span 
                contentEditable={isEditable} 
                suppressContentEditableWarning 
                onBlur={handleValidation(evaluation.oa_description)}
                className={`ml-1 leading-relaxed ${isEditable ? editableParagraphStyles : ""}`}
              >
                "{evaluation.oa_description}"
              </span>
            </div>
          </div>
          
          <div>
            <h5 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
               Indicadores de Evaluación y Monitoreo de Logro
            </h5>
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-md bg-white">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-5 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest w-3/5 sm:w-2/3">Descriptores de Desempeño (Mineduc)</th>
                    <th className="px-5 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center w-2/5 sm:w-1/3 border-l border-slate-200 bg-slate-50/50">Nivel de Logro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluation.indicators.map((ind, i) => (
                    <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-5 py-4 text-[11px] text-slate-700 leading-snug">
                        <div 
                          contentEditable={isEditable} 
                          suppressContentEditableWarning 
                          onBlur={handleValidation("[Indicador de evaluación]")}
                          className={`text-left ${isEditable ? editableParagraphStyles : ""}`}
                        >
                          {ind}
                        </div>
                      </td>
                      <td className="px-5 py-4 border-l border-slate-100 bg-slate-50/10">
                        <div className="flex justify-around items-center gap-4">
                          {['L', 'P', 'PL'].map(label => (
                            <div key={label} className="flex flex-col items-center gap-1.5 shrink-0">
                              <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white shadow-sm group-hover:border-indigo-400 transition-all duration-300"></div>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-indigo-500">{label}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span className="text-[8px] font-bold text-slate-400 uppercase italic tracking-wider">L: Logrado | P: En Proceso | PL: Por Lograr</span>
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Instrumento de Evaluación Formativa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ponderación de la Evaluación */}
      <div className="mb-6 border-2 border-indigo-200 rounded-xl overflow-hidden print-avoid-break">
        <div className="bg-indigo-100 text-indigo-800 px-4 py-2 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
          <span>Ponderación de la Evaluación</span>
          {isEditable && (
            <button 
              onClick={addWeightingItem} 
              className="no-print bg-indigo-200 hover:bg-indigo-300 text-indigo-800 px-2 py-0.5 rounded text-[8px] font-black uppercase transition-colors"
            >
              + Agregar Ítem
            </button>
          )}
        </div>
        <div className="p-4">
          <table className="w-full text-left border-collapse border border-indigo-50">
            <thead>
              <tr className="bg-indigo-50/30">
                <th className="px-4 py-2 text-[8px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-50">Sección / Ítem de Evaluación</th>
                <th className="px-4 py-2 text-[8px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-50 text-center w-40">Puntaje / Peso</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.sections.map((section, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-[10px] font-bold text-slate-700 border border-indigo-50">
                    {idx + 1}. <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(section.title)} className={isEditable ? editableTitleStyles : ""}>{section.title}</span>
                  </td>
                  <td 
                    contentEditable={isEditable}
                    className={`px-4 py-2 text-[10px] text-center font-black text-indigo-600 border border-indigo-50 ${isEditable ? "focus:outline-none focus:bg-indigo-50" : ""}`}
                    suppressContentEditableWarning
                    onBlur={handleValidation("-- pts")}
                  >
                    -- pts
                  </td>
                </tr>
              ))}
              {customWeightingItems.map((item) => (
                <tr key={item.id} className="group">
                  <td className="px-4 py-2 text-[10px] font-bold text-slate-700 border border-indigo-50 flex justify-between items-center">
                    <span contentEditable={isEditable} suppressContentEditableWarning onBlur={handleValidation(item.label)} className={isEditable ? editableTitleStyles : ""}>{item.label}</span>
                    {isEditable && (
                      <button 
                        onClick={() => removeWeightingItem(item.id)} 
                        className="no-print opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td 
                    contentEditable={isEditable}
                    className={`px-4 py-2 text-[10px] text-center font-black text-indigo-600 border border-indigo-50 ${isEditable ? "focus:outline-none focus:bg-indigo-50" : ""}`}
                    suppressContentEditableWarning
                    onBlur={handleValidation(item.value)}
                  >
                    {item.value}
                  </td>
                </tr>
              ))}
              <tr className="bg-indigo-50/20 font-black">
                <td className="px-4 py-2 text-[10px] uppercase border border-indigo-50">Total Evaluación</td>
                <td 
                  className={`px-4 py-2 text-[10px] text-center border border-indigo-50 ${isEditable ? "focus:outline-none focus:bg-indigo-50" : ""}`}
                  contentEditable={isEditable} 
                  suppressContentEditableWarning
                  onBlur={handleValidation("100% / 40 pts")}
                >
                  100% / 40 pts
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[7px] text-slate-400 italic no-print">Sugerencia: Puedes agregar ítems como "Limpieza", "Puntualidad" o "Justificación de respuestas".</p>
        </div>
      </div>

      {/* Skills and Attitudes Section */}
      <div className="mb-10 border-2 border-emerald-800 rounded-xl overflow-hidden print-avoid-break">
        <div className="bg-emerald-800 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest">Habilidades y Actitudes Evaluadas</div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h5 className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter mb-3">Habilidades Disciplinares</h5>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.skills?.map((skill, i) => (
                  <span 
                    key={i} 
                    contentEditable={isEditable} 
                    suppressContentEditableWarning
                    onBlur={handleValidation(skill)}
                    className={`text-[8px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded uppercase tracking-tighter ${isEditable ? editableTitleStyles : ""}`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter mb-3">Objetivos Actitudinales</h5>
              <ul className="space-y-1.5">
                {evaluation.attitudes?.map((att, i) => (
                  <li key={i} className="text-[9px] text-slate-600 leading-tight flex gap-2 items-start group">
                    <span className="font-black text-emerald-500 shrink-0 mt-0.5">✓</span>
                    <span 
                      contentEditable={isEditable} 
                      suppressContentEditableWarning 
                      onBlur={handleValidation("[Objetivo actitudinal]")}
                      className={`text-left block ${isEditable ? editableParagraphStyles : ""}`}
                    >
                      {att}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-12 pb-12">
        {evaluation.sections.map((section, idx) => (
          <div key={idx} className="print-avoid-break relative group">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center font-black text-lg rounded-lg shrink-0">{idx + 1}</div>
              <h2 
                contentEditable={isEditable} 
                suppressContentEditableWarning 
                onBlur={handleValidation(section.title)}
                className={`text-lg font-black text-slate-800 uppercase tracking-tight border-b-2 border-slate-900 flex-1 text-left ${isEditable ? editableTitleStyles : ""}`}
              >
                {section.title}
              </h2>
              {isEditable && (
                <button 
                  onClick={() => removeSection(idx)} 
                  className="no-print opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-all shrink-0"
                  title="Eliminar Sección"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <div 
              contentEditable={isEditable} 
              suppressContentEditableWarning
              onBlur={handleValidation("[Escriba aquí el contenido de la sección]")}
              className={`prose prose-slate max-w-none math-container leading-relaxed text-slate-800 px-4 min-h-[50px] text-left block w-full ${isEditable ? editableParagraphStyles : ""}`}
              style={{ fontSize: '1.05em' }}
              dangerouslySetInnerHTML={renderMarkdown(section.content)}
            >
            </div>
          </div>
        ))}

        {isEditable && (
          <div className="no-print pt-6 border-t-2 border-dashed border-slate-200 flex flex-col sm:flex-row justify-center gap-3">
            <button 
              onClick={addSection}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all border-2 border-indigo-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Añadir Sección General
            </button>
            <button 
              onClick={addDevelopmentQuestion}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all border-2 border-emerald-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Añadir Pregunta de Desarrollo
            </button>
          </div>
        )}
      </div>

      {/* Sources - ONLY PRINT IF EXIST */}
      {evaluation.sources && evaluation.sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 no-print">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fuentes de Consulta (Currículum Nacional):</h4>
          <div className="space-y-1">
            {evaluation.sources.map((source, i) => (
              <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="block text-[9px] text-indigo-500 hover:underline">
                • {source.title} ({source.uri})
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer Panel */}
      <div className="mt-auto pt-10 print-avoid-break">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t-2 border-slate-100 pt-8">
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Autoevaluación Global</h4>
              <div className="flex justify-around items-end pb-1">
                {['Logrado', 'En Proceso', 'Por Lograr'].map((status, i) => (
                  <div key={status} className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className={`w-9 h-9 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-300 transition-colors group-hover:border-indigo-500 group-hover:text-indigo-500`}>
                      <div className="w-4 h-4 rounded-sm border-2 border-current"></div>
                    </div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{status}</span>
                  </div>
                ))}
              </div>
           </div>
           <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100">
              <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Retroalimentación Docente</h4>
              <div 
                contentEditable={isEditable} 
                suppressContentEditableWarning 
                onBlur={handleValidation("[Escriba aquí su retroalimentación para el estudiante]")}
                className={`min-h-[80px] focus:outline-none text-left ${isEditable ? editableParagraphStyles : ""}`}
              >
                <div className="h-10 border-b border-indigo-100 border-dashed"></div>
                <div className="h-10 border-b border-indigo-100 border-dashed"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
