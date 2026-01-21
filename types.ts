
export enum Grade {
  G1 = '1° Básico',
  G2 = '2° Básico',
  G3 = '3° Básico',
  G4 = '4° Básico',
  G5 = '5° Básico',
  G6 = '6° Básico',
  G7 = '7° Básico',
  G8 = '8° Básico',
}

export enum Strand {
  Numbers = 'Números y Operaciones',
  Algebra = 'Patrones y Álgebra',
  Geometry = 'Geometría',
  Measurement = 'Medición',
  Data = 'Datos y Probabilidades',
  AlgebraFunctions = 'Álgebra y Funciones',
  ProbStats = 'Probabilidad y Estadística',
}

export enum AssessmentType {
  ExitTicket = 'Ticket de Salida (Formativa)',
  Quiz = 'Guía de Trabajo Integradora',
  Diagnostic = 'Evaluación Diagnóstica',
  Rubric = 'Rúbrica de Desempeño',
  Checklist = 'Escala de Apreciación / Lista de Cotejo',
  Project = 'Aprendizaje Basado en Proyectos (ABP)',
}

export interface OA {
  id: string;
  code: string;
  description: string;
  strand: Strand;
  grade: Grade;
}

export interface DocumentSettings {
  schoolName: string;
  teacherName: string;
  subject: string;
  showInstructions: boolean;
  fontSize: 'text-xs' | 'text-sm' | 'text-base' | 'text-lg' | 'text-xl';
  headerColor: string; // Se mantiene por compatibilidad, pero la Template tendrá prioridad en estilos visuales
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface EvaluationContent {
  title: string;
  oa_code: string;
  oa_description: string;
  skills: string[];
  attitudes: string[];
  sections: Array<{
    title: string;
    content: string; // Markdown format
    weight?: string; // Puntaje o ponderación
    image?: string; // Base64 string or URL
    imageCaption?: string;
  }>;
  indicators: string[];
  sources?: GroundingSource[];
}

// --- NUEVAS INTERFACES PARA PLANTILLAS ---

export type HeaderLayout = 'simple' | 'logo-left' | 'logo-right' | 'logo-center' | 'double-column';

export interface AssessmentTemplate {
  id: string;
  name: string;
  headerLayout: HeaderLayout;
  logoUrl?: string; // Base64 del logo del colegio
  docxFile?: string; // Base64 del archivo .docx subido por el usuario
  primaryColor: string;
  fontFamily: 'Inter' | 'Arial' | 'Times New Roman' | 'Calibri';
  showBorder: boolean; // Borde alrededor de la página
  schoolInfoAlignment: 'left' | 'center' | 'right';
}
