
import React, { useState, useMemo, useEffect } from 'react';
import { Grade, Strand, AssessmentType, OA, DocumentSettings, EvaluationContent } from './types';
import { CURRICULUM_OAS } from './constants';
import { generateEvaluation } from './geminiService';
import { marked } from 'marked'; // Importación necesaria para convertir Markdown a HTML para Word
import { processMathForWord } from './mathUtils';

// Component Imports
import Header from './components/Header';
import ConfigSidebar from './components/ConfigSidebar';
import DocumentPreview from './components/DocumentPreview';

const App: React.FC = () => {
  const [grade, setGrade] = useState<Grade>(Grade.G7);
  const [strand, setStrand] = useState<Strand>(Strand.Numbers);
  const [type, setType] = useState<AssessmentType>(AssessmentType.Quiz);
  const [customContext, setCustomContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationContent | null>(null);
  const [isFileProtocol, setIsFileProtocol] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    // Detectamos si el usuario abrió el archivo con doble clic (file://)
    if (window.location.protocol === 'file:') {
      setIsFileProtocol(true);
      setShowHelp(true);
    }
  }, []);

  const availableStrands = useMemo(() => {
    const isHigherCycle = grade === Grade.G7 || grade === Grade.G8;
    if (isHigherCycle) {
      return [Strand.Numbers, Strand.AlgebraFunctions, Strand.Geometry, Strand.ProbStats];
    }
    return [Strand.Numbers, Strand.Algebra, Strand.Geometry, Strand.Measurement, Strand.Data];
  }, [grade]);

  useEffect(() => {
    if (!availableStrands.includes(strand)) {
      setStrand(availableStrands[0]);
    }
  }, [grade, availableStrands, strand]);

  const filteredOAs = useMemo(() => {
    return CURRICULUM_OAS.filter(oa => oa.grade === grade && oa.strand === strand);
  }, [grade, strand]);

  const [selectedOAId, setSelectedOAId] = useState<string>('');

  useEffect(() => {
    if (filteredOAs.length > 0) {
      setSelectedOAId(filteredOAs[0].id);
    } else {
      setSelectedOAId('');
    }
  }, [filteredOAs]);

  const selectedOA = useMemo(() => {
    return CURRICULUM_OAS.find(oa => oa.id === selectedOAId);
  }, [selectedOAId]);

  const [settings, setSettings] = useState<DocumentSettings>({
    schoolName: 'Escuela Las Quezadas',
    teacherName: 'YherreraR MaT',
    subject: 'Matemática',
    showInstructions: true,
    fontSize: 'text-base',
    headerColor: 'bg-indigo-600',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = async () => {
    if (isFileProtocol) {
      setShowHelp(true);
      return;
    }
    if (!selectedOA) {
      setError('Por favor selecciona un Objetivo de Aprendizaje.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateEvaluation(grade, strand, selectedOA, type, customContext);
      setEvaluation(result);
      showToast("¡Evaluación generada con éxito!");
    } catch (err) {
      console.error(err);
      setError('Error de generación. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    if (evaluation) {
      window.print();
    }
  };

  const handleCopyToClipboard = () => {
    if (!evaluation) return;
    const text = `Evaluación: ${evaluation.title}\n\n${evaluation.sections.map(s => s.title + '\n' + s.content).join('\n\n')}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast("Contenido copiado al portapapeles.");
    });
  };

  const handleExportWord = async () => {
    if (isFileProtocol) {
      setShowHelp(true);
      return;
    }
    if (!evaluation) return;

    try {
      // 1. Convertir secciones de Markdown a HTML, procesando antes la matemática a MathML
      const sectionPromises = evaluation.sections.map(async (sec) => {
        // Usamos la utilidad robusta mathUtils.ts
        const contentWithMathML = processMathForWord(sec.content);
        const htmlContent = await marked.parse(contentWithMathML);
        
        let imageHtml = '';
        if (sec.image) {
          imageHtml = `<div style="text-align: center; margin: 15px 0;"><img src="${sec.image}" style="max-width: 400px; max-height: 300px;" /></div>`;
        }

        return `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px;">${sec.title}</h3>
            ${imageHtml}
            <div>${htmlContent}</div>
          </div>
        `;
      });
      
      const sectionsHtmlArray = await Promise.all(sectionPromises);
      const sectionsHtml = sectionsHtmlArray.join('');

      // 2. Construir el documento HTML completo compatible con Word
      const docContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns:m='http://schemas.microsoft.com/office/2004/12/omml'
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${evaluation.title}</title>
          <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #000; }
            h1 { font-size: 18pt; color: #1a237e; text-align: center; text-transform: uppercase; margin-bottom: 5px; }
            h2 { font-size: 14pt; color: #283593; margin-top: 20px; border-bottom: 2px solid #283593; padding-bottom: 5px; }
            h3 { font-size: 12pt; font-weight: bold; color: #333; margin-top: 15px; }
            p { margin-bottom: 10px; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            th, td { border: 1px solid #999; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .header-info { margin-bottom: 30px; border: 1px solid #ccc; padding: 15px; background-color: #fafafa; }
            .meta-item { margin-bottom: 5px; }
            ul { margin-top: 5px; padding-left: 20px; }
            li { margin-bottom: 3px; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <p class="meta-item"><strong>Establecimiento:</strong> ${settings.schoolName}</p>
            <p class="meta-item"><strong>Docente:</strong> ${settings.teacherName}</p>
            <p class="meta-item"><strong>Asignatura:</strong> ${settings.subject} | <strong>Curso:</strong> ${grade}</p>
            <p class="meta-item"><strong>Fecha:</strong> ____________________</p>
          </div>

          <h1>${evaluation.title}</h1>
          <p style="text-align: center; font-size: 10pt; color: #666; margin-bottom: 30px;">Instrumento generado con EvaluApp</p>

          <div style="background-color: #e8eaf6; padding: 15px; border-left: 5px solid #3f51b5; margin-bottom: 25px;">
             <p><strong>Objetivo de Aprendizaje (OA):</strong> ${evaluation.oa_code}</p>
             <p><em>${evaluation.oa_description}</em></p>
          </div>

          <h2>Indicadores de Evaluación</h2>
          <ul>
            ${evaluation.indicators.map(ind => `<li>${ind}</li>`).join('')}
          </ul>

          <h2>Habilidades y Actitudes</h2>
          <p><strong>Habilidades:</strong> ${evaluation.skills.join(', ')}</p>
          <p><strong>Actitudes:</strong> ${evaluation.attitudes.join(', ')}</p>

          <h2>Desarrollo de la Evaluación</h2>
          ${sectionsHtml}

          <br/><br/>
          <hr/>
          <p style="text-align: center; font-size: 9pt; color: #999;">Fin del documento</p>
        </body>
        </html>
      `;

      // 3. Crear el Blob y descargar
      const blob = new Blob(['\ufeff', docContent], {
        type: 'application/msword'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Usamos .doc para mejor compatibilidad al abrir en Word (HTML format)
      link.setAttribute('download', `${evaluation.title.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.doc`);
      document.body.appendChild(link);
      link.click();
      
      // Limpieza
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      showToast("Evaluación descargada en Word (.doc)", "success");
    } catch (e) {
      console.error(e);
      showToast("Error al generar el archivo Word", "error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* BANNER DE ADVERTENCIA PROTOCOLO LOCAL */}
      {isFileProtocol && (
        <div className="bg-rose-600 text-white p-3 shadow-lg no-print sticky top-0 z-[60]">
          <div className="container mx-auto px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-lg animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-xs font-black uppercase tracking-tight leading-tight">
                La Inteligencia Artificial está desactivada porque has abierto el archivo localmente.
              </p>
            </div>
            <button 
              onClick={() => setShowHelp(true)}
              className="bg-white text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors shadow-sm whitespace-nowrap"
            >
              Solucionar en VS Code
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURACIÓN PASO A PASO */}
      {showHelp && isFileProtocol && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-indigo-600 p-10 text-white relative">
              <button onClick={() => setShowHelp(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Guía de Inicio</h2>
                  <p className="text-indigo-100 text-sm font-bold opacity-80 mt-1">Cómo ejecutar EvaluApp en VS Code</p>
                </div>
              </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xl">1</div>
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest leading-tight">Abrir en VS Code</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Abre la carpeta que contiene los archivos desde el menú <b>File > Open Folder</b>.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-400 text-xl">2</div>
                <h4 className="font-black text-indigo-800 text-xs uppercase tracking-widest leading-tight">Instalar Live Server</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Busca <b>"Live Server"</b> en la pestaña de extensiones (icono de cuadritos) e instálalo.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center font-black text-emerald-400 text-xl">3</div>
                <h4 className="font-black text-emerald-800 text-xs uppercase tracking-widest leading-tight">Click en Go Live</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Abre <code>index.html</code> y pulsa <b>"Go Live"</b> en la barra inferior derecha de VS Code.</p>
              </div>
            </div>
            <div className="px-10 pb-10">
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                He seguido los pasos, continuar
              </button>
              <p className="text-center mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Esto es necesario para habilitar la IA por seguridad del navegador</p>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce no-print">
          <div className={`${toast.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'} text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-sm uppercase tracking-widest`}>
            {toast.message}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 no-print">
          <div className="bg-white border-l-4 border-rose-600 rounded-xl shadow-2xl p-4 flex items-start gap-4">
            <div className="shrink-0 text-rose-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Error</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-slate-400">×</button>
          </div>
        </div>
      )}

      <Header 
        onExportPDF={handleExportPDF} 
        onExportWord={handleExportWord} 
        onCopyText={handleCopyToClipboard}
        hasEvaluation={!!evaluation} 
      />

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 max-w-7xl">
        <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6 no-print">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
              Configuración OA
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nivel</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as Grade)}
                  >
                    {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Eje Temático</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={strand}
                    onChange={(e) => setStrand(e.target.value as Strand)}
                  >
                    {availableStrands.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Objetivo de Aprendizaje (OA)</label>
                <select 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={selectedOAId}
                  onChange={(e) => setSelectedOAId(e.target.value)}
                >
                  {filteredOAs.map(oa => (
                    <option key={oa.id} value={oa.id}>{oa.code}: {oa.description.slice(0, 70)}...</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipo de Instrumento</label>
                <select 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={type}
                  onChange={(e) => setType(e.target.value as AssessmentType)}
                >
                  {Object.values(AssessmentType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Contexto Adicional</label>
                <textarea 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                  placeholder="Ej: Problemas contextualizados en el fútbol..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedOA}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                {isGenerating ? 'Generando Contenido...' : 'Generar Evaluación con IA'}
              </button>
            </div>
          </section>

          <ConfigSidebar settings={settings} setSettings={setSettings} />
        </div>

        <div className="flex-1 space-y-4">
          <div className="bg-slate-200 p-4 sm:p-10 rounded-[2.5rem] min-h-[800px] flex justify-center items-start overflow-auto shadow-inner">
            {isGenerating ? (
              <div className="p-20 bg-white rounded-3xl w-full max-w-[210mm] text-center shadow-2xl animate-pulse">
                <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-6"></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Construyendo Evaluación...</h3>
                <p className="text-slate-500">Alineando indicadores y redactando problemas matemáticos bajo el Decreto 67.</p>
              </div>
            ) : evaluation ? (
              <DocumentPreview 
                evaluation={evaluation} 
                settings={settings} 
                isEditable={true} 
                onSettingsChange={setSettings}
              />
            ) : (
              <div className="p-20 bg-white/50 border-4 border-dashed border-slate-300 rounded-[2rem] w-full max-w-[210mm] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-2">Vista Previa</h3>
                <p className="text-slate-400 max-w-xs text-sm">Configura los parámetros para ver el documento generado.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
