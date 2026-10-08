/**
 * Utilidades para parseo, sincronización y filtrado de la colección 'procedures'.
 */

export const parseDateToMillis = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') {
    return val > 1000000000000 ? val : val * 1000;
  }
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? 0 : t;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;

    // Timestamp numérico en string
    if (/^\d{13,}$/.test(trimmed)) {
      return Number(trimmed);
    }

    // Formato chileno/latino: DD/MM/YYYY o DD-MM-YYYY (con HH:mm[:ss] opcional)
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
      const [_, day, month, year, hour = '0', minute = '0', second = '0'] = dmyMatch;
      const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // ISO string u otros formatos estándar de Date
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
};

export const getProcedureTimestamp = (p) => {
  if (!p) return 0;
  // 1. createdAt (ISO string o timestamp)
  if (p.createdAt) {
    const t = parseDateToMillis(p.createdAt);
    if (t > 0) return t;
  }
  // 2. Extraer timestamp del ID si tiene formato proc_1728394... o timestamp numérico
  if (typeof p.id === 'number' && p.id > 1500000000000) {
    return p.id;
  }
  if (typeof p.id === 'string') {
    const match = p.id.match(/^proc_(\d{13})/);
    if (match) {
      return Number(match[1]);
    }
  }
  // 3. fecha (string local es-CL o ISO)
  if (p.fecha) {
    const t = parseDateToMillis(p.fecha);
    if (t > 0) return t;
  }
  // 4. timestamp fallback
  if (p.timestamp) {
    const t = parseDateToMillis(p.timestamp);
    if (t > 0) return t;
  }
  return 0;
};

export const filterProceduresForStay = (procedures, currentBed, currentRoomId) => {
  if (!Array.isArray(procedures) || procedures.length === 0 || !currentBed) return [];

  const bedRut = (currentBed.rut || currentBed.run || '').replace(/[^0-9kK]/g, '').toLowerCase();
  const bedPatient = (currentBed.patient || currentBed.patientName || currentBed.nombre || '').trim().toLowerCase();
  const bedId = String(currentBed.id || '');
  const roomId = String(currentRoomId || currentBed.roomId || '');

  // Timestamp del acueste actual (assignedAt / admissionDate / fechaIngreso)
  const admMillis = parseDateToMillis(currentBed.assignedAt || currentBed.admissionDate || currentBed.fechaIngreso);

  return procedures.filter(p => {
    // 1. Validar identidad (debe corresponder al paciente o a la cama/sala del acueste)
    const procRut = (p.rut || p.run || '').replace(/[^0-9kK]/g, '').toLowerCase();
    const procPatient = (p.patientName || p.patient || p.nombre || '').trim().toLowerCase();
    const matchRut = Boolean(bedRut && procRut && bedRut === procRut);
    const matchName = Boolean(bedPatient && procPatient && bedPatient === procPatient);
    const matchBedRoom = String(p.bedId) === bedId && (!p.roomId || String(p.roomId) === roomId);

    // Si no coincide ni por RUT, ni por nombre, ni por cama/sala, descartar
    if (!matchRut && !matchName && !matchBedRoom) return false;

    // Si coincide por cama/sala pero el paciente es explícitamente otro, descartar
    if (!matchRut && !matchName && matchBedRoom) {
      if (procRut && bedRut && procRut !== bedRut) return false;
      if (procPatient && bedPatient && procPatient !== bedPatient) return false;
    }

    // 2. FILTRAR POR FECHA DE ACUESTE (evitar arrastrar procedimientos de hospitalizaciones/acuestes anteriores)
    if (admMillis > 0) {
      const procTime = getProcedureTimestamp(p);

      // Si el procedimiento tiene timestamp calculable:
      // Solo descartamos si fue realizado CLARAMENTE ANTES del acueste actual.
      // Damos 15 minutos de tolerancia para cubrir desfases de reloj entre servidor y cliente
      // o el tiempo que toma acostar al paciente mientras ya se registraban indicaciones.
      if (procTime > 0 && procTime < (admMillis - 15 * 60 * 1000)) {
        return false;
      }

      // Si el procedimiento registra un assignedAt explícito diferente y anterior
      if (p.assignedAt) {
        const pAdmMillis = parseDateToMillis(p.assignedAt);
        // Si el assignedAt del procedimiento es de una fecha anterior a la hospitalización actual (más de 24h atrás)
        if (pAdmMillis > 0 && pAdmMillis < (admMillis - 24 * 60 * 60 * 1000)) {
          return false;
        }
      }
    }

    return true;
  });
};
