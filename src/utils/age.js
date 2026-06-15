/**
 * Calcula la edad detallada en años, meses y días a partir de una fecha de nacimiento.
 * @param {string} birthDateStr - Fecha de nacimiento en formato YYYY-MM-DD
 * @returns {string|null} Edad formateada o null si la fecha no es válida
 */
export function calculateAgeDetailed(birthDateStr) {
  if (!birthDateStr) return null;
  
  // Dividir el string para evitar problemas de zona horaria local al instanciar Date
  const parts = birthDateStr.split('-');
  if (parts.length !== 3) return null;
  
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
  const birthDay = parseInt(parts[2], 10);
  
  const birthDate = new Date(birthYear, birthMonth, birthDay);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    // Obtener los días del mes anterior al actual
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const resultParts = [];
  if (years > 0) resultParts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months > 0) resultParts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0) resultParts.push(`${days} ${days === 1 ? 'día' : 'días'}`);

  return resultParts.join(', ') || '0 días';
}

/**
 * Formatea la edad detallada priorizando la fecha de nacimiento.
 * Si no está disponible, cae de vuelta a la edad simple guardada como fallback.
 * @param {string} birthDateStr - Fecha de nacimiento YYYY-MM-DD
 * @param {string|number} fallbackAge - Edad guardada originalmente en la cama/solicitud
 * @returns {string} Edad legible
 */
export function formatAgeDetailed(birthDateStr, fallbackAge) {
  const calculated = calculateAgeDetailed(birthDateStr);
  if (calculated) return calculated;
  
  if (fallbackAge !== undefined && fallbackAge !== null && fallbackAge !== '' && fallbackAge !== '—') {
    const ageNum = parseInt(fallbackAge, 10);
    if (!isNaN(ageNum)) {
      return `${ageNum} ${ageNum === 1 ? 'año' : 'años'}`;
    }
    return String(fallbackAge);
  }
  return '—';
}
