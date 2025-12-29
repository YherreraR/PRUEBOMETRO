
import React, { useState, useMemo, useEffect } from 'react';
import { Grade, Strand, AssessmentType, OA, DocumentSettings, EvaluationContent } from './types';
import { CURRICULUM_OAS } from './constants';
import { generateEvaluation } from './geminiService';

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
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (window.location.protocol === 'file:') {
      setIsFileProtocol(true);
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
    schoolName: 'Nombre de tu Colegio',
    teacherName: 'Nombre del Docente',
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

  const getEvaluationText = () => {
    if (!evaluation) return "";
    return `
${evaluation.title.toUpperCase()}
==========================================
Colegio: ${settings.schoolName}
Docente: ${settings.teacherName}
Asignatura: ${settings.subject}
Curso: ${grade}
Instrumento: ${type}

ALINEACIÓN CURRICULAR
------------------------------------------
OA: ${evaluation.oa_code}
Descripción: ${evaluation.oa_description}

HABILIDADES Y ACTITUDES
------------------------------------------
Habilidades: ${evaluation.skills.join(', ')}
Actitudes: ${evaluation.attitudes.join('; ')}

INDICADORES DE LOGRO
------------------------------------------
${evaluation.indicators.map((ind, i) => `${i + 1}. ${ind}`).join('\n')}

DESARROLLO DE LA EVALUACIÓN
------------------------------------------
${evaluation.sections.map(sec => `
## ${sec.title}
${sec.content}
`).join('\n')}

------------------------------------------
Generado por EvalMat Chile v2.0
    `.trim();
  };

  const handleCopyToClipboard = () => {
    const text = getEvaluationText();
    navigator.clipboard.writeText(text).then(() => {
      showToast("Contenido copiado al portapapeles. ¡Ya puedes pegarlo en Word!");
    });
  };

  const handleExportText = () => {
    if (!evaluation) return;
    const content = getEvaluationText();
    const filename = `Evaluacion_${evaluation.oa_code.replace(/\s+/g, '_')}.txt`;

    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Respaldo para navegadores que bloquean descargas instantáneas
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      showToast("Iniciando descarga del archivo...");
    } catch (e) {
      handleCopyToClipboard();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {isFileProtocol && (
        <div className="bg-amber-600 text-white p-3 text-center text-xs font-black no-print">
          ⚠️ MODO LOCAL DETECTADO: Para que las descargas e IA funcionen, debes subir los archivos a un servidor o usar "Live Server" en VS Code.
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 no-print">
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
        onExportText={handleExportText} 
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
