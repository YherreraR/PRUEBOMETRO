
import katex from 'katex';

/**
 * Normaliza y limpia el código LaTeX generado por la IA para asegurar consistencia.
 * Convierte delimitadores variados (\[ \], \( \)) a los estándares ($$, $) soportados por MathJax/KaTeX.
 */
export const cleanLatex = (content: string): string => {
  if (!content) return "";

  let processed = content;

  // 1. Normalizar delimitadores de bloque: convertir \[ ... \] a $$ ... $$
  processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, '\n$$$1$$\n');

  // 2. Normalizar delimitadores en línea: convertir \( ... \) a $ ... $
  processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // 3. Corregir errores comunes de la IA en LaTeX
  processed = processed
    .replace(/\\bold{/g, '\\mathbf{') // \bold no es estándar en KaTeX básico, \mathbf sí
    .replace(/\\sen/g, '\\sin') // Estandarizar funciones trigonométricas (MathJax suele preferir inglés o macros definidos)
    .replace(/\\tg/g, '\\tan');

  // 4. Asegurar espacios alrededor de los delimitadores para evitar conflictos con Markdown
  // (ej: evitar que $x$pegado se rompa)
  // Nota: Esto es sutil, pero ayuda al parser de Markdown a no comerse los signos de dólar.
  
  return processed;
};

/**
 * Convierte el contenido con LaTeX (delimitado por $$ o $) a MathML para Word.
 * Incluye manejo de errores: si una fórmula falla, devuelve el texto crudo en rojo en lugar de romper el documento.
 */
export const processMathForWord = (content: string): string => {
  if (!content) return "";
  
  // Procesamiento previo para asegurar que los delimitadores sean consistentes
  const normalized = cleanLatex(content);

  // 1. Reemplazar bloques de visualización $$...$$
  let result = normalized.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    try {
      // displayMode: true genera ecuaciones centradas y grandes
      return katex.renderToString(tex, { 
        output: 'mathml', 
        displayMode: true, 
        throwOnError: true,
        strict: false 
      });
    } catch(e) { 
      console.warn("Error renderizando ecuación bloque:", tex, e);
      return `<span style="color: red; font-family: monospace;">[Error LaTeX: ${tex}]</span>`; 
    }
  });

  // 2. Reemplazar matemática en línea $...$
  // Usamos una regex que evita falsos positivos con precios (ej: $1.000, $ 500)
  // Busca $...$ donde el contenido no empieza con espacio ni es un número solo
  result = result.replace(/\$([^$\n]+?)\$/g, (match, tex) => {
    // Validación simple para ignorar precios probables (ej: $1.000, $ 500)
    if (/^\s?\d+([.,]\d+)?$/.test(tex.trim())) {
      return match;
    }

    try {
      return katex.renderToString(tex, { 
        output: 'mathml', 
        displayMode: false, 
        throwOnError: true,
        strict: false
      });
    } catch(e) { 
      // Si falla en línea, devolvemos el original para no ser intrusivos, o un span de error sutil
      return `<span style="color: red;">$${tex}$</span>`; 
    }
  });

  return result;
};

/**
 * Parsea el contenido mixto (Texto + LaTeX) y lo separa en un array de objetos
 * para que la librería 'docx' pueda generar nodos TextRun o Math.
 */
export const splitTextAndMath = (content: string): Array<{ type: 'text' | 'math' | 'break', value: string }> => {
  if (!content) return [];
  const normalized = cleanLatex(content);
  
  // Separamos por bloques $$...$$, en línea $...$ y saltos de línea
  // El regex captura los delimitadores para mantenerlos en el array de resultados
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\n)/g;
  
  const parts = normalized.split(regex);
  const result: Array<{ type: 'text' | 'math' | 'break', value: string }> = [];

  parts.forEach(part => {
    if (!part) return;

    if (part === '\n') {
      result.push({ type: 'break', value: '' });
    } else if (part.startsWith('$$') && part.endsWith('$$')) {
      // Bloque matemático
      result.push({ type: 'math', value: part.slice(2, -2).trim() });
    } else if (part.startsWith('$') && part.endsWith('$')) {
      // Matemática en línea
      // Validación extra para no confundir dinero $500
      const inner = part.slice(1, -1);
      if (/^\s?\d+([.,]\d+)?$/.test(inner.trim())) {
        result.push({ type: 'text', value: part }); // Es dinero, tratar como texto
      } else {
        result.push({ type: 'math', value: inner.trim() });
      }
    } else {
      // Texto normal (puede contener Markdown básico que limpiaremos)
      result.push({ type: 'text', value: part });
    }
  });

  return result;
};
