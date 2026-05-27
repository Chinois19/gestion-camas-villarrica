const RAW_DUMMY_DATA = {
  piso2: {
    poniente: [
      {
        roomId: '201',
        roomType: 'UPC',
        beds: [
          { id: '1', type: 'UCI', status: 'occupied', patient: 'Paula Velozo Velozo', info: 'Ventilación Mecánica', tag: 'UCI' },
          { id: '2', type: 'UCI', status: 'occupied', patient: 'Lucía Igalman Curin', info: 'Post-Op', tag: 'UCI' },
          { id: '3', type: 'UCI', status: 'occupied', patient: 'Leonardo Antinao Pincheira', info: 'Politraumatismo', tag: 'UCI' },
          { id: '4', type: 'UCI', status: 'occupied', patient: 'Rogelio Singer Gutierrez', info: 'Sepsis', tag: 'UCI' },
          { id: '5', type: 'UCI', status: 'available', patient: null, info: null, tag: 'UCI' },
          { id: '6', type: 'UTI', status: 'occupied', patient: 'Ana Pillaman Cariman', info: 'Observación', tag: 'UTI' },
          { id: '7', type: 'UTI', status: 'occupied', patient: 'Pedro Riquelme Sepulveda', info: 'Estable', tag: 'UTI' },
          { id: '8', type: 'UTI', status: 'occupied', patient: 'Iris Antipichun Salas', info: 'Transición', tag: 'UTI' },
          { id: '9', type: 'UTI', status: 'cleaning', patient: null, info: 'Aseo concurrente', tag: 'UTI' },
          { id: '10', type: 'UTI', status: 'available', patient: null, info: null, tag: 'UTI' },
        ]
      }
    ],
    oriente: []
  },
  piso3: {
    poniente: [
      {
        roomId: '301', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Maternidad', status: 'available', tag: 'Maternidad', patient: null },
          { id: '2', type: 'Maternidad', status: 'available', tag: 'Maternidad', patient: null },
          { id: '3', type: 'Maternidad', status: 'available', tag: 'Maternidad', patient: null },
        ]
      },
      {
        roomId: '302', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Javiera Sandoval Alcapan' },
          { id: '2', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Catalina Ordonez Vega' },
          { id: '3', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Denisee Coñoepan Carinao' },
          { id: '4', type: 'Maternidad', status: 'available', tag: 'Maternidad', patient: null },
        ]
      },
      {
        roomId: '303', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Nohemmy Gonzalez Yañez' },
          { id: '2', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Javiera Pezoa Diaz' },
          { id: '3', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Rocio Huilipan Caniulef' },
          { id: '4', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Claudia Barrales Silva' },
        ]
      },
      {
        roomId: '304', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Neonatología', status: 'occupied', tag: 'Infantil', patient: 'Felipe Vergara Coña' },
          { id: '2', type: 'Neonatología', status: 'occupied', tag: 'Infantil', patient: 'Aaron Gallegos Gonzalez' },
          { id: '3', type: 'Neonatología', status: 'available', tag: 'Infantil', patient: null },
          { id: '4', type: 'Neonatología', status: 'occupied', tag: 'Infantil', patient: 'Saray Navarro Peraza' },
          { id: '5', type: 'Neonatología', status: 'occupied', tag: 'Infantil', patient: 'Aneley Carinao Coñoepan' },
        ]
      },
      {
        roomId: '305', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Neonatología', status: 'available', tag: 'Neonatología', patient: null },
        ]
      },
      {
        roomId: '306', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Maternidad', status: 'available', tag: 'Maternidad', patient: null },
        ]
      }
    ],
    oriente: [
      {
        roomId: '307', roomType: 'Oriente',
        beds: [
          { id: '1', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Miriam Quintrileo Valenzuela' },
          { id: '2', type: 'Maternidad', status: 'available', tag: 'Maternidad', patient: null },
          { id: '3', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Isabel Carinao Castro' },
          { id: '4', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Ana Doris Gallegos Tello' },
        ]
      },
      {
        roomId: '308', roomType: 'Oriente',
        beds: [
          { id: '1', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Maria Arriagada Cid' },
          { id: '2', type: 'Maternidad', status: 'available', tag: 'Maternidad', patient: null },
          { id: '3', type: 'Maternidad', status: 'occupied', tag: 'Maternidad', patient: 'Karen Sanchez Sanchez' },
          { id: '4', type: 'Maternidad', status: 'available', tag: 'Maternidad', patient: null },
        ]
      },
      {
        roomId: '309', roomType: 'Oriente',
        beds: [
          { id: '1', type: 'Infantil', status: 'occupied', tag: 'Cuidados Medios', patient: 'Jose Muñoz Huaiquifil' },
          { id: '2', type: 'Infantil', status: 'occupied', tag: 'Cuidados Medios', patient: 'Patricio Velasquez Herwitt' },
          { id: '3', type: 'Infantil', status: 'occupied', tag: 'Cuidados Medios', patient: 'Joel Lopez Mendoza' },
          { id: '4', type: 'Infantil', status: 'occupied', tag: 'Cuidados Medios', patient: 'Pedro Maldonado Valdebenito' },
        ]
      },
      {
        roomId: '310', roomType: 'Oriente',
        beds: [
          { id: '1', type: 'Infantil', status: 'available', tag: 'Infantil', patient: null },
          { id: '2', type: 'Infantil', status: 'occupied', tag: 'Infantil', patient: 'Emma Pontigo Morales' },
          { id: '3', type: 'Infantil', status: 'occupied', tag: 'Infantil', patient: 'Jonathan Cid Baeza' },
          { id: '4', type: 'Infantil', status: 'occupied', tag: 'Infantil', patient: 'Angel Carrasco Galindo' },
        ]
      },
      {
        roomId: '311', roomType: 'Oriente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Miriam Pinilla Villalobos' },
          { id: '2', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Raquel Penchulef Curihual' },
          { id: '3', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Carlina Ulloa Salazar' },
          { id: '4', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Maria Lorenzini Sanguineti' },
        ]
      },
      {
        roomId: '312', roomType: 'Oriente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Elia Manriquez Hernandez' },
          { id: '2', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Deisy Sandoval Salazar' },
          { id: '3', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Ana Retamales Barahona' },
          { id: '4', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Ana Campos Garces' },
        ]
      },
      {
        roomId: '313', roomType: 'Oriente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Daniel Jara Burgos' },
          { id: '2', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Jose Ferrada Jara' },
          { id: '3', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Maximiliano Franco Spinelli' },
          { id: '4', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Oscar Escobar Ramirez' },
        ]
      },
      {
        roomId: '314', roomType: 'Oriente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Jose Mansilla Montiel' },
          { id: '2', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Flavio Manquecoy Baeza' },
          { id: '3', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Elvis Saravia Hurtado' },
          { id: '4', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Jose Velasquez Antilaf' },
        ]
      }
    ]
  },
  piso4: {
    poniente: [
      {
        roomId: '401', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Alicia Cid Ortiz' },
          { id: '2', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Islandia Hax Nuñez' },
          { id: '3', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Yissel Pinto Morales' },
          { id: '4', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Javiera Vidal Ormeño' },
        ]
      },
      {
        roomId: '402', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados básicos', status: 'occupied', tag: 'Infantil', patient: 'Paz Ariel Pinto Castro' },
          { id: '2', type: 'Cuidados básicos', status: 'occupied', tag: 'Infantil', patient: 'Agustina Grez Sepulveda' },
          { id: '3', type: 'Cuidados básicos', status: 'occupied', tag: 'Infantil', patient: 'Valentina Pineda Alamos' },
          { id: '4', type: 'Cuidados básicos', status: 'occupied', tag: 'Infantil', patient: 'Constaza Valenzuela Muñoz' },
        ]
      },
      {
        roomId: '403', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Cristina Parra Rodriguez' },
          { id: '2', type: 'Cuidados básicos', status: 'occupied', tag: 'Infantil', patient: 'Melisa Torres Silva' },
          { id: '3', type: 'Cuidados básicos', status: 'occupied', tag: 'Infantil', patient: 'Antonella Montecino Riquelme' },
          { id: '4', type: 'Cuidados básicos', status: 'occupied', tag: 'Infantil', patient: 'Rayen Hurtado Aguilera' },
        ]
      },
      {
        roomId: '404', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Cristian Paredes Bravo' },
          { id: '2', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Bryan Epuyao Macias' },
          { id: '3', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Nicolas Sandoval Agurto' },
          { id: '4', type: 'Cuidados básicos', status: 'occupied', tag: 'Cuidados Básicos', patient: 'Alexsander Loncopan Ñancufil' },
        ]
      },
      {
        roomId: '405', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Abel Reyes Alarcon' },
          { id: '2', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Juan Loncoyanco Epuñanco' },
          { id: '3', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Jose Hernan Tapia Silva' },
          { id: '4', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Segundo Hernandez Vilches' },
        ]
      },
      {
        roomId: '406', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Maritza Castillo Espinoza' },
          { id: '2', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Jose Yañez Castillo' },
          { id: '3', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Floridor Antihuen Rain' },
          { id: '4', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Carmen Huentelaf Alañanco' },
        ]
      },
      {
        roomId: '407', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Andres Gordillo Rios' },
          { id: '2', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Bernardino Nanculeo Millalen' },
          { id: '3', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Elvira Gatica Vidal' },
          { id: '4', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Cristobal Esparza Martinez' },
        ]
      },
      {
        roomId: '408', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Elvis Obreque Obreque' },
        ]
      },
      {
        roomId: '409', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Macarena Millacura Contreras' },
        ]
      },
      {
        roomId: '410', roomType: 'Poniente',
        beds: [
          { id: '1', type: 'Cuidados medios', status: 'occupied', tag: 'Cuidados Medios', patient: 'Juan Quintana Vegara' },
        ]
      }
    ],
    oriente: []
  }
};

const clearData = (data) => {
  const processed = JSON.parse(JSON.stringify(data));
  for (const floor in processed) {
    for (const sector in processed[floor]) {
      processed[floor][sector].forEach(room => {
        room.beds.forEach(bed => {
          bed.status = 'available';
          bed.patient = null;
          bed.info = null;
          delete bed.projectedDays;
          delete bed.assignedAt;
          delete bed.grdName;
          delete bed.diagnosis;
        });
      });
    }
  }
  return processed;
};

export const DUMMY_DATA = clearData(RAW_DUMMY_DATA);

export const WAITING_LIST = [];

export const getBedTypeClass = (type) => {
  return 'type-' + type.toLowerCase().replace(' ', '-').replace('á', 'a').replace('í', 'i').replace('ó', 'o');
};

export const getIconColor = (type) => {
  const t = getBedTypeClass(type);
  if (t.includes('uci')) return '#00f0ff';
  if (t.includes('uti')) return '#f59e0b';
  if (t.includes('maternidad')) return '#ec4899';
  if (t.includes('neonatologia') || t.includes('infantil')) return '#a855f7';
  if (t.includes('cuidados-medios')) return '#f97316';
  if (t.includes('cuidados-basicos')) return '#ef4444'; // Red for Cuidados Básicos
  return '#ffffff';
};

export const getHospitalStats = () => {
  let total = 0, available = 0, occupied = 0, cleaning = 0;
  
  const breakdown = {
    'UPC (UCI/UTI)': { available: 0, occupied: 0, cleaning: 0, inhabilitadas: 0 },
    'Maternidad': { available: 0, occupied: 0, cleaning: 0, inhabilitadas: 0 },
    'Neonatología / Infantil': { available: 0, occupied: 0, cleaning: 0, inhabilitadas: 0 },
    'Cuidados Medios': { available: 0, occupied: 0, cleaning: 0, inhabilitadas: 0 },
    'Cuidados Básicos': { available: 0, occupied: 0, cleaning: 0, inhabilitadas: 0 },
    'Otras Áreas': { available: 0, occupied: 0, cleaning: 0, inhabilitadas: 0 }
  };
  
  Object.values(DUMMY_DATA).forEach(floor => {
    Object.values(floor).forEach(sector => {
      sector.forEach(room => {
        room.beds.forEach(bed => {
          total++;
          if (bed.status === 'available') available++;
          else if (bed.status === 'occupied') occupied++;
          else if (bed.status === 'cleaning') cleaning++;
          
          let cat = 'Otras Áreas';
          const target = (bed.tag || bed.type).toLowerCase();
          
          if (target.includes('uci') || target.includes('uti') || target === 'upc') cat = 'UPC (UCI/UTI)';
          else if (target.includes('maternidad')) cat = 'Maternidad';
          else if (target.includes('neonatolog') || target.includes('infantil')) cat = 'Neonatología / Infantil';
          else if (target.includes('cuidados medios') || target === 'medios') cat = 'Cuidados Medios';
          else if (target.includes('cuidados basicos') || target.includes('cuidados básicos')) cat = 'Cuidados Básicos';

          if (bed.status === 'available') breakdown[cat].available++;
          else if (bed.status === 'occupied') breakdown[cat].occupied++;
          else if (bed.status === 'cleaning') breakdown[cat].cleaning++;
        });
      });
    });
  });
  
  const inhabilitadas = 125 - total;
  breakdown['Otras Áreas'].inhabilitadas += inhabilitadas;
  
  return { 
    total: 125, 
    available, 
    occupied, 
    cleaning, 
    inhabilitadas,
    breakdown
  };
};
