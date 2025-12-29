
import React, { useState, useMemo, useEffect } from 'react';
import { Grade, Strand, AssessmentType, OA, DocumentSettings, EvaluationContent } from './types';
import { CURRICULUM_OAS, ASSESSMENT_DESCRIPTIONS } from './constants';
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

  // Filter Strands based on Grade
  const availableStrands = useMemo(() => {
    const isHigherCycle = grade === Grade.G7 || grade === Grade.G8;
    if (isHigherCycle) {
      return [Strand.Numbers, Strand.AlgebraFunctions, Strand.Geometry, Strand.ProbStats];
    }
    return [Strand.Numbers, Strand.Algebra, Strand.Geometry, Strand.Measurement, Strand.Data];
  }, [grade]);

  // Ensure selected strand is valid for current grade
  useEffect(() => {
    if (!availableStrands.includes(strand)) {
      setStrand(availableStrands[0]);
    }
  }, [grade, availableStrands, strand]);

  // Filter OAs based on selected grade and strand
  const filteredOAs = useMemo(() => {
    return CURRICULUM_OAS.filter(oa => oa.grade === grade && oa.strand === strand);
  }, [grade, strand]);

  const [selectedOAId, setSelectedOAId] = useState<string>('');

  // Sync selected OA when filters change
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
    schoolName: 'Nombre de la Institución Educativa',
    teacherName: 'Nombre del Docente',
    subject: 'Educación Matemática',
    showInstructions: true,
    fontSize: 'text-base',
    headerColor: 'bg-indigo-600',
  });

  const handleGenerate = async () => {
    if (!selectedOA) {
      setError('Por favor selecciona un Objetivo de Aprendizaje antes de continuar.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateEvaluation(grade, strand, selectedOA, type, customContext);
      setEvaluation(result);
    } catch (err) {
      console.error(err);
      setError('Hubo un problema al generar la evaluación. Esto puede deberse a la conexión o a una saturación del servicio. Por favor, inténtalo de nuevo en unos momentos.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (evaluation) {
      window.print();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Persistant Visible Notification System */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 no-print animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white border-l-4 border-rose-600 rounded-xl shadow-2xl p-4 flex items-start gap-4 ring-1 ring-black/5">
            <div className="shrink-0 w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Error de Generación</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="shrink-0 p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <Header onPrint={handlePrint} hasEvaluation={!!evaluation} />

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 max-w-7xl">
        {/* Left Sidebar: Controls */}
        <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6 no-print">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </span>
                Diseño Pedagógico
              </h2>
              <p className="text-[11px] text-slate-500 mt-2 leading-tight">Accede a todo el Currículum Nacional (1° a 8°).</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Curso</label>
                  <select 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as Grade)}
                  >
                    {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Eje Temático</label>
                  <select 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={selectedOAId}
                  onChange={(e) => setSelectedOAId(e.target.value)}
                >
                  {filteredOAs.length > 0 ? (
                    filteredOAs.map(oa => (
                      <option key={oa.id} value={oa.id}>{oa.code}: {oa.description.length > 50 ? oa.description.slice(0, 50) + '...' : oa.description}</option>
                    ))
                  ) : (
                    <option disabled value="">Sin OAs disponibles para este eje</option>
                  )}
                </select>
                {selectedOA && (
                  <div className="mt-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                    <p className="text-[11px] text-indigo-700 leading-tight italic">
                      "{selectedOA.description}"
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipo de Instrumento</label>
                <select 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={type}
                  onChange={(e) => setType(e.target.value as AssessmentType)}
                >
                  {Object.values(AssessmentType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-indigo-500 font-bold">
                  {ASSESSMENT_DESCRIPTIONS[type]}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Notas del Docente</label>
                <textarea 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows={2}
                  placeholder="Ej: Incluir desafíos de nivel superior..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedOA}
                className={`w-full py-4 px-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] ${isGenerating || !selectedOA ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
                ) : 'Generar Evaluación'}
              </button>
            </div>
          </section>

          <ConfigSidebar settings={settings} setSettings={setSettings} />
        </div>

        {/* Right Area: Document Preview */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
            <div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight">Instrumento Generado</h2>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Basado en CurriculumNacional.cl</p>
            </div>
            <button 
              onClick={handlePrint}
              disabled={!evaluation}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 font-bold transition-all ${!evaluation ? 'bg-white text-slate-200 border-slate-100 cursor-not-allowed' : 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-100 shadow-sm active:translate-y-0.5'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Descargar PDF / Imprimir
            </button>
          </div>

          <div className="bg-slate-200 p-4 sm:p-12 rounded-3xl min-h-[800px] flex justify-center items-start overflow-auto shadow-inner border border-slate-300">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 bg-white rounded-2xl w-full max-w-[8.5in] shadow-xl">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="text-indigo-600 font-black text-lg">Investigando en Currículum Nacional...</p>
                  <p className="text-slate-400 text-sm mt-1">Alineando actividades a indicadores de logro y habilidades Mineduc.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce"></span>
                </div>
              </div>
            ) : evaluation ? (
              <DocumentPreview 
                evaluation={evaluation} 
                settings={settings} 
                isEditable={true} 
                onSettingsChange={setSettings}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 bg-white/50 border-2 border-dashed border-slate-300 rounded-3xl w-full max-w-[8.5in]">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Plataforma Docente Multigrado</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto italic">
                    Selecciona un nivel y objetivo para comenzar la planificación de tu instrumento evaluativo.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
