const fs = require('fs');
const data = JSON.parse(fs.readFileSync('api/data/targets.json'));
let targets = data.filter(t => t.constellation === 'CrB');
// Add mock visibility
targets = targets.map(t => ({...t, visible: true, observable: true, altitude_deg: 38.5}));

let typeFilter = 'all';
let equipFilter = 'all';

const filtered = targets.filter(t => {
  let typeMatch = true;
  if (typeFilter !== 'all') {
    typeMatch = t.type.toLowerCase().includes(typeFilter);
  }
  
  let equipMatch = true;
  if (equipFilter !== 'all') {
    if (equipFilter === 'seestar') {
      equipMatch = ['galaxy', 'nebula', 'globular cluster', 'open cluster'].some(k => t.type.toLowerCase().includes(k));
    } else if (equipFilter === 'dslr') {
      equipMatch = t.magnitude <= 6 || t.type.toLowerCase().includes('open cluster');
    } else if (equipFilter === 'binos') {
      equipMatch = t.difficulty === 'naked_eye' || t.difficulty === 'easy' || t.magnitude <= 7;
    }
  }
  return typeMatch && equipMatch;
});

console.log("Filtered length:", filtered.length);
console.log("Targets:", filtered);
