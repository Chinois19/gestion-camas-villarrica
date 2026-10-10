import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { filterProceduresForStay } from './procedureUtils.js';

/**
 * Consulta bajo demanda en Cloud Firestore ÚNICAMENTE los procedimientos
 * asociados a un paciente específico en su hospitalización/cama actual.
 * Evita la descarga masiva de miles de documentos históricos en el Dashboard.
 * 
 * @param {Object} bed - Objeto de la cama activa
 * @param {string|number} roomId - Identificador de la sala/habitación
 * @returns {Promise<Array>} Lista de procedimientos validados para la estadía actual
 */
export async function fetchProceduresForBed(bed, roomId) {
  if (!bed) return [];

  const rawRut = (bed.rut || bed.run || '').trim();
  const cleanRut = rawRut.replace(/[^0-9kK]/g, '').toLowerCase();
  const bedId = String(bed.id || '');
  const rId = String(roomId || bed.roomId || '');

  const docMap = new Map();

  try {
    const promises = [];

    // 1. Consulta por RUT si está presente (cubre procedimientos que siguen al paciente en traslados)
    if (cleanRut) {
      const variations = [rawRut, cleanRut];
      if (cleanRut.length > 1) {
        variations.push(`${cleanRut.slice(0, -1)}-${cleanRut.slice(-1).toUpperCase()}`);
      }
      const uniqueVariations = [...new Set(variations.filter(Boolean))];
      const qRut = query(collection(db, 'procedures'), where('rut', 'in', uniqueVariations));
      promises.push(getDocs(qRut));
    }

    // 2. Consulta por cama y sala (cubre pacientes sin RUT o novedades asociadas físicamente a la cama)
    if (bedId && rId) {
      const qBed = query(
        collection(db, 'procedures'),
        where('bedId', '==', bedId),
        where('roomId', '==', rId)
      );
      promises.push(getDocs(qBed));
    }

    const snapshots = await Promise.all(promises);
    for (const snap of snapshots) {
      snap.forEach(d => {
        docMap.set(d.id, { id: d.id, ...d.data() });
      });
    }
  } catch (err) {
    console.warn('[procedureService] Error al consultar procedimientos bajo demanda:', err);
  }

  const allFound = Array.from(docMap.values());
  return filterProceduresForStay(allFound, bed, roomId);
}
