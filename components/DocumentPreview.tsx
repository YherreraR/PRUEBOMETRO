
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EvaluationContent, DocumentSettings } from '../types';
import { marked } from 'marked';
import { generateEducationalImage } from '../geminiService';

interface Props {
  evaluation: EvaluationContent;
  settings: DocumentSettings;
  isEditable?: boolean;
  onSettingsChange?: (settings: DocumentSettings) => void;
}

// Declaración para evitar errores de TS con window
declare global {
  interface Window {
    MathJax: any;
  }
}

// --- UTILIDAD: Obtener posición del cursor en ContentEditable ---
const getCaretIndex = (element: HTMLElement) => {
  let position = 0;
  const isSupported = typeof window.getSelection !== "undefined";
  if (isSupported) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount !== 0) {
      const range = window.getSelection()!.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      position = preCaretRange.toString().length;
    }
  }
  return position;
};

// --- UTILIDAD PARA DETECTAR MATEMÁTICA EN EL CURSOR ---
const findMathContext = (text: string, cursorIndex: number) => {
  // Buscamos delimitadores alrededor del cursor
  const leftDollar = text.lastIndexOf('$', cursorIndex - 1);
  const rightDollar = text.indexOf('$', cursorIndex);

  if (leftDollar === -1 || rightDollar === -1) return null;

  // Verificar si es bloque $$...$$
  const isBlockLeft = text[leftDollar - 1] === '$';
  const isBlockRight = text[rightDollar + 1] === '$';
  
  // Ajustar índices para incluir los delimitadores
  const startIndex = isBlockLeft ? leftDollar - 1 : leftDollar;
  const endIndex = isBlockRight ? rightDollar + 2 : rightDollar + 1;

  // Extraer contenido sin delimitadores para el editor visual
  const rawContent = text.substring(startIndex, endIndex);
  
  // Limpiar delimitadores para el visual editor
  let cleanContent = rawContent;
  if (cleanContent.startsWith('$$')) cleanContent = cleanContent.slice(2, -2);
  else if (cleanContent.startsWith('$')) cleanContent = cleanContent.slice(1, -1);

  return {
    start: startIndex,
    end: endIndex,
    raw: rawContent,
    clean: cleanContent.trim(),
    isBlock: isBlockLeft && isBlockRight
  };
};

// --- COMPONENTE EDITOR VISUAL DE MATEMÁTICAS (MathLive) ---
interface VisualBuilderProps { 
  onInsert: (latex: string) => void;
  syncedLatex: string | null;
  onSyncUpdate: (latex: string) => void;
}

const VisualMathBuilder: React.FC<VisualBuilderProps> = ({ onInsert, syncedLatex, onSyncUpdate }) => {
  const mfRef = useRef<any>(null);
  const [currentLatex, setCurrentLatex] = useState("");

  // Sincronización desde el texto hacia el editor visual
  useEffect(() => {
    if (mfRef.current && syncedLatex !== null) {
      if (mfRef.current.value !== syncedLatex) {
        mfRef.current.setValue(syncedLatex);
        setCurrentLatex(syncedLatex);
      }
    }
  }, [syncedLatex]);

  useEffect(() => {
    const mf = mfRef.current;
    if (mf) {
      mf.smartMode = true;
      
      const handleInput = (evt: any) => {
        const value = evt.target.value;
        setCurrentLatex(value);
        if (syncedLatex !== null) {
          onSyncUpdate(value);
        }
      };

      mf.addEventListener('input', handleInput);
      return () => mf.removeEventListener('input', handleInput);
    }
  }, [syncedLatex, onSyncUpdate]);

  const handleInsert = () => {
    if (!currentLatex) return;
    
    if (syncedLatex !== null) {
      if (mfRef.current) mfRef.current.setValue('');
      setCurrentLatex('');
      return;
    }

    let latexToInsert = currentLatex.trim();
    const hasDelimiters = (latexToInsert.startsWith('$') && latexToInsert.endsWith('$'));

    if (!hasDelimiters) {
      const isComplex = latexToInsert.length > 40 || 
                        latexToInsert.includes('\\frac') || 
                        latexToInsert.includes('\\sum') || 
                        latexToInsert.includes('\\int');
                        
      latexToInsert = isComplex 
        ? `\n$$ ${latexToInsert} $$\n` 
        : ` $ ${latexToInsert} $ `;
    }

    onInsert(latexToInsert);
    
    if (mfRef.current) {
      mfRef.current.setValue('');
      setCurrentLatex('');
    }
  };

  const insertTemplate = (latex: string) => {
    if(mfRef.current) {
      mfRef.current.executeCommand(['insert', latex]);
      mfRef.current.focus();
    }
  };

  const isSyncing = syncedLatex !== null;

  return (
    <div className={`sticky top-4 z-30 bg-white/95 backdrop-blur-sm border rounded-2xl shadow-xl p-4 mb-8 no-print transition-all ring-1 ${isSyncing ? 'border-emerald-500 ring-emerald-100' : 'border-indigo-100 ring-indigo-50/50'}`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isSyncing ? 'text-emerald-600' : 'text-indigo-600'}`}>
          <span className={`p-1.5 rounded-lg ${isSyncing ? 'bg-emerald-100 animate-pulse' : 'bg-indigo-100'}`}>
            {isSyncing ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
          </span>
          {isSyncing ? 'Editando Fórmula' : 'Editor Visual Matemático'}
        </h4>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { label: '÷', cmd: '\\frac{#@}{#?}', title: 'Fracción' },
            { label: '√', cmd: '\\sqrt{#@}', title: 'Raíz' },
            { label: 'xⁿ', cmd: 'x^{#?}', title: 'Potencia' },
            { label: 'π', cmd: '\\pi', title: 'Pi' },
            { label: '∑', cmd: '\\sum', title: 'Sumatoria' },
            { label: '∞', cmd: '\\infty', title: 'Infinito' },
            { label: '≤', cmd: '\\le', title: 'Menor o igual' },
          ].map((btn, idx) => (
            <button 
              key={idx}
              onClick={() => insertTemplate(btn.cmd)} 
              className="min-w-[32px] h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 font-serif transition-colors" 
              title={btn.title}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex gap-3 items-stretch">
        <div className="flex-1 relative group">
           {/* @ts-ignore - MathLive custom element */}
           <math-field 
             ref={mfRef} 
             style={{ 
               width: '100%', 
               fontSize: '1.1em', 
               padding: '8px 12px', 
               borderRadius: '10px', 
               border: isSyncing ? '2px solid #10b981' : '1px solid #cbd5e1',
               backgroundColor: '#f8fafc',
               outline: 'none',
               minHeight: '48px'
             }}
             onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleInsert();
                }
             }}
             placeholder="Escribe fórmula (ej: 1/2)..."
           ></math-field>
           {isSyncing && (
             <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase bg-emerald-100 px-2 py-0.5 rounded-full pointer-events-none">
               <span>Live</span>
             </div>
           )}
        </div>
        <button 
          onClick={handleInsert}
          disabled={!currentLatex && !isSyncing}
          className={`${isSyncing ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} disabled:bg-slate-300 text-white px-5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-2`}
        >
          {isSyncing ? 'Terminar' : 'Insertar'}
          {isSyncing ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </button>
      </div>
      {isSyncing && (
         <p className="text-[10px] text-emerald-600 mt-2 font-medium text-center">
           Editando en tiempo real.
         </p>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DOCUMENT PREVIEW ---
const DocumentPreview: React.FC<Props> = ({ evaluation: initialEvaluation, settings, isEditable = true, onSettingsChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [evaluation, setEvaluation] = useState<EvaluationContent>(initialEvaluation);
  const [parsedSections, setParsedSections] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  
  // Estado para gestión de imágenes
  const [isGeneratingImage, setIsGeneratingImage] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageUploadIndex, setActiveImageUploadIndex] = useState<number | null>(null);

  // Estado para gestión de matemática (Extendida para todos los campos)
  const [activeMathBlock, setActiveMathBlock] = useState<{
    sourceType: 'section-content' | 'section-title' | 'setting' | 'root' | 'indicator';
    key?: string;     // Para settings (schoolName) o root (title)
    index?: number;   // Para sections o indicators
    start: number;
    end: number;
    cleanLatex: string;
    isBlock: boolean;
  } | null>(null);

  const lastFocusedRef = useRef<{
    element: HTMLElement;
    selectionStart?: number;
    selectionEnd?: number;
    sectionIndex?: number;
    fieldType?: 'textarea' | 'contentEditable';
  } | null>(null);

  const typesetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setEvaluation(initialEvaluation);
  }, [initialEvaluation]);

  // Parse Markdown to HTML
  useEffect(() => {
    const processMarkdown = async () => {
      const promises = evaluation.sections.map(async (sec) => {
        try {
          const rawContent = sec.content || '';
          return await marked.parse(rawContent);
        } catch (error) {
          return sec.content;
        }
      });
      const results = await Promise.all(promises);
      setParsedSections(results);
    };
    processMarkdown();
  }, [evaluation.sections]);

  // Render MathJax
  const triggerTypeset = useCallback(() => {
    if (typesetTimeoutRef.current) window.clearTimeout(typesetTimeoutRef.current);
    typesetTimeoutRef.current = window.setTimeout(() => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => console.debug('MathJax error:', err));
      }
    }, 150);
  }, []);

  useEffect(() => {
    if (parsedSections.length > 0) {
      triggerTypeset();
    }
  }, [parsedSections, settings.fontSize, triggerTypeset]);

  const handleFocus = (sectionIndex?: number, fieldType: 'textarea' | 'contentEditable' = 'contentEditable') => (e: React.FocusEvent<HTMLElement>) => {
    const el = e.target;
    lastFocusedRef.current = {
      element: el,
      selectionStart: (el as HTMLTextAreaElement).selectionStart,
      selectionEnd: (el as HTMLTextAreaElement).selectionEnd,
      sectionIndex,
      fieldType
    };
  };

  // --- DETECCIÓN DE MATEMÁTICA (TEXTAREA) ---
  const handleTextareaCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>, sectionIndex: number) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;

    lastFocusedRef.current = {
      element: textarea,
      selectionStart: cursorPos,
      selectionEnd: textarea.selectionEnd,
      sectionIndex: sectionIndex,
      fieldType: 'textarea'
    };

    const mathCtx = findMathContext(text, cursorPos);
    
    if (mathCtx) {
      setActiveMathBlock({
        sourceType: 'section-content',
        index: sectionIndex,
        start: mathCtx.start,
        end: mathCtx.end,
        cleanLatex: mathCtx.clean,
        isBlock: mathCtx.isBlock
      });
    } else {
      setActiveMathBlock(null);
    }
  };

  // --- DETECCIÓN DE MATEMÁTICA (CONTENT EDITABLE - Headers, Titles) ---
  const handleContentEditableCursor = (
    e: React.SyntheticEvent<HTMLElement> | { currentTarget: HTMLElement }, 
    sourceType: 'setting' | 'root' | 'indicator' | 'section-title',
    keyOrIndex?: string | number
  ) => {
    const el = e.currentTarget;
    const text = el.innerText;
    const caret = getCaretIndex(el);

    // Guardar referencia foco
    lastFocusedRef.current = {
      element: el,
      selectionStart: caret,
      selectionEnd: caret,
      fieldType: 'contentEditable'
    };

    const mathCtx = findMathContext(text, caret);
    if (mathCtx) {
      setActiveMathBlock({
        sourceType,
        key: typeof keyOrIndex === 'string' ? keyOrIndex : undefined,
        index: typeof keyOrIndex === 'number' ? keyOrIndex : undefined,
        start: mathCtx.start,
        end: mathCtx.end,
        cleanLatex: mathCtx.clean,
        isBlock: mathCtx.isBlock
      });
    } else {
      setActiveMathBlock(null);
    }
  };

  // Eventos para ContentEditable
  const contentEditableEvents = (sourceType: 'setting' | 'root' | 'indicator' | 'section-title', keyOrIndex?: string | number) => ({
    onClick: (e: React.SyntheticEvent<HTMLElement>) => handleContentEditableCursor(e, sourceType, keyOrIndex),
    onKeyUp: (e: React.SyntheticEvent<HTMLElement>) => handleContentEditableCursor(e, sourceType, keyOrIndex),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      handleFocus(undefined, 'contentEditable')(e);
      // Hack: persistir el target y chequear contexto tras un breve delay para permitir que el navegador sitúe el cursor
      const target = e.currentTarget;
      setTimeout(() => {
        handleContentEditableCursor({ currentTarget: target }, sourceType, keyOrIndex);
      }, 50);
    }
  });


  const handleValidation = (placeholder: string, field?: string, index?: number) => (e: React.FocusEvent<HTMLElement>) => {
    const text = e.currentTarget.innerText.trim();
    const finalValue = text || placeholder;
    if (!text) e.currentTarget.innerText = placeholder;

    if (field) {
      if (['schoolName', 'teacherName', 'subject'].includes(field) && onSettingsChange) {
        onSettingsChange({ ...settings, [field]: finalValue });
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
        return next;
      });
    }
  };

  const updateSectionContent = (index: number, newContent: string) => {
    const newSections = [...evaluation.sections];
    newSections[index].content = newContent;
    setEvaluation({ ...evaluation, sections: newSections });
  };

  const updateSectionImage = (index: number, imageBase64: string | undefined) => {
    const newSections = [...evaluation.sections];
    newSections[index].image = imageBase64;
    setEvaluation({ ...evaluation, sections: newSections });
  };

  // --- LOGICA MATEMATICA DE INSERCION Y SINCRONIZACION ---

  const handleMathSyncUpdate = (newLatex: string) => {
    if (!activeMathBlock) return;

    const { sourceType, index, key, start, end, isBlock } = activeMathBlock;
    const wrapper = isBlock ? '$$' : '$';
    const newFormula = `${wrapper} ${newLatex} ${wrapper}`;

    // Helper para reemplazar texto
    const replaceText = (original: string) => original.substring(0, start) + newFormula + original.substring(end);

    if (sourceType === 'section-content' && index !== undefined) {
      const currentText = evaluation.sections[index].content;
      updateSectionContent(index, replaceText(currentText));
    } 
    else if (sourceType === 'setting' && key && onSettingsChange) {
      // @ts-ignore
      const currentText = settings[key] as string;
      onSettingsChange({ ...settings, [key]: replaceText(currentText) });
    }
    else if (sourceType === 'root' && key) {
      // @ts-ignore
      const currentText = evaluation[key] as string;
      // @ts-ignore
      setEvaluation(prev => ({ ...prev, [key]: replaceText(currentText) }));
    }
    else if (sourceType === 'indicator' && index !== undefined) {
      const currentText = evaluation.indicators[index];
      const newInd = [...evaluation.indicators];
      newInd[index] = replaceText(currentText);
      setEvaluation(prev => ({ ...prev, indicators: newInd }));
    }
    else if (sourceType === 'section-title' && index !== undefined) {
      const currentText = evaluation.sections[index].title;
      const newSec = [...evaluation.sections];
      newSec[index].title = replaceText(currentText);
      setEvaluation(prev => ({ ...prev, sections: newSec }));
    }
    
    // Actualizar el bloque activo
    setActiveMathBlock(prev => prev ? {
      ...prev,
      end: start + newFormula.length,
      cleanLatex: newLatex
    } : null);
  };

  const handleMathInsert = (latex: string) => {
    const lastFocus = lastFocusedRef.current;
    
    // Caso 1: Sincronización
    if (activeMathBlock) {
      setActiveMathBlock(null);
      return;
    }

    // Caso 2: Inserción normal
    if (!lastFocus || !document.contains(lastFocus.element)) {
       // Fallback a primera sección si no hay foco
      if (evaluation.sections.length > 0) {
        updateSectionContent(0, evaluation.sections[0].content + "\n" + latex);
      }
      return;
    }

    const { element, fieldType, sectionIndex } = lastFocus;

    if (fieldType === 'textarea' && sectionIndex !== undefined) {
      const textarea = element as HTMLTextAreaElement;
      const start = lastFocus.selectionStart || textarea.value.length;
      const end = lastFocus.selectionEnd || textarea.value.length;
      const currentVal = textarea.value;
      const newVal = currentVal.substring(0, start) + latex + currentVal.substring(end);
      
      updateSectionContent(sectionIndex, newVal);
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + latex.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        lastFocusedRef.current = { ...lastFocus, selectionStart: newCursorPos, selectionEnd: newCursorPos };
      }, 0);
    } 
    else if (fieldType === 'contentEditable') {
      element.focus();
      const success = document.execCommand('insertText', false, latex);
      if (!success) {
        element.innerText = element.innerText + latex;
      }
      // Forzar actualización del estado local del campo editado (trigger blur simulation)
      element.blur(); 
    }
  };

  // --- LOGICA DE IMAGENES Y GESTION ---
  const handleGenerateAIImage = async (index: number) => {
    setIsGeneratingImage(index);
    const section = evaluation.sections[index];
    const prompt = `Ilustración educativa clara y simple para: ${section.title}. ${section.content.substring(0, 100)}`;
    const imageUrl = await generateEducationalImage(prompt);
    if (imageUrl) updateSectionImage(index, imageUrl);
    else alert("No se pudo generar la imagen.");
    setIsGeneratingImage(null);
  };

  const handleTriggerUpload = (index: number) => {
    setActiveImageUploadIndex(index);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeImageUploadIndex !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageResult = reader.result as string;

        // Si el índice apunta a la longitud actual, significa que estamos creando una nueva sección
        if (activeImageUploadIndex === evaluation.sections.length) {
            setEvaluation(prev => ({
            ...prev,
            sections: [
              ...prev.sections,
              {
                title: "Pregunta con Imagen",
                content: "Observa la siguiente imagen y responde:\n\n\n**Respuesta:** ____________________",
                weight: "3 pts",
                image: imageResult
              }
            ]
          }));
           setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
        } else {
           // Si no, actualizamos la sección existente
           updateSectionImage(activeImageUploadIndex, imageResult);
        }

        setActiveImageUploadIndex(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => updateSectionImage(index, undefined);

  const handleLocalSave = () => {
    try {
      localStorage.setItem('evalmat_backup', JSON.stringify({ evaluation, settings, lastSaved: new Date().toISOString() }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) { alert("Error al guardar localmente."); }
  };

  const handleAddSection = () => {
    setEvaluation(prev => ({
      ...prev,
      sections: [...prev.sections, { title: "Pregunta de Desarrollo", content: "Escribe aquí el enunciado...\n\n\n\n**Respuesta:** ____________________", weight: "3 pts" }]
    }));
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const handleAddMultipleChoice = () => {
    setEvaluation(prev => ({
      ...prev,
      sections: [...prev.sections, { title: "Selección Múltiple", content: "Escribe aquí el enunciado...\n\na) Alt A\nb) Alt B\nc) Alt C\nd) Alt D", weight: "2 pts" }]
    }));
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };
  
  const handleAddImageSection = () => {
    // Apuntamos al índice "siguiente" para indicar creación
    setActiveImageUploadIndex(evaluation.sections.length);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDeleteSection = (index: number) => {
    if(window.confirm("¿Eliminar pregunta?")) {
      setEvaluation(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
    }
  };

  const editableStyles = "focus:outline-none focus:bg-indigo-50/50 hover:bg-slate-50 rounded px-1 transition-colors cursor-text border border-transparent focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="flex flex-col gap-6 relative">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      
      {isEditable && (
        <VisualMathBuilder 
          onInsert={handleMathInsert} 
          syncedLatex={activeMathBlock ? activeMathBlock.cleanLatex : null}
          onSyncUpdate={handleMathSyncUpdate}
        />
      )}

      <div 
        ref={containerRef}
        className={`relative bg-white mx-auto text-slate-900 w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] shadow-2xl print:shadow-none print:p-[15mm] print:w-full print:m-0 ${settings.fontSize} rounded-3xl print:rounded-none latex-style`} 
        id="printable-eval"
      >
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 no-print">
          {saveStatus === 'saved' && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">¡Guardado!</span>
          )}
          <button onClick={handleLocalSave} className="bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 p-2 rounded-full shadow-sm hover:shadow-md transition-all" title="Guardar borrador">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          </button>
        </div>

        {/* --- CABECERA --- */}
        <div className={`flex flex-col sm:flex-row justify-between items-start border-b-2 pb-6 mb-8 gap-4 sm:gap-0 ${settings.headerColor.includes('text-slate-900') ? 'border-slate-800' : 'border-indigo-600'}`}>
          <div className="flex-1 text-left w-full sm:w-auto">
            <h3 
              contentEditable={isEditable} suppressContentEditableWarning 
              onBlur={handleValidation(settings.schoolName, 'schoolName')}
              {...contentEditableEvents('setting', 'schoolName')}
              className={`font-bold text-xl uppercase leading-tight text-indigo-900 ${isEditable ? editableStyles : ""}`}
            >{settings.schoolName}</h3>
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-bold text-slate-600">
                <span className="text-slate-400 uppercase tracking-widest mr-2">Docente:</span>
                <span 
                  contentEditable={isEditable} suppressContentEditableWarning 
                  onBlur={handleValidation(settings.teacherName, 'teacherName')} 
                  {...contentEditableEvents('setting', 'teacherName')}
                  className={editableStyles}
                >{settings.teacherName}</span>
              </p>
              <p className="text-[10px] font-bold text-slate-600">
                <span className="text-slate-400 uppercase tracking-widest mr-2">Asignatura:</span>
                <span 
                  contentEditable={isEditable} suppressContentEditableWarning 
                  onBlur={handleValidation(settings.subject, 'subject')} 
                  {...contentEditableEvents('setting', 'subject')}
                  className={editableStyles}
                >{settings.subject}</span>
              </p>
            </div>
          </div>
          
          <div className="w-full sm:w-auto ml-0 sm:ml-4 flex justify-end">
             <table className="border-collapse border-2 border-slate-800 text-[10px] w-full sm:w-32 bg-white">
                <tbody>
                  <tr><td className="border border-slate-800 p-1 font-bold bg-slate-100 uppercase w-1/2 sm:w-auto">Ideal</td><td className="border border-slate-800 p-1 text-center font-bold">40</td></tr>
                  <tr><td className="border border-slate-800 p-1 font-bold bg-white uppercase">Obt.</td><td className="border border-slate-800 p-1"></td></tr>
                  <tr><td className="border border-slate-800 p-1 font-bold bg-indigo-900 text-white uppercase">Nota</td><td className="border border-slate-800 p-1"></td></tr>
                </tbody>
             </table>
          </div>
        </div>

        {/* --- DATOS ESTUDIANTE --- */}
        <div className="mb-10 p-4 border border-slate-200 rounded-xl bg-slate-50/30 flex gap-8">
          <div className="flex-1 border-b border-slate-300 flex justify-between items-end pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estudiante</span>
          </div>
          <div className="w-1/3 border-b border-slate-300 flex justify-between items-end pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</span>
          </div>
        </div>

        {/* --- TÍTULO --- */}
        <div className="text-center mb-10">
          <h1 
            contentEditable={isEditable} suppressContentEditableWarning 
            onBlur={handleValidation(evaluation.title, 'title')} 
            {...contentEditableEvents('root', 'title')}
            className={`text-2xl sm:text-3xl font-bold text-slate-900 uppercase tracking-tight mb-2 ${isEditable ? editableStyles : ""}`}
          >{evaluation.title}</h1>
          <span className="inline-block px-3 py-1 bg-indigo-900 text-white rounded text-[9px] font-bold tracking-[0.2em] uppercase">Evaluación Sumativa</span>
        </div>

        {/* --- CURRICULUM --- */}
        <div className="mb-8 border-l-4 border-indigo-600 bg-indigo-50/20 p-6 rounded-r-xl">
          <div className="mb-4">
            <h5 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Objetivo de Aprendizaje</h5>
            <p className="text-sm font-medium text-slate-800 text-justify">
              <span className="font-bold mr-2">{evaluation.oa_code}</span>
              <span 
                contentEditable={isEditable} suppressContentEditableWarning 
                onBlur={handleValidation(evaluation.oa_description, 'oa_description')}
                {...contentEditableEvents('root', 'oa_description')}
                className={editableStyles}
              >{evaluation.oa_description}</span>
            </p>
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Indicadores de Evaluación</h5>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 marker:text-indigo-400">
              {evaluation.indicators.map((ind, i) => (
                <li 
                  key={i} 
                  contentEditable={isEditable} suppressContentEditableWarning 
                  onBlur={handleValidation(ind, 'indicator', i)} 
                  {...contentEditableEvents('indicator', i)}
                  className={editableStyles}
                >{ind}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* --- TABLA PONDERACION --- */}
        <div className="mb-10 rounded-xl border border-slate-200 print-avoid-break overflow-hidden">
           <div className="w-full overflow-x-auto">
             <table className="w-full text-left text-xs min-w-[300px] sm:min-w-full">
               <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                 <tr>
                   <th className="p-3 whitespace-nowrap">Ítem / Actividad</th>
                   <th className="p-3 text-center w-24 whitespace-nowrap">Puntaje</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {evaluation.sections.map((sec, idx) => (
                   <tr key={idx}>
                     <td className="p-3 font-medium text-slate-700 min-w-[200px] break-words">
                        {idx+1}. {sec.title}
                     </td>
                     <td className="p-3 text-center align-middle">
                       <input 
                         className="w-full text-center bg-transparent outline-none font-bold text-slate-500 placeholder:text-slate-300" 
                         placeholder="0 pts"
                         value={sec.weight || ''}
                         onChange={(e) => {
                           const n = [...evaluation.sections];
                           n[idx].weight = e.target.value;
                           setEvaluation({...evaluation, sections: n});
                         }}
                       />
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* --- SECCIONES DINÁMICAS --- */}
        <div className="space-y-12">
          {evaluation.sections.map((section, index) => (
            <div key={index} className="print-avoid-break group/section relative">
              <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-2">
                <span className="text-xl font-bold text-slate-300">#{index + 1}</span>
                <h3 
                  className={`text-lg font-bold text-slate-800 flex-1 ${isEditable ? editableStyles : ""}`}
                  contentEditable={isEditable} suppressContentEditableWarning
                  onBlur={(e) => {
                    const n = [...evaluation.sections];
                    n[index].title = e.currentTarget.innerText;
                    setEvaluation({...evaluation, sections: n});
                  }}
                  {...contentEditableEvents('section-title', index)}
                >{section.title}</h3>
                
                {/* BOTONES DE EDICIÓN (SOLO MODO EDICION) */}
                {isEditable && (
                  <div className="flex gap-2 no-print opacity-100 sm:opacity-0 sm:group-hover/section:opacity-100 transition-opacity">
                    <button 
                       onClick={() => handleTriggerUpload(index)}
                       className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                       title="Subir imagen desde texto escolar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                    <button 
                       onClick={() => handleGenerateAIImage(index)}
                       disabled={isGeneratingImage === index}
                       className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
                       title="Generar ilustración con IA"
                    >
                      {isGeneratingImage === index ? (
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      )}
                    </button>
                    <button 
                       onClick={() => handleDeleteSection(index)}
                       className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                       title="Eliminar esta pregunta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* RENDERIZADO DE IMAGEN */}
                {section.image && (
                  <div className="relative group max-w-md mx-auto my-4">
                     <img src={section.image} alt="Referencia visual" className="rounded-xl border border-slate-200 shadow-sm w-full object-contain max-h-64" />
                     {isEditable && (
                       <button 
                         onClick={() => removeImage(index)}
                         className="absolute top-2 right-2 bg-rose-600 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity no-print"
                         title="Eliminar imagen"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                     )}
                  </div>
                )}

                {isEditable ? (
                  <div className="group relative">
                    <textarea
                      id={`editor-${index}`}
                      value={section.content}
                      onChange={(e) => updateSectionContent(index, e.target.value)}
                      onFocus={handleFocus(index, 'textarea')}
                      onClick={(e) => handleTextareaCursor(e, index)}
                      onKeyUp={(e) => handleTextareaCursor(e, index)}
                      onSelect={(e) => handleTextareaCursor(e, index)}
                      className={`w-full p-4 bg-slate-50 rounded-xl border focus:ring-4 outline-none text-sm font-mono text-slate-700 min-h-[150px] transition-all mb-4 leading-relaxed text-justify ${activeMathBlock?.sourceType === 'section-content' && activeMathBlock.index === index ? 'border-emerald-400 ring-emerald-50/50' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-50/50'}`}
                      placeholder="Escribe aquí el contenido. Haz clic sobre una fórmula $...$ para editarla visualmente..."
                    />
                    {/* Preview en vivo debajo del editor */}
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-white">
                       <div className="flex items-center gap-2 mb-3">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                         <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Vista Previa en Vivo</div>
                       </div>
                       <div 
                         className="math-container prose prose-sm prose-slate max-w-none text-justify"
                         dangerouslySetInnerHTML={{ __html: parsedSections[index] || '' }}
                       />
                    </div>
                  </div>
                ) : (
                  <div 
                    className="math-container prose prose-slate max-w-none text-justify"
                    dangerouslySetInnerHTML={{ __html: parsedSections[index] || '' }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* BOTONES AGREGAR SECCIÓN (SOLO MODO EDICION) */}
        {isEditable && (
          <div className="no-print mt-12 mb-8 flex flex-col sm:flex-row justify-center gap-4 pb-8 border-b-2 border-dashed border-slate-200">
            {/* Botón Desarrollo */}
            <button 
              onClick={handleAddSection}
              className="group flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl font-bold text-sm hover:border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-lg active:scale-95"
            >
              <span className="bg-indigo-50 text-indigo-600 group-hover:bg-white group-hover:text-indigo-600 p-1 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </span>
              Pregunta Desarrollo
            </button>

            {/* Botón Selección Múltiple */}
            <button 
              onClick={handleAddMultipleChoice}
              className="group flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-emerald-100 text-emerald-600 rounded-2xl font-bold text-sm hover:border-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:shadow-lg active:scale-95"
            >
              <span className="bg-emerald-50 text-emerald-600 group-hover:bg-white group-hover:text-emerald-600 p-1 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </span>
              Pregunta Alternativas
            </button>

            {/* Botón Insertar Imagen */}
            <button 
              onClick={handleAddImageSection}
              className="group flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-amber-100 text-amber-600 rounded-2xl font-bold text-sm hover:border-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm hover:shadow-lg active:scale-95"
            >
              <span className="bg-amber-50 text-amber-600 group-hover:bg-white group-hover:text-amber-600 p-1 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </span>
              Insertar Imagen
            </button>
          </div>
        )}

        <div className="mt-20 pt-8 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Generado con EvaluApp • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
