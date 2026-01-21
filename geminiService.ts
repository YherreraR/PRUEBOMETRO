
// Use the Google GenAI SDK for math evaluation generation tasks.
import { GoogleGenAI, Type } from "@google/genai";
import { Grade, Strand, AssessmentType, OA, EvaluationContent, GroundingSource } from './types';
import { cleanLatex } from './mathUtils';

// Inicialización centralizada
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateEvaluation(
  grade: Grade,
  strand: Strand,
  oa: OA,
  type: AssessmentType,
  customContext: string
): Promise<EvaluationContent> {
  
  // Lógica específica para mejorar la calidad según el tipo de instrumento
  let specificInstructions = "";

  if (type === AssessmentType.Rubric) {
    specificInstructions = `
      ESTRUCTURA RIGUROSA PARA RÚBRICA (Matriz de Valoración Analítica):
      - Genera una Tabla Markdown. Columnas: Criterio/Habilidad, (1) Inicial, (2) En Desarrollo, (3) Satisfactorio, (4) Avanzado.
      - CRITERIOS (Filas): Deben fusionar la HABILIDAD (ej: Argumentar) con el CONTENIDO del OA.
        * Incorrecto: "Resolución de problemas".
        * Correcto: "Estrategias de resolución en problemas de [Contenido Específico del OA]".
      - PROGRESIÓN DE NIVELES (Evita saltos cuantitativos como "1 error", "2 errores"):
        * Nivel 1 (Inicial): Presencia de errores conceptuales graves o incomprensión de la tarea. Dependencia total de apoyo.
        * Nivel 2 (En Desarrollo): Logra la ejecución mecánica o algorítmica, pero con errores de cálculo o sin justificación lógica.
        * Nivel 3 (Satisfactorio - Estándar): Ejecuta el procedimiento correctamente, llega al resultado y utiliza el lenguaje matemático adecuado de forma autónoma.
        * Nivel 4 (Avanzado): Además de lo anterior, verifica sus resultados, propone más de una estrategia de solución o justifica su razonamiento generalizando propiedades.
      - LENGUAJE: Usa verbos observables. Evita juicios de valor subjetivos como "bien", "mal", "adecuadamente", "bonito". Describe LA EVIDENCIA.
    `;
  } else if (type === AssessmentType.Checklist) {
    specificInstructions = `
      ESTRUCTURA RIGUROSA PARA LISTA DE COTEJO (Evaluación Procedimental):
      - Genera una lista de 8 a 12 indicadores dicotómicos (Sí/No) u (Observado/No Observado).
      - DESGLOSE PROCEDIMENTAL (Paso a paso):
        * Inicio: Identificación de datos e incógnita.
        * Desarrollo: Selección de la operación, traducción a lenguaje matemático, ejecución del algoritmo.
        * Cierre: Respuesta completa en contexto, verificación de pertinencia.
      - CRITERIOS DE CALIDAD:
        1. Univocidad: Cada indicador evalúa UN solo aspecto o acción.
        2. Observabilidad: Usa verbos de acción directa (ej: "Escribe", "Calcula", "Dibuja") en lugar de verbos mentales (ej: "Piensa", "Analiza").
    `;
  } else if (type === AssessmentType.Project) {
    specificInstructions = `
      ESTRUCTURA RIGUROSA PARA APRENDIZAJE BASADO EN PROYECTOS (ABP):
      - TITULO: Crea un nombre atractivo y fantasioso para el proyecto.
      - CONTEXTO: Diseña un escenario del mundo real motivante para la edad del estudiante (ej: Arquitectos, Detectives, Diseñadores de Videojuegos, Ecologistas).
      - PREGUNTA ESENCIAL: Formula una "Driving Question" abierta, compleja y desafiante que guíe todo el proyecto.
      - FASES (Deben ir en el array 'sections' de la respuesta):
        * Fase 1: Lanzamiento. Presentación del desafío y la Pregunta Guía. ¿Cómo enganchar a los estudiantes?
        * Fase 2: Investigación Matemática. Actividades concretas donde aprenden/practican el OA para resolver el problema.
        * Fase 3: Creación del Producto. Desarrollo del artefacto final (Maqueta, Informe, Video, Presupuesto, etc).
        * Fase 4: Presentación Pública y Evaluación. Cómo mostrarán lo aprendido.
      - En cada fase, detalla qué hacen los estudiantes y qué hacen las matemáticas.
    `;
  } else {
    specificInstructions = `
      ESTRUCTURA PARA PRUEBAS Y GUÍAS (Evaluación Sumativa/Formativa):
      - Ítems de Selección Múltiple: Plantea un enunciado claro y 4 alternativas. Las 3 incorrectas (distractores) deben basarse en errores conceptuales comunes del nivel (ej: error de signo, error de operación inversa) y ser plausibles.
      - Ítems de Desarrollo: Deben exigir mostrar el procedimiento, argumentar la respuesta o modelar una situación.
      - Resolución de Problemas: Incluye problemas en contextos reales, variados y significativos para el estudiante (no solo ejercicios mecánicos).
      - Progresión: Organiza los ítems por nivel de complejidad cognitiva (Recordar -> Aplicar -> Analizar).
    `;
  }

  const prompt = `
    Actúa como un experto consultor pedagógico senior del Ministerio de Educación de Chile (Mineduc), especialista en Didáctica de la Matemática y Evaluación para el Aprendizaje (Decreto 67).
    Tu misión es diseñar un instrumento de evaluación (${type}) de alta calidad técnica y rigurosidad disciplinar.

    INFORMACIÓN CURRICULAR:
    - Nivel: ${grade}
    - Eje Temático: ${strand}
    - Objetivo de Aprendizaje (OA): ${oa.code} - ${oa.description}

    PRINCIPIOS DE CONSTRUCCIÓN DE INDICADORES DE EVALUACIÓN (CRÍTICOS):
    1. ALINEACIÓN CON HABILIDADES: Los indicadores deben movilizar las 4 habilidades del currículum nacional: Resolver Problemas, Representar, Modelar, Argumentar y Comunicar.
    2. ESTRUCTURA SINTÁCTICA ESTRICTA: [Verbo activo en 3ra persona] + [Contenido Matemático Específico] + [Contexto/Condición de Calidad].
       - Ejemplo Incorrecto: "Resuelve problemas". (Muy general).
       - Ejemplo Incorrecto: "Entiende las fracciones". (Verbo 'entender' no es observable).
       - Ejemplo Correcto: "Calcula (Verbo) sumas de fracciones de igual denominador (Contenido) para determinar cantidades totales en situaciones de reparto (Contexto)".
    3. COHERENCIA: El indicador debe ser una evidencia directa del OA. No evalúes orden y limpieza a menos que sea una Lista de Cotejo de actitudes.

    ${specificInstructions}

    PROCEDIMIENTO DE GENERACIÓN:
    1. Usa Google Search para buscar "Indicadores de Evaluación sugeridos OA ${oa.code} matemática Chile" y "Errores frecuentes ${oa.code}" para refinar los criterios y distractores.
    2. Integra explícitamente el desarrollo del pensamiento crítico.
    
    FORMATO DE SALIDA (JSON):
    1. Contextualización: Breve introducción al docente con sugerencias de uso.
    2. Desarrollo: El instrumento completo con sus secciones (Para ABP, cada sección es una FASE. Para Rúbrica, es la tabla).
    3. Rigor Matemático: Usa LaTeX ($...$) para TODAS las expresiones matemáticas, números y fórmulas.
    4. Metacognición: Incluye una breve sección final para la reflexión del estudiante.

    CONTEXTO ADICIONAL DEL DOCENTE:
    ${customContext}

    Responde estrictamente en formato JSON válido según el esquema solicitado.
  `;

  // Use gemini-3-pro-preview for complex reasoning tasks like math content generation.
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          oa_code: { type: Type.STRING },
          oa_description: { type: Type.STRING },
          indicators: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Lista de 4 a 6 indicadores de evaluación seleccionados, redactados operacionalmente con la estructura Verbo+Objeto+Condición."
          },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Habilidades matemáticas específicas trabajadas (ej: Modelar, Argumentar y Comunicar, Representar, Resolver Problemas)."
          },
          attitudes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Actitudes del currículum trabajadas (ej: Manifestar curiosidad, abordar de manera flexible y creativa, trabajar ordenadamente)."
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING, description: "Contenido en Markdown. Si es Rúbrica, tabla Markdown detallada. Si es ABP, descripción de la fase." }
              },
              required: ['title', 'content']
            }
          }
        },
        required: ['title', 'oa_code', 'oa_description', 'indicators', 'sections', 'skills', 'attitudes']
      }
    }
  });

  // Extract text content directly from the text property.
  const text = response.text;
  const parsed = JSON.parse(text || '{}');
  
  // Limpieza y Validación de LaTeX en las secciones generadas
  if (parsed.sections && Array.isArray(parsed.sections)) {
    parsed.sections = parsed.sections.map((sec: any) => ({
      ...sec,
      content: cleanLatex(sec.content || '')
    }));
  }

  // Extract URLs from groundingChunks as required when using googleSearch.
  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({
          title: chunk.web.title,
          uri: chunk.web.uri
        });
      }
    });
  }

  return {
    ...parsed,
    sources: sources.length > 0 ? sources : undefined
  };
}

/**
 * Genera una imagen educativa usando Imagen 3 basada en una descripción
 */
export async function generateEducationalImage(prompt: string): Promise<string | null> {
  try {
    const fullPrompt = `Educational illustration, clean lines, white background, high contrast, textbook style, mathematics, geometry or graph: ${prompt}`;
    
    // Call generateImages to generate images with Imagen models.
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '4:3',
      },
    });

    const base64EncodeString = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64EncodeString) {
      return `data:image/jpeg;base64,${base64EncodeString}`;
    }
    return null;

  } catch (error) {
    console.error("Error generando imagen:", error);
    return null;
  }
}
