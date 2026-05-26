// seed.js  —  Run with: node seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding inventory...');

  // Clear existing inventory first to avoid duplicates on re-run
  await prisma.inventoryItem.deleteMany({});
  console.log('🗑️  Cleared existing inventory items.');

  // ─── APPARATUS ───────────────────────────────────────────────
  const apparatus = [
    { name: 'Bunsen Burner',         description: 'Single nozzle gas burner for heating',         brand: 'Velp',    location: 'Room A / Cabinet 1', remarks: 'Functional' },
    { name: 'Ring Stand with Clamp', description: 'Iron ring stand with adjustable clamp',        brand: 'Generic', location: 'Room A / Cabinet 2', remarks: '2 clamps missing' },
    { name: 'Tripod Stand',          description: 'Three-legged support for beakers/flasks',      brand: 'Generic', location: 'Room B / Cabinet 1', remarks: 'Functional' },
    { name: 'Wire Gauze',            description: 'Steel wire mesh for heat distribution',        brand: 'Generic', location: 'Room A / Cabinet 1', remarks: 'DEFECTIVE',  status: 'DEFECTIVE' },
    { name: 'Crucible with Cover',   description: 'Porcelain crucible for high-temp reactions',   brand: 'Coors',   location: 'Room C / Cabinet 3', remarks: '107 Crucible; 90 Cover' },
    { name: 'Evaporating Dish',      description: 'Wide-mouth porcelain dish for evaporation',    brand: 'Coors',   location: 'Room C / Cabinet 3', remarks: 'Functional' },
    { name: 'Mortar and Pestle',     description: 'Grinding tool for solid substances',           brand: 'Coors',   location: 'Room B / Cabinet 2', remarks: 'Functional' },
    { name: 'Funnel (Glass)',         description: 'Conical funnel for liquid transfer',           brand: 'Pyrex',   location: 'Room A / Cabinet 2', remarks: '1 damaged' },
    { name: 'Condenser (Liebig)',    description: 'Water-cooled condenser for distillation',      brand: 'Pyrex',   location: 'Room D / Cabinet 1', remarks: 'Functional' },
    { name: 'Separatory Funnel',     description: 'Pear-shaped funnel with stopcock',             brand: 'Bomex',   location: 'Room D / Cabinet 1', remarks: 'Stopcock leaking — for repair', status: 'FOR_REPAIR' },
    { name: 'Crucible Tongs',        description: 'Metal tongs for handling hot crucibles',       brand: 'Generic', location: 'Room C / Cabinet 3', remarks: 'Functional' },
    { name: 'Clay Triangle',         description: 'Triangular clay support for crucibles',        brand: 'Generic', location: 'Room A / Cabinet 1', remarks: '3 damaged' },
  ];

  for (const item of apparatus) {
    await prisma.inventoryItem.create({
      data: {
        category: 'APPARATUS',
        name:     item.name,
        description: item.description,
        brand:    item.brand,
        location: item.location,
        remarks:  item.remarks,
        status:   item.status || 'AVAILABLE',
        amount:   0,
      },
    });
  }
  console.log(`✅ Seeded ${apparatus.length} apparatus items.`);

  // ─── GLASSWARE ───────────────────────────────────────────────
  const glassware = [
    { name: 'Beaker 50mL',              description: 'Low-form borosilicate glass beaker',            brand: 'Pyrex 18; Bomex 12',                               location: 'Cabinet 1', remarks: 'Unused' },
    { name: 'Beaker 100mL',             description: 'Low-form borosilicate glass beaker',            brand: '7 Uni-rex; 2 Schott; GG17-9; 4 Kimax',             location: 'Cabinet 1', remarks: '2 chipped' },
    { name: 'Beaker 250mL',             description: 'Low-form borosilicate glass beaker',            brand: '18 Pyrex; 4 Bomex; 1 Boro3.3; 1 GG-17; 1 Sterglass', location: 'Cabinet 1', remarks: 'Unused' },
    { name: 'Erlenmeyer Flask 250mL',   description: 'Conical flask for mixing and heating',          brand: 'Pyrex',                                            location: 'Cabinet 2', remarks: 'Functional' },
    { name: 'Graduated Cylinder 100mL', description: 'Glass cylinder for accurate volume measurement', brand: 'Veegee 1; Boro 3.3 1',                             location: 'Cabinet 2', remarks: '1 cracked — for disposal' },
    { name: 'Test Tubes',               description: 'Cylindrical borosilicate tubes',                brand: 'Bomex',                                            location: 'Cabinet 2', remarks: 'OUT OF STOCK', status: 'OUT_OF_STOCK' },
    { name: 'Petri Dish',               description: 'Shallow glass dish for cultures',               brand: 'Pyrex',                                            location: 'Cabinet 3', remarks: 'Unused' },
    { name: 'Watch Glass',              description: 'Circular concave glass for small volumes',      brand: 'Generic',                                          location: 'Cabinet 3', remarks: 'Functional' },
    { name: 'Volumetric Flask 100mL',   description: 'Flask for precise volume preparation',          brand: 'Pyrex',                                            location: 'Cabinet 4', remarks: 'Functional' },
    { name: 'Burette 50mL',             description: 'Graduated tube with stopcock for titration',    brand: 'Pyrex',                                            location: 'Cabinet 4', remarks: 'Functional' },
    { name: 'Pipette 10mL',             description: 'Calibrated glass pipette for liquid transfer',  brand: 'Bomex',                                            location: 'Cabinet 3', remarks: '2 broken tips' },
    { name: 'Reflux Condenser',         description: 'Vertical condenser for reflux reactions',       brand: 'Pyrex',                                            location: 'Cabinet 4', remarks: 'Functional' },
  ];

  for (const item of glassware) {
    await prisma.inventoryItem.create({
      data: {
        category: 'GLASSWARE',
        name:     item.name,
        description: item.description,
        brand:    item.brand,
        location: item.location,
        remarks:  item.remarks,
        status:   item.status || 'AVAILABLE',
        amount:   0,
      },
    });
  }
  console.log(`✅ Seeded ${glassware.length} glassware items.`);

  // ─── EQUIPMENT ───────────────────────────────────────────────
  const equipment = [
    { name: 'Analytical Balance',      brand: 'Shimadzu AUX220',   serial: 'SN-2024-001', propertyNo: 'CAS-EQ-001', code: 'BAL-001', location: 'Room A', calibrationDate: new Date('2025-01-15'), calibrationFreq: 'Semi-annual', remarks: 'FUNCTIONAL - Max. 220g' },
    { name: 'Compound Microscope',     brand: 'Olympus CX23',      serial: 'SN-2023-045', propertyNo: 'CAS-EQ-002', code: 'MIC-001', location: 'Room B', calibrationDate: new Date('2024-11-01'), calibrationFreq: 'Annual',       remarks: 'FUNCTIONAL' },
    { name: 'Centrifuge',              brand: 'Eppendorf 5424',    serial: 'SN-2022-312', propertyNo: 'CAS-EQ-003', code: 'CEN-001', location: 'Room B', calibrationDate: new Date('2025-02-10'), calibrationFreq: 'Annual',       remarks: 'For PMS (Preventive Maintenance Service)' },
    { name: 'Hot Plate Stirrer',       brand: 'Velp Scientifica',  serial: 'SN-2021-088', propertyNo: 'CAS-EQ-004', code: 'HPS-001', location: 'Room A', calibrationDate: null,                  calibrationFreq: 'N/A',          remarks: 'FOR REPAIR - Heating element malfunction', status: 'FOR_REPAIR' },
    { name: 'pH Meter',                brand: 'Hanna HI2211',      serial: 'SN-2023-200', propertyNo: 'CAS-EQ-005', code: 'PHM-001', location: 'Room A', calibrationDate: new Date('2025-03-01'), calibrationFreq: 'Monthly',      remarks: 'FUNCTIONAL' },
    { name: 'Spectrophotometer',       brand: 'Thermo GENESYS 30', serial: 'SN-2020-075', propertyNo: 'CAS-EQ-006', code: 'SPC-001', location: 'Room D', calibrationDate: new Date('2025-01-20'), calibrationFreq: 'Semi-annual',  remarks: 'FUNCTIONAL' },
    { name: 'Autoclave',               brand: 'Tuttnauer 2540M',   serial: 'SN-2019-300', propertyNo: 'CAS-EQ-007', code: 'AUT-001', location: 'Room B', calibrationDate: new Date('2024-12-01'), calibrationFreq: 'Annual',       remarks: 'FUNCTIONAL' },
    { name: 'Vortex Mixer',            brand: 'IKA MS3',           serial: 'SN-2022-411', propertyNo: 'CAS-EQ-008', code: 'VTX-001', location: 'Room A', calibrationDate: null,                  calibrationFreq: 'N/A',          remarks: 'NOT FUNCTIONAL', status: 'DEFECTIVE' },
    { name: 'Water Bath',              brand: 'Memmert WNB 7',     serial: 'SN-2021-190', propertyNo: 'CAS-EQ-009', code: 'WBT-001', location: 'Room C', calibrationDate: new Date('2025-02-28'), calibrationFreq: 'Annual',       remarks: 'FOR REPAIR - Thermostat issue', status: 'FOR_REPAIR' },
    { name: 'Electric Oven',           brand: 'Memmert UF55',      serial: 'SN-2020-503', propertyNo: 'CAS-EQ-010', code: 'OVN-001', location: 'Room B', calibrationDate: new Date('2025-01-10'), calibrationFreq: 'Annual',       remarks: 'FUNCTIONAL' },
    { name: 'Fume Hood',               brand: 'Labconco 3970001',  serial: 'SN-2018-002', propertyNo: 'CAS-EQ-011', code: 'FHD-001', location: 'Room D', calibrationDate: new Date('2024-10-15'), calibrationFreq: 'Annual',       remarks: 'For PMS (Preventive Maintenance Service)' },
    { name: 'Compound Microscope #2',  brand: 'Olympus CX23',      serial: 'SN-2023-046', propertyNo: 'CAS-EQ-012', code: 'MIC-002', location: 'Room B', calibrationDate: new Date('2024-11-01'), calibrationFreq: 'Annual',       remarks: 'FOR REPAIR - Coarse adjustment knob not working', status: 'FOR_REPAIR' },
  ];

  for (const item of equipment) {
    await prisma.inventoryItem.create({
      data: {
        category:         'EQUIPMENT',
        name:             item.name,
        brand:            item.brand,
        location:         item.location,
        serial_number:    item.serial,
        property_number:  item.propertyNo,
        equipment_code:   item.code,
        calibration_date: item.calibrationDate,
        calibration_freq: item.calibrationFreq,
        remarks:          item.remarks,
        status:           item.status || 'AVAILABLE',
        amount:           0,
      },
    });
  }
  console.log(`✅ Seeded ${equipment.length} equipment items.`);

  // ─── SUPPLIES ────────────────────────────────────────────────
  const supplies = [
    { name: 'Latex Gloves (M)',        brand: 'Medline',          location: 'Supply Room' },
    { name: 'Safety Goggles',          brand: '3M',               location: 'Supply Room' },
    { name: 'Lab Coat (M)',            brand: 'Generic',          location: 'Supply Room' },
    { name: 'Pipette Tips (10µL)',     brand: 'Axygen',           location: 'Cabinet 3' },
    { name: 'Filter Paper',            brand: 'Whatman',          location: 'Cabinet 3' },
    { name: 'Disposable Syringes 5mL', brand: 'BD',               location: 'Supply Room' },
    { name: 'Rubber Tubing',           brand: 'Generic',          location: 'Cabinet 4' },
    { name: 'Aluminum Foil',           brand: 'Generic',          location: 'Supply Room' },
    { name: 'Masking Tape',            brand: '3M',               location: 'Supply Room' },
    { name: 'Marker (Permanent)',      brand: 'Sharpie',          location: 'Supply Room' },
    { name: 'Micropipette Tips 1mL',   brand: 'Axygen',           location: 'Cabinet 3' },
    { name: 'Bench Paper',             brand: 'Kimberly-Clark',   location: 'Supply Room' },
  ];

  for (const item of supplies) {
    await prisma.inventoryItem.create({
      data: {
        category: 'SUPPLY',
        name:     item.name,
        brand:    item.brand,
        location: item.location,
        status:   'AVAILABLE',
        amount:   0,
      },
    });
  }
  console.log(`✅ Seeded ${supplies.length} supply items.`);

  // ─── CHEMICALS ───────────────────────────────────────────────
  const chemicals = [
    { name: 'Hydrochloric Acid (HCl)',  amount: 5,   unit: 'L',  hazard: 'Corrosive', status: 'AVAILABLE',    location: 'Chem Storage',  expiry: new Date('2026-06-01') },
    { name: 'Sodium Hydroxide (NaOH)',  amount: 2,   unit: 'kg', hazard: 'Corrosive', status: 'LOW_STOCK',    location: 'Chem Storage',  expiry: new Date('2026-12-01') },
    { name: 'Ethanol (95%)',            amount: 10,  unit: 'L',  hazard: 'Flammable', status: 'AVAILABLE',    location: 'Flammable Cab', expiry: new Date('2027-01-01') },
    { name: 'Acetone',                  amount: 0,   unit: 'L',  hazard: 'Flammable', status: 'OUT_OF_STOCK', location: 'Flammable Cab', expiry: null },
    { name: 'Sulfuric Acid (H₂SO₄)',   amount: 3,   unit: 'L',  hazard: 'Corrosive', status: 'AVAILABLE',    location: 'Acid Cabinet',  expiry: new Date('2026-08-01') },
    { name: 'Sodium Chloride (NaCl)',   amount: 500, unit: 'g',  hazard: 'Low',       status: 'AVAILABLE',    location: 'Chem Storage',  expiry: new Date('2028-01-01') },
    { name: 'Agar Powder',              amount: 200, unit: 'g',  hazard: 'Low',       status: 'LOW_STOCK',    location: 'Cold Storage',  expiry: new Date('2025-11-01') },
    { name: 'Methanol',                 amount: 4,   unit: 'L',  hazard: 'Toxic',     status: 'AVAILABLE',    location: 'Flammable Cab', expiry: new Date('2026-10-01') },
    { name: 'Potassium Permanganate',   amount: 100, unit: 'g',  hazard: 'Oxidizer',  status: 'AVAILABLE',    location: 'Oxidizer Cab',  expiry: new Date('2027-06-01') },
    { name: 'Glacial Acetic Acid',      amount: 1,   unit: 'L',  hazard: 'Corrosive', status: 'LOW_STOCK',    location: 'Acid Cabinet',  expiry: new Date('2026-04-01') },
  ];

  for (const item of chemicals) {
    await prisma.inventoryItem.create({
      data: {
        category:    'CHEMICAL',
        name:        item.name,
        amount:      item.amount,
        unit:        item.unit,
        hazard:      item.hazard,
        status:      item.status,
        location:    item.location,
        expiry_date: item.expiry,
      },
    });
  }
  console.log(`✅ Seeded ${chemicals.length} chemical items.`);

  const total = apparatus.length + glassware.length + equipment.length + supplies.length + chemicals.length;
  console.log(`\n🎉 Done! ${total} inventory items seeded successfully.`);
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });