/**
 * Normaliza un texto para búsquedas insensibles a mayúsculas/minúsculas y acentos (tildes).
 * @param {string} str - Texto a normalizar
 * @returns {string} Texto limpio sin tildes ni mayúsculas
 */
export const cleanText = (str) => {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return '';
    str = String(str);
  }
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remueve marcas de acento (tildes)
};

/**
 * Evalúa si un texto coincide con una consulta de búsqueda de forma intuitiva.
 * Divide la consulta en palabras y verifica si todas están presentes en el texto (sin importar el orden).
 * Además, es insensible a tildes y mayúsculas.
 * @param {string} text - Texto en el que se busca (ej. nombre o descripción del diagnóstico)
 * @param {string} query - Consulta del usuario
 * @returns {boolean} True si coincide
 */
export const matchesSearch = (text, query) => {
  if (!query) return true;
  if (!text) return false;
  
  const cleanedText = cleanText(text);
  const queryWords = cleanText(query).split(/\s+/).filter(Boolean);
  
  // Todas las palabras de la búsqueda deben estar presentes en el texto
  return queryWords.every(word => cleanedText.includes(word));
};
