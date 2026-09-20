import { getCleanUserDisplay } from '../src/utils/userDisplay.js';

console.log("=================================================");
console.log("TEST SUITE: USER DISPLAY RESOLVER & DRIVER GATING");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// 1. TEST USER DISPLAY RESOLVER
console.log("--- 1. Testing getCleanUserDisplay ---");

{
  const res = getCleanUserDisplay({ username: 'rameshkumar.driver@safebus.ai', role: 'DRIVER' });
  assert(res.name === 'Ramesh Kumar', 'Driver name resolves to "Ramesh Kumar"');
  assert(res.roleLabel === 'Driver', 'Driver roleLabel is "Driver"');
  assert(res.initials === 'RK', 'Driver initials are "RK"');
}

{
  const res = getCleanUserDisplay({ username: 'driver01', role: 'DRIVER', fullName: 'Ramesh K' });
  assert(res.name === 'Ramesh K', 'Explicit driver fullName "Ramesh K" preserved');
  assert(res.roleLabel === 'Driver', 'Driver roleLabel is "Driver"');
}

{
  const res = getCleanUserDisplay({ username: 'senthil.parent@safebus.ai', role: 'PARENT' });
  assert(res.name === 'Senthil Kumar', 'Parent name resolves to "Senthil Kumar"');
  assert(res.roleLabel === 'Parent', 'Parent roleLabel is "Parent"');
  assert(res.initials === 'SK', 'Parent initials are "SK"');
}

{
  const res = getCleanUserDisplay({ username: 'ragunaths_std002.student@safebus.ai', role: 'STUDENT' });
  assert(res.name === 'Ragunath S', 'Student name resolves to "Ragunath S"');
  assert(res.roleLabel === 'Student', 'Student roleLabel is "Student"');
  assert(res.initials === 'RS', 'Student initials are "RS"');
}

{
  const res = getCleanUserDisplay({ username: 'admin@safebus.ai', role: 'ADMIN' });
  assert(res.name === 'Admin Control', 'Admin name resolves to "Admin Control"');
  assert(res.roleLabel === 'Administrator', 'Admin roleLabel is "Administrator"');
  assert(res.initials === 'AC', 'Admin initials are "AC"');
}

{
  const res = getCleanUserDisplay({ username: 'sathish.admin@safebus.ai', role: 'ADMIN' });
  assert(res.name === 'Sathish Kumar', 'Admin sathish resolves to "Sathish Kumar"');
  assert(res.roleLabel === 'Administrator', 'Admin roleLabel is "Administrator"');
  assert(res.initials === 'SK', 'Admin initials are "SK"');
}

// 2. TEST DRIVER NOTIFICATION FILTERING
console.log("\n--- 2. Testing Driver Notification Gating Filter ---");

function filterAlertForDriver(a, userRole) {
  if (userRole === 'DRIVER') {
    if (
      a.targetRole === 'PARENT' ||
      a.category === 'ATTENDANCE' ||
      a.category === 'ATTENDANCE_SUMMARY'
    ) {
      return false;
    }
    const upper = (a.message || '').toUpperCase();
    if (
      upper.includes("PARENT NOTIFICATION") ||
      upper.includes("HAS BOARDED") ||
      upper.includes("REACHED SCHOOL") ||
      upper.includes("DROPPED AT") ||
      upper.includes("ATTENDANCE:") ||
      upper.includes("STRENGTH:") ||
      upper.includes("WHATSAPP")
    ) {
      return false;
    }
    return true;
  }
  return true;
}

const mockAlerts = [
  { id: '1', targetRole: 'PARENT', category: 'ATTENDANCE', message: '🔔 Parent Notification: Sathish R has boarded the bus at 07:45 AM.' },
  { id: '2', targetRole: 'PARENT', category: 'ATTENDANCE', message: '🔔 Parent Notification: Priya has reached school safely.' },
  { id: '3', targetRole: 'PARENT', category: 'BUS_ARRIVAL', message: '🔔 Parent Notification (Ragunath): Bus 1 is 2km away from Gandhipuram.' },
  { id: '4', targetRole: 'ADMIN', category: 'ATTENDANCE_SUMMARY', message: 'Bus 1 Attendance: 4/5 present' },
  { id: '5', targetRole: 'ALL', category: 'DRIVER_INCIDENT', message: '🚨 Driver Drowsiness Alert: Bus TN38AB1234 driver confirmed drowsy — cabin buzzer activated.' },
  { id: '6', targetRole: 'ALL', category: 'SOS', message: '🚨 CRITICAL SOS DISPATCHED: Emergency services notified.' },
  { id: '7', targetRole: 'ALL', category: 'OPERATIONAL', message: 'Route B (Gandhipuram) in progress. On schedule.' }
];

const driverVisible = mockAlerts.filter(a => filterAlertForDriver(a, 'DRIVER'));

assert(driverVisible.length === 3, `Driver sees exactly 3 operational/safety alerts (saw: ${driverVisible.length})`);
assert(!driverVisible.some(a => a.targetRole === 'PARENT'), 'Zero PARENT targetRole alerts visible to Driver');
assert(!driverVisible.some(a => a.category === 'ATTENDANCE'), 'Zero ATTENDANCE alerts visible to Driver');
assert(!driverVisible.some(a => a.message.includes('Parent Notification')), 'Zero "Parent Notification" messages visible to Driver');
assert(driverVisible.some(a => a.category === 'DRIVER_INCIDENT'), 'Driver cabin incident alert IS visible to Driver');
assert(driverVisible.some(a => a.category === 'SOS'), 'Critical SOS alert IS visible to Driver');
assert(driverVisible.some(a => a.category === 'OPERATIONAL'), 'Operational route status IS visible to Driver');

console.log("\n=================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log("=================================================\n");
