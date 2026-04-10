import { processAttendance } from './src/lib/attendance/engine';

async function fix() {
  const tenantId = '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972';
  const today = new Date().toISOString().split('T')[0];
  console.log('Reprocessing today...');
  await processAttendance(tenantId, today);
  console.log('Done.');
  process.exit(0);
}
// This is just for context of how to run it
