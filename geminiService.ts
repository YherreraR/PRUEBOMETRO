
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
      - Genera una Tabla Markdown. Columnas: Criterio/Habilidad, (1) Insuficiente, (2) Elemental, (3) Adecuado, (4) Destacado.
      - CRITERIOS (Filas): Deben corresponder a las HABILIDADES MATEMÁTICAS (Resolver Problemas, Representar, Modelar, Argumentar y Comunicar) vinculadas específicamente al OA seleccionado.
        * Ejemplo: "Modelar: Traduce el problema verbal a una expresión matemática pertinente".
      - PROGRESIÓN DE NIVELES (Descriptores):
        * EVITA saltos cuantitativos arbitrarios (ej: "Tiene 1 error", "Tiene 2 errores").
        * USA saltos CUALITATIVOS en el desempeño:
          - Nivel 1 (Insuficiente): No logra el desempeño o presenta errores conceptuales que impiden el avance.
          - Nivel 2 (Elemental): Logra el desempeño parcialmente, con errores procedimentales menores o requiriendo apoyo.
          - Nivel 3 (Adecuado): Logra el desempeño correctamente de forma autónoma.
          - Nivel 4 (Destacado): Logra el desempeño con fluidez, eficiencia y es capaz de justificar, generalizar o transferir a otros contextos.
      - REDACCIÓN: Conductas observables. No uses "comprende" o "sabe".
    `;
  } else if (type === AssessmentType.Checklist) {
    specificInstructions = `
      ESTRUCTURA RIGUROSA PARA LISTA DE COTEJO (Evaluación Procedimental):
      - Genera una lista de 8 a 12 indicadores dicotómicos (Sí/No) u (Observado/No Observado).
      - DESGLOSE PROCEDIMENTAL: Descompone la tarea matemática en pasos lógicos y secuenciales (algoritmo).
      - CRITERIOS DE CALIDAD:
        1. Univocidad: Cada indicador evalúa UN solo aspecto o acción.
        2. Observabilidad: Usa verbos de acción directa (ej: "Escribe", "Calcula", "Dibuja") en lugar de verbos mentales (ej: "Piensa", "Analiza").
        3. Alineación: Los indicadores deben cubrir desde la interpretación inicial del problema hasta la verificación del resultado y la respuesta completa.
    `;
  } else {
    specificInstructions = `
      ESTRUCTURA PARA PRUEBAS Y GUÍAS (Evaluación Sumativa/Formativa):
      - Ítems de Selección Múltiple: Plantea un enunciado claro y 4 alternativas. Las 3 incorrectas (distractores) deben basarse en errores conceptuales comunes del nivel (ej: error de signo, error de operación inversa) y ser plausibles.
      - Ítems de Desarrollo: Deben exigir mostrar el procedimiento, argumentar la respuesta o modelar una situación.
      - Resolución de Problemas: Incluye problemas en contextos reales, variados y significativos para el estudiante.
      - Progresión: Organiza los ítems por nivel de complejidad cognitiva (Taxonomía de Bloom/Anderson).
    `;
  }

  const prompt = `
    Actúa como un experto consultor pedagógico senior del Ministerio de Educación de Chile (Mineduc), especialista en Didáctica de la Matemática y Evaluación para el Aprendizaje (Decreto 67).
    Tu misión es diseñar un instrumento de evaluación (${type}) de alta calidad técnica.

    INFORMACIÓN CURRICULAR:
    - Nivel: ${grade}
    - Eje Temático: ${strand}
    - Objetivo de Aprendizaje (OA): ${oa.code} - ${oa.description}

    PRINCIPIOS DE CONSTRUCCIÓN DE INDICADORES DE EVALUACIÓN:
    1. TAXONOMÍA Y HABILIDADES: Los indicadores deben movilizar habilidades cognitivas superiores (Aplicar, Analizar, Evaluar, Crear) coherentes con el OA. Evita quedarse solo en la memorización.
    2. ESTRUCTURA SINTÁCTICA ESTRICTA: [Verbo activo en 3ra persona] + [Objeto de conocimiento matemático] + [Condición de ejecución/Contexto].
       - Ejemplo Incorrecto: "Suma bien". (Vago, no medible).
       - Ejemplo Correcto: "Resuelve (Verbo) adiciones con reserva (Objeto) utilizando el algoritmo estándar de manera autónoma (Condición)".
    3. COHERENCIA: El indicador debe ser una evidencia directa y suficiente del logro parcial o total del OA seleccionado.

    ${specificInstructions}

    PROCEDIMIENTO DE GENERACIÓN:
    1. Usa Google Search para buscar "Indicadores de Evaluación sugeridos OA ${oa.code} matemática Chile" para garantizar precisión curricular oficial.
    2. Integra explícitamente las Habilidades del siglo XXI (pensamiento crítico, resolución de problemas).
    
    FORMATO DE SALIDA (JSON):
    1. Contextualización: Breve introducción al docente sobre el foco evaluativo.
    2. Desarrollo: El instrumento completo con sus secciones.
    3. Rigor Matemático: Usa LaTeX ($...$) para TODAS las expresiones matemáticas, números y fórmulas.
    4. Metacognición: Incluye una breve sección final ("Ticket de salida" o "Autoevaluación") para la reflexión del estudiante.

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
            description: "Lista de 4 a 6 indicadores de evaluación seleccionados, redactados operacionalmente según la estructura solicitada."
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
                content: { type: Type.STRING, description: "Contenido en Markdown. Si es Rúbrica, debe ser una tabla Markdown bien formateada con sus niveles." }
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
