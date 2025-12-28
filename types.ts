
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
  headerColor: string;
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
  }>;
  indicators: string[];
  sources?: GroundingSource[];
}
