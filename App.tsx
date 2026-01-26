import React, { useState, useMemo, useEffect } from 'react';
import { Grade, Strand, AssessmentType, OA, DocumentSettings, EvaluationContent, AssessmentTemplate } from './types';
import { CURRICULUM_OAS } from './constants';
import { generateEvaluation } from './geminiService';
import { marked } from 'marked'; 
import { processMathForWord, splitTextAndMath } from './mathUtils';

// Libraries for Word Generation
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import FileSaver from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Math as DocxMath, MathRun } from 'docx';

// Component Imports
import Header from './components/Header';
import ConfigSidebar from './components/ConfigSidebar';
import DocumentPreview from './components/DocumentPreview';
import TemplateManager from './components/TemplateManager';

const App: React.FC = () => {
  const [grade, setGrade] = useState<Grade>(Grade.G7);
  const [type, setType] = useState<AssessmentType>(AssessmentType.Summative); // Tipo primero
  const [strand, setStrand] = useState<Strand>(Strand.Numbers);
  const [customContext, setCustomContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationContent | null>(null);
  const [isFileProtocol, setIsFileProtocol] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [hasBackup, setHasBackup] = useState(false);
  const [selectedOAId, setSelectedOAId] = useState<string>('');

  // Default Template Initialization (Century Gothic)
  const [currentTemplate, setCurrentTemplate] = useState<AssessmentTemplate>({
    id: 'default',
    name: 'Estándar EvaluApp',
    headerLayout: 'simple',
    primaryColor: '#4f46e5',
    fontFamily: 'Century Gothic',
    showBorder: false,
    schoolInfoAlignment: 'left'
  });

  const [settings, setSettings] = useState<DocumentSettings>({
    schoolName: 'Escuela Las Quezadas',
    teacherName: 'YherreraR MaT',
    subject: 'Matemática',
    showInstructions: true,
    fontSize: 'text-base',
    headerColor: 'bg-indigo-600',
  });

  useEffect(() => {
    // Detectamos si el usuario abrió el archivo con doble clic (file://)
    if (window.location.protocol === 'file:') {
      setIsFileProtocol(true);
      setShowHelp(true);
    }
    
    // Cargar datos predeterminados del usuario si existen
    const savedDefaults = localStorage.getItem('evaluapp_user_defaults');
    if (savedDefaults) {
      try {
        const parsedDefaults = JSON.parse(savedDefaults);
        setSettings(prev => ({
          ...prev,
          schoolName: parsedDefaults.schoolName || prev.schoolName,
          teacherName: parsedDefaults.teacherName || prev.teacherName,
          subject: parsedDefaults.subject || prev.subject,
        }));
      } catch (e) {
        console.error("Error cargando defaults", e);
      }
    }
  }, []);

  // Verificar backup al iniciar
  useEffect(() => {
    const backup = localStorage.getItem('evalmat_backup');
    if (backup) {
      setHasBackup(true);
    }
  }, []);

  // Determinar Ejes disponibles según Nivel y Tipo de Evaluación
  const availableStrands = useMemo(() => {
    let baseStrands: Strand[] = [];
    const isHigherCycle = grade === Grade.G7 || grade === Grade.G8;
    
    if (isHigherCycle) {
      baseStrands = [Strand.Numbers, Strand.AlgebraFunctions, Strand.Geometry, Strand.ProbStats];
    } else {
      baseStrands = [Strand.Numbers, Strand.Algebra, Strand.Geometry, Strand.Measurement, Strand.Data];
    }

    // Si es SIMCE, agregamos la opción Global al principio
    if (type === AssessmentType.Simce) {
      return [Strand.Global, ...baseStrands];
    }

    return baseStrands;
  }, [grade, type]);

  // Resetear strand si cambia el nivel o tipo y la selección actual no es válida
  useEffect(() => {
    if (!availableStrands.includes(strand)) {
      setStrand(availableStrands[0]);
    }
  }, [grade, type, availableStrands, strand]);

  // Filtrar OAs disponibles
  const filteredOAs = useMemo(() => {
    if (strand === Strand.Global) {
      return []; // No hay OAs específicos si es global
    }
    return CURRICULUM_OAS.filter(oa => oa.grade === grade && oa.strand === strand);
  }, [grade, strand]);

  // Seleccionar primer OA por defecto si cambia la lista
  useEffect(() => {
    if (strand === Strand.Global) {
      setSelectedOAId('global-simce');
    } else if (filteredOAs.length > 0) {
      // Si el seleccionado actual no está en la lista filtrada, reseteamos al primero
      if (!filteredOAs.find(oa => oa.id === selectedOAId)) {
        setSelectedOAId(filteredOAs[0].id);
      }
    } else {
      setSelectedOAId('');
    }
  }, [filteredOAs, strand]);

  // Obtener objeto OA completo
  const selectedOA = useMemo(() => {
    if (strand === Strand.Global) {
      return {
        id: 'global-simce',
        code: 'Evaluación Global',
        description: 'Cobertura curricular completa de todos los ejes temáticos del nivel (Números, Álgebra, Geometría, Datos).',
        grade: grade,
        strand: Strand.Global
      } as OA;
    }
    return CURRICULUM_OAS.find(oa => oa.id === selectedOAId);
  }, [selectedOAId, strand, grade]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRestoreBackup = () => {
    try {
      const backup = localStorage.getItem('evalmat_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed.evaluation) {
          setEvaluation(parsed.evaluation);
        }
        if (parsed.settings) setSettings(parsed.settings);
        showToast("Sesión restaurada correctamente");
        setHasBackup(false);
      }
    } catch (e) {
      showToast("Error al restaurar el borrador", "error");
    }
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
      // --- OPCIÓN A: PLANTILLA DOCX PERSONALIZADA (User Template) ---
      // Usa Docxtemplater. Útil para mantener logos y diseños complejos del usuario.
      if (currentTemplate.docxFile) {
        const base64Content = currentTemplate.docxFile.split(',')[1];
        const binaryString = window.atob(base64Content);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const zip = new PizZip(bytes);
        
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter: () => { return ""; }
        });

        // Limpieza básica. Docxtemplater no soporta MathML nativo fácilmente,
        // así que enviamos texto limpio.
        const cleanSections = evaluation.sections.map(sec => ({
           title: sec.title || '',
           content: (sec.content || '').replace(/\*\*/g, '').replace(/__/g, ''), 
           weight: sec.weight || ''
        }));

        const data = {
          title: evaluation.title || 'Evaluación',
          schoolName: settings.schoolName || '',
          teacherName: settings.teacherName || '',
          subject: settings.subject || '',
          grade: grade || '',
          date: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
          oa_code: evaluation.oa_code || '',
          oa_description: evaluation.oa_description || '',
          indicators: evaluation.indicators || [],
          sections: cleanSections
        };

        try {
          doc.render(data);
        } catch (error: any) {
          console.error("Error en renderizado de plantilla:", error);
          if (error.properties && error.properties.errors instanceof Array) {
             const errorMessages = error.properties.errors.map((e: any) => e.properties.explanation).join("\n");
             alert(`Error en la plantilla Word: ${errorMessages}`);
          }
          throw error;
        }

        const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const saveAs = (FileSaver as any).saveAs || FileSaver;
        saveAs(out, `${evaluation.title.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.docx`);
        showToast("Documento generado con plantilla personalizada (.docx)", "success");
        return;
      }

      // --- OPCIÓN B: GENERACIÓN PROFESIONAL CON 'DOCX' LIBRARY (Default) ---
      // Usa la librería 'docx' para construir el documento desde cero con soporte nativo de Matemáticas.
      
      const children: any[] = [];
      const documentFont = currentTemplate.fontFamily || 'Century Gothic'; // Forzar Century Gothic si no hay fuente

      // 0. Imagen de Encabezado (BANNER) - Si existe, reemplaza el encabezado de texto por defecto
      let hasHeaderImage = false;
      if (settings.headerImage) {
        try {
            const imageParts = settings.headerImage.split(',');
            if (imageParts.length === 2) {
                const imageBuffer = Uint8Array.from(atob(imageParts[1]), c => c.charCodeAt(0));
                children.push(
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: imageBuffer,
                                transformation: { width: 600, height: 150 }, // Tamaño banner aproximado
                                type: "png"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 }
                    })
                );
                hasHeaderImage = true;
            }
        } catch (e) { console.error("Error agregando banner al docx", e); }
      }

      // 1. Encabezado de Texto
      if (!hasHeaderImage) {
        children.push(
            new Paragraph({
            text: settings.schoolName.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            run: { color: "2E2E2E", bold: true, size: 28, font: documentFont }
            }),
            new Paragraph({
            children: [
                new TextRun({ text: `Docente: ${settings.teacherName}`, bold: true, font: documentFont }),
                new TextRun({ text: ` | ${settings.subject} | ${grade}`, break: 0, font: documentFont })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
            })
        );
      } else {
        children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      }

      // 2. Título de la Evaluación
      children.push(
        new Paragraph({
          text: evaluation.title,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          run: { color: currentTemplate.primaryColor.replace('#', ''), bold: true, size: 32, font: documentFont }
        })
      );

      // 3. OA y Descripción
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "OBJETIVO DE APRENDIZAJE: ", bold: true, font: documentFont }),
            new TextRun({ text: evaluation.oa_code, bold: true, color: currentTemplate.primaryColor.replace('#', ''), font: documentFont }),
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: evaluation.oa_description,
          spacing: { after: 300 },
          style: "IntenseQuote",
          run: { font: documentFont }
        })
      );

      // 4. Indicadores
      children.push(
        new Paragraph({
          text: "INDICADORES DE EVALUACIÓN:",
          heading: HeadingLevel.HEADING_4,
          spacing: { after: 100 },
          run: { font: documentFont }
        })
      );
      
      evaluation.indicators.forEach(ind => {
        children.push(
          new Paragraph({
            text: `• ${ind}`,
            spacing: { after: 50 },
            indent: { left: 400 },
            run: { font: documentFont }
          })
        );
      });
      children.push(new Paragraph({ text: "", spacing: { after: 300 } })); // Espacio

      // 5. Secciones (Preguntas) con Matemáticas Nativas
      evaluation.sections.forEach((sec, idx) => {
        // Título de la sección
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${idx + 1}. ${sec.title}`, bold: true, size: 24, font: documentFont }),
              new TextRun({ text: ` (${sec.weight || ''})`, italics: true, size: 20, font: documentFont })
            ],
            spacing: { before: 300, after: 150 },
            border: { bottom: { color: "E0E0E0", space: 1, value: "single", size: 6 } }
          })
        );

        // Imagen si existe
        if (sec.image) {
          try {
             const imageParts = sec.image.split(',');
             if (imageParts.length === 2) {
                const imageBuffer = Uint8Array.from(atob(imageParts[1]), c => c.charCodeAt(0));
                children.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: imageBuffer,
                        transformation: { width: 300, height: 200 },
                        type: "png"
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                  })
                );
             }
          } catch (e) { console.error("Error agregando imagen al docx", e); }
        }

        // Contenido con parser de Matemáticas
        const lines = (sec.content || '').split('\n');
        
        lines.forEach(line => {
          if (!line.trim()) {
            children.push(new Paragraph({})); 
            return;
          }

          const parts = splitTextAndMath(line);
          const paragraphChildren = parts.map(part => {
             if (part.type === 'math') {
                return new DocxMath({
                   children: [new MathRun(part.value)] // Las fórmulas heredan fuente math, pero el contexto es Century Gothic
                });
             } else {
                const cleanText = part.value.replace(/\*\*/g, '').replace(/__/g, '');
                return new TextRun({ text: cleanText, font: documentFont });
             }
          });

          children.push(
            new Paragraph({
              children: paragraphChildren,
              spacing: { after: 100 }
            })
          );
        });
      });

      // Crear el documento final con estilos globales
      const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: documentFont, // APLICAR GLOBALMENTE CENTURY GOTHIC
                    },
                    paragraph: {
                        run: {
                            font: documentFont,
                        }
                    }
                },
                heading1: { run: { font: documentFont, bold: true, size: 28 } },
                heading2: { run: { font: documentFont, bold: true, size: 32 } },
                heading4: { run: { font: documentFont, bold: true } },
            }
        },
        sections: [{
          properties: {},
          children: children
        }]
      });

      // Generar Blob
      const blob = await Packer.toBlob(doc);
      
      const saveAs = (FileSaver as any).saveAs || FileSaver;
      saveAs(blob, `${evaluation.title.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.docx`);
      showToast(`Evaluación generada con fuente ${documentFont}`, "success");

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

      {/* BANNER DE RESTAURACIÓN DE BACKUP */}
      {hasBackup && !evaluation && (
        <div className="bg-emerald-50 border-b border-emerald-100 p-4 sticky top-0 z-50 animate-in slide-in-from-top duration-300">
           <div className="container mx-auto max-w-7xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-lg shadow-sm text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                 </div>
                 <div>
                    <p className="text-sm font-bold text-emerald-800">Se encontró un borrador guardado</p>
                    <p className="text-xs text-emerald-600">¿Deseas continuar trabajando en tu evaluación anterior?</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={() => { localStorage.removeItem('evalmat_backup'); setHasBackup(false); }}
                   className="px-4 py-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                 >
                   Descartar
                 </button>
                 <button 
                   onClick={handleRestoreBackup}
                   className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                 >
                   Restaurar Trabajo
                 </button>
              </div>
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
              
              {/* 1. SELECCIÓN DE NIVEL */}
              <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">1. Nivel</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as Grade)}
                  >
                    {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
              </div>

              {/* 2. TIPO DE INSTRUMENTO (MOVIDO ARRIBA) */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">2. Tipo de Instrumento</label>
                <select 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={type}
                  onChange={(e) => setType(e.target.value as AssessmentType)}
                >
                  {Object.values(AssessmentType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* 3. EJE TEMÁTICO (AHORA INCLUYE OPCIÓN GLOBAL PARA SIMCE) */}
              <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">3. Eje Temático / Unidad</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={strand}
                    onChange={(e) => setStrand(e.target.value as Strand)}
                  >
                    {availableStrands.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {type === AssessmentType.Simce && (
                    <p className="text-[9px] text-slate-400 mt-1 pl-1">
                      * En modo SIMCE puedes seleccionar "Todos los Ejes" o una unidad específica.
                    </p>
                  )}
              </div>

              {/* 4. OBJETIVOS DE APRENDIZAJE */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">4. Objetivos de Aprendizaje (OA)</label>
                {strand === Strand.Global ? (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-medium flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cobertura Curricular Completa Seleccionada
                  </div>
                ) : (
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={selectedOAId}
                    onChange={(e) => setSelectedOAId(e.target.value)}
                  >
                    {filteredOAs.map(oa => (
                      <option key={oa.id} value={oa.id}>{oa.code}: {oa.description.slice(0, 70)}...</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 5. INDICACIONES ESPECIALES */}
              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">5. Indicaciones Especiales</label>
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
          <TemplateManager currentTemplate={currentTemplate} onTemplateChange={setCurrentTemplate} />
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
                template={currentTemplate} // Pasamos la plantilla seleccionada
                isEditable={true} 
                onSettingsChange={setSettings}
                onEvaluationChange={setEvaluation}
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