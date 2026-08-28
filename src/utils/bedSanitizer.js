/**
 * Sanitiza y repara la estructura de bedsData para asegurar que:
 * 1. Ninguna cama tenga como 'id' un ID de alta/log (ej. 'dis_1787...', 'wait_dis_...', 'log-...').
 * 2. Si se detecta un ID corrupto, se restaura a su identificador real (ej. bed.cama o índice en la sala).
 * 3. Se eliminan propiedades contaminadas de altas (piso, sector, habitacion, cama, _dischargeId, etc.) del objeto de la cama.
 */
export function sanitizeBedsStructure(bedsData) {
  if (!bedsData || typeof bedsData !== 'object') {
    return { cleaned: bedsData, hasFixes: false };
  }

  let hasFixes = false;
  const next = JSON.parse(JSON.stringify(bedsData));

  for (const floor in next) {
    if (!next[floor] || typeof next[floor] !== 'object' || Array.isArray(next[floor])) continue;
    for (const sector in next[floor]) {
      if (!Array.isArray(next[floor][sector])) continue;
      next[floor][sector] = next[floor][sector].map(room => {
        if (!room || !Array.isArray(room.beds)) return room;
        return {
          ...room,
          beds: room.beds.map((bed, idx) => {
            if (!bed) return bed;
            let fixedBed = { ...bed };
            let bedChanged = false;

            // 1. Detectar y corregir ID corrupto con ID de alta
            const isCorruptedId = typeof fixedBed.id === 'string' && (
              fixedBed.id.startsWith('dis_') ||
              fixedBed.id.startsWith('wait_dis_') ||
              fixedBed.id.startsWith('log-')
            );

            if (isCorruptedId) {
              hasFixes = true;
              bedChanged = true;
              const recoveredId = fixedBed.cama ? String(fixedBed.cama) : String(idx + 1);
              fixedBed.id = recoveredId;
            }

            // 2. Limpiar campos residuales de alta que no pertenecen a la cama activa
            const dischargeLeakKeys = [
              '_dischargeId',
              '_logId',
              '_loggedAt',
              '_source',
              '_reverted',
              '_revertedAt',
              'isWaitingListDischarge',
              'cama',
              'habitacion',
              'piso',
              'sector',
              'migratedAt'
            ];

            dischargeLeakKeys.forEach(key => {
              if (key in fixedBed) {
                delete fixedBed[key];
                hasFixes = true;
                bedChanged = true;
              }
            });

            // 3. Sanitizar previousPatient si contiene id de alta
            if (fixedBed.previousPatient && typeof fixedBed.previousPatient.id === 'string' && fixedBed.previousPatient.id.startsWith('dis_')) {
              const { id: _ignoreId, ...cleanPp } = fixedBed.previousPatient;
              fixedBed.previousPatient = cleanPp;
              hasFixes = true;
              bedChanged = true;
            }

            return bedChanged ? fixedBed : bed;
          })
        };
      });
    }
  }

  return { cleaned: next, hasFixes };
}
