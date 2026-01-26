
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
  Global = 'Evaluación General (Todos los Ejes)'
}

export enum AssessmentType {
  Summative = 'Prueba Sumativa',
  Unit = 'Evaluación de Unidad',
  Simce = 'Ensayo SIMCE',
  ProblemBased = 'Aprendizaje Basado en Problemas (ABP-Prob)',
  Project = 'Aprendizaje Basado en Proyectos (ABP-Proy)',
  Skills = 'Evaluación de Habilidades',
  ExitTicket = 'Ticket de Salida (Formativa)',
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
  headerColor: string; // Se mantiene por compatibilidad
  headerImage?: string; // Nueva propiedad para la imagen del encabezado
  showInfoWithHeader?: boolean; // Mostrar texto (Colegio, Prof) aunque haya imagen
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
  fontFamily: 'Inter' | 'Arial' | 'Times New Roman' | 'Calibri' | 'Century Gothic';
  showBorder: boolean; // Borde alrededor de la página
  schoolInfoAlignment: 'left' | 'center' | 'right';
}
