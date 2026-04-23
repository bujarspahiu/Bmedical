export const demoPatients = [
  { id: 'p1', firstName: 'Marco', lastName: 'Rossi', dob: '1985-03-12', gender: 'M', phone: '+39 340 1234567', email: 'marco.rossi@example.com', city: 'Milano', status: 'active', condition: 'Lower back pain', lastVisit: '2026-04-15' },
  { id: 'p2', firstName: 'Giulia', lastName: 'Bianchi', dob: '1992-07-24', gender: 'F', phone: '+39 333 7654321', email: 'giulia.b@example.com', city: 'Roma', status: 'active', condition: 'ACL rehabilitation', lastVisit: '2026-04-18' },
  { id: 'p3', firstName: 'Luca', lastName: 'Ferrari', dob: '1978-11-05', gender: 'M', phone: '+39 347 2233445', email: 'luca.f@example.com', city: 'Torino', status: 'active', condition: 'Shoulder impingement', lastVisit: '2026-04-20' },
  { id: 'p4', firstName: 'Sofia', lastName: 'Romano', dob: '1995-02-17', gender: 'F', phone: '+39 320 9988776', email: 'sofia.r@example.com', city: 'Milano', status: 'active', condition: 'Post-op knee', lastVisit: '2026-04-21' },
  { id: 'p5', firstName: 'Andrea', lastName: 'Conti', dob: '1968-09-30', gender: 'M', phone: '+39 335 5544332', email: 'andrea.c@example.com', city: 'Firenze', status: 'active', condition: 'Chronic cervical pain', lastVisit: '2026-04-10' },
  { id: 'p6', firstName: 'Francesca', lastName: 'Russo', dob: '1988-12-08', gender: 'F', phone: '+39 342 1122334', email: 'francesca.r@example.com', city: 'Bologna', status: 'active', condition: 'Sciatica', lastVisit: '2026-04-19' },
  { id: 'p7', firstName: 'Davide', lastName: 'Esposito', dob: '1972-06-22', gender: 'M', phone: '+39 349 7788990', email: 'davide.e@example.com', city: 'Napoli', status: 'inactive', condition: 'Rotator cuff', lastVisit: '2026-02-05' },
  { id: 'p8', firstName: 'Chiara', lastName: 'Ricci', dob: '2000-04-14', gender: 'F', phone: '+39 331 4455667', email: 'chiara.r@example.com', city: 'Milano', status: 'active', condition: 'Ankle sprain', lastVisit: '2026-04-21' },
];

export const demoAppointments = [
  { id: 'a1', patientId: 'p1', patientName: 'Marco Rossi', therapist: 'Dr. Elena Moretti', date: '2026-04-21', time: '09:00', duration: 45, service: 'Manual Therapy', status: 'completed', room: 'Room 1' },
  { id: 'a2', patientId: 'p4', patientName: 'Sofia Romano', therapist: 'Dr. Marco Bianchi', date: '2026-04-21', time: '10:00', duration: 60, service: 'Post-op Rehabilitation', status: 'in_treatment', room: 'Room 2' },
  { id: 'a3', patientId: 'p8', patientName: 'Chiara Ricci', therapist: 'Dr. Elena Moretti', date: '2026-04-21', time: '11:00', duration: 30, service: 'Electrotherapy', status: 'waiting', room: 'Room 1' },
  { id: 'a4', patientId: 'p3', patientName: 'Luca Ferrari', therapist: 'Dr. Sara Greco', date: '2026-04-21', time: '11:30', duration: 45, service: 'Physiotherapy Consultation', status: 'checked_in', room: 'Room 3' },
  { id: 'a5', patientId: 'p6', patientName: 'Francesca Russo', therapist: 'Dr. Marco Bianchi', date: '2026-04-21', time: '14:00', duration: 60, service: 'Sports Rehabilitation', status: 'confirmed', room: 'Room 2' },
  { id: 'a6', patientId: 'p5', patientName: 'Andrea Conti', therapist: 'Dr. Elena Moretti', date: '2026-04-21', time: '15:00', duration: 45, service: 'Manual Therapy', status: 'booked', room: 'Room 1' },
  { id: 'a7', patientId: 'p2', patientName: 'Giulia Bianchi', therapist: 'Dr. Sara Greco', date: '2026-04-21', time: '16:00', duration: 60, service: 'ACL Rehabilitation', status: 'booked', room: 'Room 3' },
  { id: 'a8', patientId: 'p1', patientName: 'Marco Rossi', therapist: 'Dr. Elena Moretti', date: '2026-04-22', time: '09:30', duration: 45, service: 'Follow-up Session', status: 'confirmed', room: 'Room 1' },
];

export const demoWaitingRoom = [
  { id: 'w1', patientName: 'Chiara Ricci', appointmentTime: '11:00', checkedInAt: '10:52', status: 'waiting', therapist: 'Dr. Elena Moretti', estWait: 8 },
  { id: 'w2', patientName: 'Luca Ferrari', appointmentTime: '11:30', checkedInAt: '11:18', status: 'waiting', therapist: 'Dr. Sara Greco', estWait: 15 },
  { id: 'w3', patientName: 'Sofia Romano', appointmentTime: '10:00', checkedInAt: '09:55', status: 'in_treatment', therapist: 'Dr. Marco Bianchi', estWait: 0 },
];

export const demoInvoices = [
  { id: 'inv1', number: 'INV-2026-0142', patientName: 'Marco Rossi', date: '2026-04-21', amount: 85.00, tax: 18.70, total: 103.70, status: 'paid', method: 'card' },
  { id: 'inv2', number: 'INV-2026-0141', patientName: 'Sofia Romano', date: '2026-04-20', amount: 120.00, tax: 26.40, total: 146.40, status: 'paid', method: 'cash' },
  { id: 'inv3', number: 'INV-2026-0140', patientName: 'Giulia Bianchi', date: '2026-04-19', amount: 450.00, tax: 99.00, total: 549.00, status: 'partial', method: 'bank_transfer' },
  { id: 'inv4', number: 'INV-2026-0139', patientName: 'Andrea Conti', date: '2026-04-18', amount: 85.00, tax: 18.70, total: 103.70, status: 'unpaid', method: 'pending' },
  { id: 'inv5', number: 'INV-2026-0138', patientName: 'Luca Ferrari', date: '2026-04-17', amount: 200.00, tax: 44.00, total: 244.00, status: 'paid', method: 'card' },
  { id: 'inv6', number: 'INV-2026-0137', patientName: 'Francesca Russo', date: '2026-04-16', amount: 150.00, tax: 33.00, total: 183.00, status: 'paid', method: 'cash' },
];

export const demoStaff = [
  { id: 's1', name: 'Dr. Elena Moretti', role: 'Clinic Owner', email: 'elena@medirehab.com', phone: '+39 340 1111111', status: 'active', sessionsThisMonth: 142 },
  { id: 's2', name: 'Dr. Marco Bianchi', role: 'Physiotherapist', email: 'marco@medirehab.com', phone: '+39 340 2222222', status: 'active', sessionsThisMonth: 118 },
  { id: 's3', name: 'Dr. Sara Greco', role: 'Physiotherapist', email: 'sara@medirehab.com', phone: '+39 340 3333333', status: 'active', sessionsThisMonth: 96 },
];

export const demoTenants = [
  { id: 't1', name: 'MediRehab Clinic', city: 'Milano', country: 'Italy', plan: 'enterprise', status: 'active', staffCount: 12, patientsCount: 847, mrr: 0, yearlyFee: 4800, joinedAt: '2025-01-14' },
  { id: 't2', name: 'San Raffaele Physio Center', city: 'Roma', country: 'Italy', plan: 'enterprise', status: 'active', staffCount: 24, patientsCount: 2140, mrr: 0, yearlyFee: 4800, joinedAt: '2024-11-02' },
  { id: 't3', name: 'FisioSport Torino', city: 'Torino', country: 'Italy', plan: 'professional', status: 'active', staffCount: 3, patientsCount: 156, mrr: 50, yearlyFee: 0, joinedAt: '2026-01-20' },
  { id: 't4', name: 'Rehab Napoli', city: 'Napoli', country: 'Italy', plan: 'professional', status: 'active', staffCount: 2, patientsCount: 98, mrr: 50, yearlyFee: 0, joinedAt: '2026-02-15' },
  { id: 't5', name: 'Ospedale Fisioterapico Bologna', city: 'Bologna', country: 'Italy', plan: 'enterprise', status: 'active', staffCount: 45, patientsCount: 3890, mrr: 0, yearlyFee: 7200, joinedAt: '2024-07-10' },
  { id: 't6', name: 'Centro Riabilitazione Firenze', city: 'Firenze', country: 'Italy', plan: 'professional', status: 'suspended', staffCount: 3, patientsCount: 72, mrr: 0, yearlyFee: 0, joinedAt: '2025-09-01' },
  { id: 't7', name: 'Studio Fisio Verona', city: 'Verona', country: 'Italy', plan: 'professional', status: 'active', staffCount: 2, patientsCount: 64, mrr: 50, yearlyFee: 0, joinedAt: '2026-03-05' },
  { id: 't8', name: 'Rehabilitation Hospital Genova', city: 'Genova', country: 'Italy', plan: 'enterprise', status: 'active', staffCount: 38, patientsCount: 2680, mrr: 0, yearlyFee: 7200, joinedAt: '2024-09-18' },
];

export const demoServices = [
  { id: 'sv1', name: 'Physiotherapy Consultation', category: 'Consultation', duration: 45, price: 60, vat: 22, active: true },
  { id: 'sv2', name: 'Manual Therapy', category: 'Therapy', duration: 45, price: 70, vat: 22, active: true },
  { id: 'sv3', name: 'Rehabilitation Therapy', category: 'Rehab', duration: 60, price: 85, vat: 22, active: true },
  { id: 'sv4', name: 'Sports Rehabilitation', category: 'Rehab', duration: 60, price: 95, vat: 22, active: true },
  { id: 'sv5', name: 'Electrotherapy', category: 'Therapy', duration: 30, price: 45, vat: 22, active: true },
  { id: 'sv6', name: 'Massage Therapy', category: 'Therapy', duration: 45, price: 55, vat: 22, active: true },
  { id: 'sv7', name: 'Post-operative Rehab', category: 'Rehab', duration: 60, price: 110, vat: 22, active: true },
  { id: 'sv8', name: 'Neurological Rehab', category: 'Specialty', duration: 60, price: 120, vat: 22, active: true },
];
