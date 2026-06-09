import { DUMMY_DATA, WAITING_LIST } from './src/data/dummy.js';

console.log("=== DUMMY_DATA ===");
let count = 0;
let occupiedCount = 0;
const floors = Object.keys(DUMMY_DATA);
floors.forEach(floor => {
  const sectors = Object.keys(DUMMY_DATA[floor]);
  sectors.forEach(sector => {
    const rooms = DUMMY_DATA[floor][sector];
    rooms.forEach(room => {
      room.beds.forEach(bed => {
        count++;
        if (bed.status === 'occupied') {
          occupiedCount++;
        }
      });
    });
  });
});
console.log(`Total beds in dummy: ${count}, Occupied: ${occupiedCount}`);
console.log(`Waiting list length in dummy: ${WAITING_LIST.length}`);
process.exit(0);
