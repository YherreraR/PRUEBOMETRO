import React, { useState, useRef, useEffect } from 'react';
import { AssessmentTemplate, HeaderLayout } from '../types';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import FileSaver from 'file-saver';

interface Props {
  currentTemplate: AssessmentTemplate;
  onTemplateChange: (template: AssessmentTemplate) => void;
}

const DEFAULT_TEMPLATE: AssessmentTemplate = {
  id: 'default',
  name: 'Estándar EvaluApp',
  headerLayout: 'simple',
  primaryColor: '#4f46e5', // indigo-600
  fontFamily: 'Century Gothic', // ACTUALIZADO A CENTURY GOTHIC
  showBorder: false,
  schoolInfoAlignment: 'left'
};

const TemplateManager: React.FC<Props> = ({ currentTemplate, onTemplateChange }) => {
  const [savedTemplates, setSavedTemplates] = useState<AssessmentTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'word'>('visual');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar tab con el estado actual de la plantilla
  useEffect(() => {
    if (currentTemplate.docxFile) {
      setActiveTab('word');
    } else {
      setActiveTab('visual');
    }
  }, [currentTemplate.id]);

  // Cargar plantillas guardadas al inicio
  useEffect(() => {
    const saved = localStorage.getItem('evaluapp_templates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando plantillas", e);
      }
    }
  }, []);

  const handleSaveTemplate = () => {
    const templateName = prompt("Nombre para esta plantilla (ej: Colegio San Mateo):", currentTemplate.name);
    if (!templateName) return;

    const newTemplate = { ...currentTemplate, id: Date.now().toString(), name: templateName };
    const updatedList = [...savedTemplates, newTemplate];
    
    try {
      const json = JSON.stringify(updatedList);
      if (json.length > 4500000) {
        alert("El archivo o imágenes son muy grandes para el almacenamiento local. Intenta usar imágenes más pequeñas.");
        return;
      }
      setSavedTemplates(updatedList);
      localStorage.setItem('evaluapp_templates', json);
      onTemplateChange(newTemplate);
      alert("¡Formato guardado correctamente!");
    } catch (e) {
      alert("Error: No hay suficiente espacio para guardar esta plantilla.");
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este formato?")) {
      const updatedList = savedTemplates.filter(t => t.id !== id);
      setSavedTemplates(updatedList);
      localStorage.setItem('evaluapp_templates', JSON.stringify(updatedList));
      if (currentTemplate.id === id) {
        onTemplateChange(DEFAULT_TEMPLATE);
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onTemplateChange({ ...currentTemplate, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onTemplateChange({ ...currentTemplate, docxFile: result });
        setActiveTab('word'); 
      };
      reader.readAsDataURL(file);
    }
  };

  const updateField = (field: keyof AssessmentTemplate, value: any) => {
    onTemplateChange({ ...currentTemplate, [field]: value });
  };

  const switchToVisual = () => {
    setActiveTab('visual');
    if (currentTemplate.docxFile) {
        onTemplateChange({ ...currentTemplate, docxFile: undefined });
    }
  };

  const switchToWord = () => {
    setActiveTab('word');
  };

  // Función para descargar una plantilla base de ejemplo
  const downloadExampleTemplate = () => {
    // Como no podemos generar un docx binario complejo desde cero sin librería pesada aquí mismo,
    // crearemos un Blob simple o alertaremos. 
    // Para esta demo, simularemos la descarga de instrucciones.
    const text = `INSTRUCCIONES PARA CREAR TU PLANTILLA WORD:
    
1. Abre Microsoft Word.
2. Diseña tu documento con el logo de tu colegio, encabezado y pie de página habitual.
3. Donde quieras que aparezca la información, escribe las siguientes variables (incluyendo las llaves):

DATOS GENERALES:
{schoolName}   -> Nombre del Colegio
{teacherName}  -> Nombre del Profesor
{subject}      -> Asignatura
{grade}        -> Curso (ej: 1° Básico)
{date}         -> Fecha actual
{title}        -> Título de la Evaluación

OBJETIVOS:
{oa_code}        -> Código OA (ej: OA 4)
{oa_description} -> Descripción completa del OA

INDICADORES (Lista):
{#indicators}
  - {.}
{/indicators}

PREGUNTAS / ÍTEMS (El núcleo de la prueba):
{#sections}
  {title} ({weight})
  {content}
  
{/sections}

4. Guarda el archivo como .docx
5. Súbelo a EvaluApp en la pestaña "Plantilla Word".
`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(blob, "Instrucciones_Plantilla_EvaluApp.txt");
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 no-print">
      <h2 className="text-xl font-bold mb-4 text-slate-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        Formatos Institucionales
      </h2>

      {/* Selector de Plantillas Guardadas */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Mis Formatos Guardados</label>
        <select 
          className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
          value={savedTemplates.find(t => t.id === currentTemplate.id) ? currentTemplate.id : 'custom'}
          onChange={(e) => {
            if (e.target.value === 'default') onTemplateChange(DEFAULT_TEMPLATE);
            else {
              const selected = savedTemplates.find(t => t.id === e.target.value);
              if (selected) onTemplateChange(selected);
              else onTemplateChange({ ...DEFAULT_TEMPLATE, id: 'custom', name: 'Nuevo Formato' });
            }
          }}
        >
          <option value="default">Estándar EvaluApp (Web)</option>
          {savedTemplates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
          <option value="custom">-- Crear/Editar Nuevo --</option>
        </select>
      </div>

      <button 
        onClick={() => setIsEditing(!isEditing)}
        className="w-full py-2 mb-4 text-xs font-bold uppercase tracking-widest text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {isEditing ? 'Ocultar Editor' : 'Diseñar / Cargar Formato'}
      </button>

      {/* Editor de Plantilla */}
      {isEditing && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
          
          {/* TABS para elegir modo */}
          <div className="flex border-b border-slate-200">
            <button 
                className={`flex-1 pb-3 px-4 text-[10px] sm:text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === 'visual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} 
                onClick={switchToVisual}
            >
              Diseñador Web (Básico)
            </button>
            <button 
                className={`flex-1 pb-3 px-4 text-[10px] sm:text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === 'word' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} 
                onClick={switchToWord}
            >
              Plantilla Word (.docx)
            </button>
          </div>

          {activeTab === 'visual' ? (
            <div className="space-y-4">
              {/* MODO DISEÑADOR VISUAL */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                {currentTemplate.logoUrl ? (
                  <div className="relative group">
                    <img src={currentTemplate.logoUrl} alt="Logo" className="h-16 mx-auto object-contain" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <span className="text-white text-xs font-bold">Cambiar Logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-bold uppercase">Subir Logo Colegio</span>
                  </div>
                )}
              </div>

              {/* Layout Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Disposición Encabezado</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'simple', label: 'Simple' },
                      { id: 'logo-left', label: 'Logo Izq' },
                      { id: 'logo-right', label: 'Logo Der' },
                      { id: 'logo-center', label: 'Logo Centro' },
                      { id: 'double-column', label: '2 Columnas' }
                    ].map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => updateField('headerLayout', opt.id)}
                        className={`p-2 text-[10px] font-bold border rounded-md transition-all ${currentTemplate.headerLayout === opt.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Alineación Texto */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Alineación Info Colegio</label>
                <div className="flex bg-slate-100 rounded-lg p-1">
                    {['left', 'center', 'right'].map((align: any) => (
                      <button
                        key={align}
                        onClick={() => updateField('schoolInfoAlignment', align)}
                        className={`flex-1 py-1 rounded text-xs uppercase font-bold transition-all ${currentTemplate.schoolInfoAlignment === align ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {align === 'left' ? 'Izq' : align === 'center' ? 'Centro' : 'Der'}
                      </button>
                    ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Color Principal (Bordes/Títulos)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={currentTemplate.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="h-8 w-12 p-0 border-0 rounded cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 font-mono">{currentTemplate.primaryColor}</span>
                  </div>
              </div>

              {/* Selector de Fuente (Ahora incluye Century Gothic) */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipografía</label>
                  <select 
                     value={currentTemplate.fontFamily}
                     onChange={(e) => updateField('fontFamily', e.target.value)}
                     className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                     <option value="Inter">Inter (Moderna)</option>
                     <option value="Arial">Arial (Estándar)</option>
                     <option value="Century Gothic">Century Gothic (Elegante)</option>
                     <option value="Times New Roman">Times New Roman (Formal)</option>
                     <option value="Calibri">Calibri (Suave)</option>
                  </select>
              </div>

              {/* Opciones Extra */}
              <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    checked={currentTemplate.showBorder}
                    onChange={(e) => updateField('showBorder', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Añadir borde a la página</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* MODO ARCHIVO WORD */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                   ¿Cómo funciona?
                </h4>
                <p className="text-xs text-amber-700 leading-relaxed mb-3">
                  Sube tu propio archivo <b>Word (.docx)</b> con el logo y formato de tu colegio. Debes insertar "variables" (textos entre llaves) donde quieras que la IA complete la información.
                </p>
                <button 
                  onClick={downloadExampleTemplate}
                  className="text-xs font-bold text-amber-900 underline hover:text-amber-600"
                >
                  Descargar guía de instrucciones y variables
                </button>
              </div>

              <input type="file" ref={docxInputRef} className="hidden" accept=".docx" onChange={handleDocxUpload} />
              
              {!currentTemplate.docxFile ? (
                 <div 
                   onClick={() => docxInputRef.current?.click()}
                   className="border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-lg p-8 text-center cursor-pointer hover:bg-indigo-100 transition-colors"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-bold text-indigo-700 uppercase tracking-wide">Cargar Archivo .docx</p>
                    <p className="text-xs text-indigo-500 mt-1">Tu formato institucional</p>
                 </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                   <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Plantilla Activa</h4>
                            <p className="text-[10px] text-slate-500">Se usará este archivo al exportar</p>
                        </div>
                     </div>
                     <button onClick={() => updateField('docxFile', undefined)} className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg">
                        Quitar
                     </button>
                   </div>
                   
                   <div className="text-[11px] text-slate-600 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                     <p className="font-bold text-indigo-600 uppercase tracking-wider mb-2">Variables Disponibles para tu Word:</p>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px]">
                        <div className="col-span-2 text-slate-400 mb-1 font-sans font-bold">Encabezado:</div>
                        <div>{`{title}`}</div>
                        <div>{`{schoolName}`}</div>
                        <div>{`{teacherName}`}</div>
                        <div>{`{subject}`}</div>
                        <div>{`{grade}`}</div>
                        <div>{`{date}`}</div>
                        <div className="col-span-2 text-slate-400 mt-2 mb-1 font-sans font-bold">Curricular:</div>
                        <div>{`{oa_code}`}</div>
                        <div>{`{oa_description}`}</div>
                     </div>
                     <p className="font-bold text-indigo-600 uppercase tracking-wider mt-2 mb-1">Listas Automáticas:</p>
                     <div className="font-mono text-[10px] space-y-1 pl-2 border-l-2 border-indigo-200">
                        <p className="text-slate-500">// Para los indicadores</p>
                        <p>{`{#indicators} {.} {/indicators}`}</p>
                        <p className="text-slate-500 mt-1">// Para las preguntas</p>
                        <p>{`{#sections}`}</p>
                        <p className="pl-2">{`{title} ({weight})`}</p>
                        <p className="pl-2">{`{content}`}</p>
                        <p>{`{/sections}`}</p>
                     </div>
                   </div>
                </div>
              )}
            </div>
          )}

           {/* Botones de Acción */}
           <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
              <button onClick={handleSaveTemplate} className="flex-1 bg-slate-800 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200">
                Guardar Formato
              </button>
              {savedTemplates.some(t => t.id === currentTemplate.id) && (
                 <button onClick={() => handleDeleteTemplate(currentTemplate.id)} className="px-4 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                 </button>
              )}
           </div>

        </div>
      )}
    </div>
  );
};

export default TemplateManager;