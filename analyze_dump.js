import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('firestore_dump.json', 'utf-8'));

console.log("=== bedsData ===");
if (dump.bedsData) {
  let count = 0;
  let occupiedCount = 0;
  const patients = [];
  const floors = Object.keys(dump.bedsData);
  floors.forEach(floor => {
    const sectors = Object.keys(dump.bedsData[floor]);
    sectors.forEach(sector => {
      const rooms = dump.bedsData[floor][sector];
      rooms.forEach(room => {
        room.beds.forEach(bed => {
          count++;
          if (bed.status === 'occupied') {
            occupiedCount++;
            patients.push({
              name: bed.patient || bed.patientName,
              bed: `${floor} - ${sector} - Cama ${bed.id} (Room ${room.roomId})`
            });
          }
        });
      });
    });
  });
  console.log(`Total Beds: ${count}, Occupied: ${occupiedCount}`);
  console.log("Occupied Beds Patients:", patients.slice(0, 10));
} else {
  console.log("No bedsData in dump!");
}

console.log("=== waitingList ===");
if (dump.waitingList) {
  console.log(`Total waiting list patients: ${dump.waitingList.length}`);
  console.log("Waiting list sample:", dump.waitingList.map(p => p.name || p.nombre).slice(0, 5));
} else {
  console.log("No waitingList in dump!");
}

console.log("=== hodomRequests ===");
if (dump.hodomRequests) {
  console.log(`Total hodomRequests: ${dump.hodomRequests.length}`);
} else {
  console.log("No hodomRequests in dump!");
}

process.exit(0);
