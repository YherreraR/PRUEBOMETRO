
import { GoogleGenAI, Type } from "@google/genai";
import { Grade, Strand, AssessmentType, OA, EvaluationContent, GroundingSource } from './types';

export async function generateEvaluation(
  grade: Grade,
  strand: Strand,
  oa: OA,
  type: AssessmentType,
  customContext: string
): Promise<EvaluationContent> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Actúa como un experto consultor pedagógico senior del Ministerio de Educación de Chile (Mineduc), especialista en el Decreto 67 y las Bases Curriculares.
    Tu misión es generar una ${type} de excelencia técnica y pedagógica.
    
    INFORMACIÓN CURRICULAR:
    - Nivel: ${grade}
    - Eje Temático: ${strand}
    - Objetivo de Aprendizaje (OA): ${oa.code} - ${oa.description}

    PROCEDIMIENTO DE INVESTIGACIÓN (OBLIGATORIO):
    1. Usa Google Search para buscar exactamente los "Indicadores de Evaluación" oficiales para el ${oa.code} en www.curriculumnacional.cl.
    2. Identifica las Habilidades disciplinares (Resolver problemas, Modelar, Representar, Argumentar y comunicar) asociadas explícitamente a este OA en las bases curriculares.
    3. Identifica Objetivos Actitudinales transversales pertinentes que se fomentan con este tipo de actividades.
    
    ESTRUCTURA DEL DOCUMENTO:
    1. Sección Inicial: Desglose del OA y lista detallada de Indicadores de Logro ministeriales.
    2. Habilidades y Actitudes: Menciona explícitamente qué habilidades disciplinares y actitudes se están evaluando.
    3. Desarrollo de Actividades: Diseña ítems diversos (opción múltiple fundamentada, desarrollo, resolución de problemas reales, modelamiento).
    4. Rigor Matemático: Usa LaTeX ($...$) para todas las expresiones, fórmulas y ecuaciones.
    5. Evaluación Formativa: Incluye espacios de metacognición o autoevaluación al final.

    NOTAS ADICIONALES DEL USUARIO:
    ${customContext}

    IMPORTANTE: Si la evaluación es una RÚBRICA o LISTA DE COTEJO, estructura el contenido como una tabla Markdown detallada.

    Responde estrictamente en formato JSON según el esquema definido.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
            items: { type: Type.STRING }
          },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          attitudes: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              }
            }
          }
        },
        required: ['title', 'oa_code', 'oa_description', 'indicators', 'sections', 'skills', 'attitudes']
      }
    }
  });

  const text = response.text;
  const parsed = JSON.parse(text || '{}');
  
  // Extraer fuentes de búsqueda para transparencia
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
