import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { z } from 'zod';

const { Pool } = pg;

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const patientDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const patientCreateSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(120),
  lastName: z.string().trim().min(1, 'Last name is required').max(120),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email('Invalid email address').max(160).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
  gender: z.string().trim().max(30).optional().nullable(),
  dob: patientDateSchema.optional().nullable(),
  condition: z.string().trim().max(4000).optional().nullable(),
});

const patientUpdateSchema = patientCreateSchema.extend({
  id: z.string().uuid('Invalid patient id'),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

const patientArchiveSchema = z.object({
  id: z.string().uuid('Invalid patient id'),
});

const appointmentDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const appointmentTimeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format');

const appointmentStatusSchema = z.enum([
  'booked',
  'confirmed',
  'checked_in',
  'waiting',
  'in_treatment',
  'completed',
  'canceled',
  'no_show',
]);

const appointmentListSchema = z.object({
  date: appointmentDateSchema,
});

const appointmentCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  therapistId: z.string().uuid('Invalid therapist id'),
  serviceId: z.string().uuid('Invalid service id'),
  date: appointmentDateSchema,
  time: appointmentTimeSchema,
  room: z.string().trim().min(1, 'Room is required').max(80),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const appointmentStatusUpdateSchema = z.object({
  id: z.string().uuid('Invalid appointment id'),
  status: appointmentStatusSchema,
});

const waitingRoomListSchema = z.object({
  date: appointmentDateSchema,
});

const waitingRoomCheckInSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment id'),
});

const waitingRoomStatusSchema = z.object({
  entryId: z.string().uuid('Invalid waiting room entry id'),
  status: z.enum(['waiting', 'in_treatment', 'completed', 'canceled']),
});

const dashboardSummarySchema = z.object({
  date: appointmentDateSchema,
});

const invoiceListSchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

const invoiceCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  serviceId: z.string().uuid('Invalid service id'),
  issuedAt: appointmentDateSchema,
  paymentMethod: z.string().trim().max(60).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const invoiceMarkPaidSchema = z.object({
  id: z.string().uuid('Invalid invoice id'),
  method: z.string().trim().min(1, 'Payment method is required').max(60),
});

const reportsSummarySchema = z.object({
  range: z.enum(['day', 'week', 'month', 'year', 'custom']),
});

const staffCreateSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(160),
  email: z.string().trim().email('Invalid email address').max(160),
  phone: z.string().trim().max(60).optional().nullable(),
  role: z.enum(['owner', 'physio', 'doctor', 'receptionist', 'accountant', 'assistant']),
  password: z.string().trim().min(6, 'Password must be at least 6 characters').max(120),
});

const settingsUpdateSchema = z.object({
  clinicName: z.string().trim().min(1, 'Clinic name is required').max(160),
  email: z.string().trim().email('Invalid email address').max(160),
  phone: z.string().trim().max(60).optional().nullable(),
  taxNumber: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  currency: z.string().trim().min(1).max(10),
  defaultVat: z.coerce.number().min(0).max(100),
});

const quotationListSchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

const quotationCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  serviceId: z.string().uuid('Invalid service id'),
  issuedAt: appointmentDateSchema,
  validUntil: appointmentDateSchema.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const dateTimeLocalSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date and time must be in YYYY-MM-DDTHH:MM format');

const anamnesisCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  therapistId: z.string().uuid('Invalid therapist id'),
  mainComplaint: z.string().trim().min(1, 'Main complaint is required').max(2000),
  painLocation: z.string().trim().max(300).optional().nullable(),
  painIntensity: z.coerce.number().int().min(0).max(10).optional().nullable(),
  symptomsDuration: z.string().trim().max(200).optional().nullable(),
  injuryHistory: z.string().trim().max(2000).optional().nullable(),
  medicalHistory: z.string().trim().max(4000).optional().nullable(),
  surgicalHistory: z.string().trim().max(4000).optional().nullable(),
  workFactors: z.string().trim().max(2000).optional().nullable(),
  sportFactors: z.string().trim().max(2000).optional().nullable(),
  mobilityLimits: z.string().trim().max(2000).optional().nullable(),
  observations: z.string().trim().max(4000).optional().nullable(),
  redFlags: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  isDraft: z.boolean().optional(),
});

const diagnosisCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  therapistId: z.string().uuid('Invalid therapist id'),
  icdCode: z.string().trim().max(40).optional().nullable(),
  label: z.string().trim().min(1, 'Diagnosis label is required').max(240),
  notes: z.string().trim().max(4000).optional().nullable(),
  diagnosedAt: appointmentDateSchema,
});

const treatmentPlanStatusSchema = z.enum(['active', 'completed', 'paused', 'canceled']);

const treatmentPlanCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  therapistId: z.string().uuid('Invalid therapist id'),
  title: z.string().trim().min(1, 'Plan title is required').max(240),
  goals: z.string().trim().max(4000).optional().nullable(),
  plannedSessions: z.coerce.number().int().min(1).max(200),
  techniques: z.string().trim().max(4000).optional().nullable(),
  homeExercises: z.string().trim().max(4000).optional().nullable(),
  startDate: appointmentDateSchema,
  endDate: appointmentDateSchema.optional().nullable(),
  status: treatmentPlanStatusSchema.optional(),
});

const treatmentSessionCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  therapistId: z.string().uuid('Invalid therapist id'),
  treatmentPlanId: z.string().uuid('Invalid treatment plan id').optional().nullable(),
  performedAt: dateTimeLocalSchema,
  duration: z.coerce.number().int().min(10).max(240),
  techniques: z.string().trim().min(1, 'Techniques are required').max(4000),
  bodyArea: z.string().trim().max(240).optional().nullable(),
  painBefore: z.coerce.number().int().min(0).max(10).optional().nullable(),
  painAfter: z.coerce.number().int().min(0).max(10).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  recommendations: z.string().trim().max(4000).optional().nullable(),
  followUpNeeded: z.boolean().optional(),
});

const reminderListSchema = z.object({
  status: z.enum(['pending', 'sent', 'canceled']).optional(),
});

const reminderCreateSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  type: z.enum(['appointment', 'follow_up', 'payment', 'reevaluation']),
  channel: z.enum(['email', 'sms']),
  scheduledAt: dateTimeLocalSchema,
  notes: z.string().trim().max(2000).optional().nullable(),
});

const reminderStatusUpdateSchema = z.object({
  id: z.string().uuid('Invalid reminder id'),
  status: z.enum(['pending', 'sent', 'canceled']),
});

const auditLogListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const adminTenantStatusSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant id'),
  status: z.enum(['active', 'suspended']),
});

const backupRunSchema = z.object({
  retentionDays: z.coerce.number().int().min(1).max(365).optional(),
});

const backupDeleteSchema = z.object({
  id: z.string().uuid('Invalid backup id'),
});

const backupScheduleUpsertSchema = z.object({
  id: z.string().uuid('Invalid schedule id').optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  hour: z.coerce.number().int().min(0).max(23),
  minute: z.coerce.number().int().min(0).max(59),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional().nullable(),
  dayOfMonth: z.coerce.number().int().min(1).max(28).optional().nullable(),
  retentionDays: z.coerce.number().int().min(1).max(365),
  isActive: z.boolean(),
});

const planCodeSchema = z.enum(['professional', 'enterprise']);
const billingCycleSchema = z.enum(['monthly', 'yearly']);

const signupRegisterSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(120),
  lastName: z.string().trim().min(1, 'Last name is required').max(120),
  email: z.string().trim().email('Invalid email address').max(160),
  phone: z.string().trim().min(1, 'Phone number is required').max(50),
  businessName: z.string().trim().max(180).optional().nullable(),
  password: z.string().trim().min(6, 'Password must be at least 6 characters').max(120),
  plan: planCodeSchema,
  billingCycle: billingCycleSchema.optional(),
  seatCount: z.coerce.number().int().min(1).max(250).optional(),
  agreedTerms: z.boolean().refine((value) => value === true, 'You must accept the terms to continue'),
});

const signupTokenSchema = z.object({
  token: z.string().trim().min(1, 'Missing checkout token'),
});

const signupPaymentSchema = z.object({
  token: z.string().trim().min(1, 'Missing checkout token'),
  method: z.enum(['bank_transfer', 'card', 'paypal']),
  billingCycle: billingCycleSchema,
  seatCount: z.coerce.number().int().min(1).max(250),
  bankRegion: z.enum(['kosovo', 'sepa']).optional().nullable(),
  paymentProofNote: z.string().trim().max(2000).optional().nullable(),
  cardholderName: z.string().trim().max(160).optional().nullable(),
  cardLast4: z.string().trim().regex(/^\d{4}$/, 'Card last 4 must contain exactly 4 digits').optional().nullable(),
  paypalEmail: z.string().trim().email('Invalid PayPal email').max(160).optional().nullable(),
});

const adminManualPaymentReviewSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction id'),
  decision: z.enum(['approve', 'reject']),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const adminPaymentSettingsSchema = z.object({
  bankKosovoProvider: z.string().trim().min(1).max(120),
  bankKosovoBeneficiary: z.string().trim().min(1).max(180),
  bankKosovoIban: z.string().trim().min(1).max(120),
  bankKosovoBic: z.string().trim().min(1).max(120),
  bankSepaProvider: z.string().trim().min(1).max(120),
  bankSepaBeneficiary: z.string().trim().min(1).max(180),
  bankSepaIban: z.string().trim().min(1).max(120),
  bankSepaBic: z.string().trim().min(1).max(120),
  bankReferencePrefix: z.string().trim().min(1).max(30),
  cardLabel: z.string().trim().min(1).max(120),
  cardHelpText: z.string().trim().min(1).max(1000),
  cardIsEnabled: z.boolean(),
  cardIsComingSoon: z.boolean(),
  paypalLabel: z.string().trim().min(1).max(120),
  paypalHelpText: z.string().trim().min(1).max(1000),
  paypalIsEnabled: z.boolean(),
  paypalIsComingSoon: z.boolean(),
});

const defaultServices = [
  { name: 'Initial Physiotherapy Consultation', category: 'Consultation', duration: 45, priceCents: 6000 },
  { name: 'Manual Therapy Session', category: 'Therapy', duration: 45, priceCents: 7000 },
  { name: 'Post-operative Rehabilitation', category: 'Rehabilitation', duration: 60, priceCents: 9500 },
  { name: 'Electrotherapy Session', category: 'Therapy', duration: 30, priceCents: 4500 },
];

function loadEnvFile() {
  if (process.env.DATABASE_URL) return;
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    console.warn('Could not load .env file:', error.message);
  }
}

loadEnvFile();

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const tokenSecret = process.env.JWT_SECRET || 'change-this-super-secret-key';
const cookieName = 'bmedical_token';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DB_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 15000),
  query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS || 15000),
});

const backupRootDir = path.resolve(process.cwd(), process.env.BACKUP_DIRECTORY || 'server/backups');
const backupJobLocks = new Set();
let backupSchedulerInterval = null;

const appBaseUrl = process.env.APP_BASE_URL || frontendOrigin;
const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFromEmail = process.env.RESEND_FROM_EMAIL || '';
const allowLocalVerificationLink = process.env.ALLOW_LOCAL_VERIFICATION_LINK === 'true' || process.env.NODE_ENV !== 'production';
const defaultBankDetails = {
  kosovo: {
    region: 'Kosovo',
    provider: process.env.BANK_PROVIDER_KOSOVO || 'Paysera',
    beneficiary: process.env.BANK_BENEFICIARY || 'BMedical',
    iban: process.env.BANK_IBAN_KOSOVO || 'XK000000000000000000',
    bic: process.env.BANK_BIC_KOSOVO || 'EUBKOXXXXXX',
    referencePrefix: process.env.BANK_REFERENCE_PREFIX || 'BMD',
  },
  sepa: {
    region: 'International / SEPA Zone',
    provider: process.env.BANK_PROVIDER_SEPA || 'Paysera',
    beneficiary: process.env.BANK_BENEFICIARY || 'BMedical',
    iban: process.env.BANK_IBAN_SEPA || 'LT000000000000000000',
    bic: process.env.BANK_BIC_SEPA || 'EVIULT2VXXX',
    referencePrefix: process.env.BANK_REFERENCE_PREFIX || 'BMD',
  },
};

const allowedOrigins = frontendOrigin.split(',').map((value) => value.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  return next(error);
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/admin/backups/:id/download', async (req, res) => {
  try {
    const session = await requireAdminSession(req);
    const backup = await getBackupDownloadRecord(req.params.id);
    if (!backup) throw new AppError(404, 'Backup not found');
    if (backup.status !== 'completed') throw new AppError(409, 'Backup is not ready for download');
    await fsp.access(backup.storagePath, fs.constants.R_OK);
    await insertAuditLog({
      userId: session.sub,
      actorType: 'platform_admin',
      action: 'download',
      entity: 'platform_backup',
      entityId: backup.id,
      metadata: { fileName: backup.fileName },
    });
    res.setHeader('Content-Type', backup.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
    res.setHeader('Content-Length', String(backup.fileSizeBytes || 0));
    await pipeline(fs.createReadStream(backup.storagePath), res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    const statusCode = error instanceof AppError ? error.status : 500;
    if (!res.headersSent) {
      res.status(statusCode).json({ error: message });
    }
  }
});

app.post('/api/physio', async (req, res) => {
  try {
    const { action, ...payload } = req.body || {};
    if (!action || typeof action !== 'string') {
      throw new AppError(400, 'Missing API action');
    }
    switch (action) {
      case 'me': {
        const session = await readSession(req);
        if (!session) return res.json({ user: null });
        return res.json({ user: await loadUserForSession(session) });
      }
      case 'logout': {
        clearAuthCookie(res);
        return res.json({ success: true });
      }
      case 'admin_login': {
        const user = await loginPlatformAdmin(payload.email, payload.password);
        return writeAuthResponse(res, user);
      }
      case 'login': {
        const user = await loginTenantUser(payload.email, payload.password);
        return writeAuthResponse(res, user);
      }
      case 'register': {
        return res.status(201).json(await registerTenant(payload));
      }
      case 'signup_verify': {
        return res.json(await verifySignupRegistration(payload));
      }
      case 'signup_checkout_get': {
        return res.json(await getSignupCheckout(payload));
      }
      case 'signup_payment_submit': {
        return res.status(201).json(await submitSignupPayment(payload));
      }
      case 'patients_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ patients: await listPatients(tenant.tenantId) });
      }
      case 'patient_create': {
        const tenant = await requireTenantSession(req);
        const patient = await createPatient(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'patient', entityId: patient.id, metadata: { patientName: `${patient.firstName} ${patient.lastName}` } });
        return res.status(201).json({ patient });
      }
      case 'patient_update': {
        const tenant = await requireTenantSession(req);
        const patient = await updatePatient(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'update', entity: 'patient', entityId: patient.id, metadata: { status: patient.status } });
        return res.json({ patient });
      }
      case 'patient_archive': {
        const tenant = await requireTenantSession(req);
        await archivePatient(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'archive', entity: 'patient', entityId: payload.id, metadata: {} });
        return res.json({ success: true });
      }
      case 'appointments_resources': {
        const tenant = await requireTenantSession(req);
        return res.json(await getAppointmentResources(tenant.tenantId));
      }
      case 'appointments_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ appointments: await listAppointments(tenant.tenantId, payload) });
      }
      case 'appointment_create': {
        const tenant = await requireTenantSession(req);
        const appointment = await createAppointment(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'appointment', entityId: appointment.id, metadata: { patientId: appointment.patientId, therapistId: appointment.therapistId, date: appointment.date, time: appointment.time } });
        return res.status(201).json({ appointment });
      }
      case 'appointment_update_status': {
        const tenant = await requireTenantSession(req);
        const appointment = await updateAppointmentStatus(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'update_status', entity: 'appointment', entityId: appointment.id, metadata: { status: appointment.status } });
        return res.json({ appointment });
      }
      case 'waiting_room_list': {
        const tenant = await requireTenantSession(req);
        return res.json(await listWaitingRoom(tenant.tenantId, payload));
      }
      case 'waiting_room_check_in': {
        const tenant = await requireTenantSession(req);
        const entry = await checkInWaitingRoom(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'check_in', entity: 'waiting_room', entityId: entry.id, metadata: { appointmentId: entry.appointmentId, status: entry.status } });
        return res.status(201).json({ entry });
      }
      case 'waiting_room_update_status': {
        const tenant = await requireTenantSession(req);
        const entry = await updateWaitingRoomStatus(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'update_status', entity: 'waiting_room', entityId: entry.id, metadata: { status: entry.status } });
        return res.json({ entry });
      }
      case 'dashboard_summary': {
        const tenant = await requireTenantSession(req);
        return res.json(await getDashboardSummary(tenant.tenantId, payload));
      }
      case 'invoices_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ invoices: await listInvoices(tenant.tenantId, payload) });
      }
      case 'invoice_create': {
        const tenant = await requireTenantSession(req);
        const invoice = await createInvoice(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'invoice', entityId: invoice.id, metadata: { number: invoice.number, total: invoice.total } });
        return res.status(201).json({ invoice });
      }
      case 'invoice_mark_paid': {
        const tenant = await requireTenantSession(req);
        const invoice = await markInvoicePaid(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'mark_paid', entity: 'invoice', entityId: invoice.id, metadata: { method: invoice.method } });
        return res.json({ invoice });
      }
      case 'reports_summary': {
        const tenant = await requireTenantSession(req);
        return res.json(await getReportsSummary(tenant.tenantId, payload));
      }
      case 'staff_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ staff: await listStaff(tenant.tenantId) });
      }
      case 'staff_create': {
        const tenant = await requireTenantSession(req);
        const staffMember = await createStaffMember(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'staff', entityId: staffMember.id, metadata: { role: staffMember.role, email: staffMember.email } });
        return res.status(201).json({ staffMember });
      }
      case 'settings_get': {
        const tenant = await requireTenantSession(req);
        return res.json({ settings: await getClinicSettings(tenant.tenantId) });
      }
      case 'settings_update': {
        const tenant = await requireTenantSession(req);
        const settings = await updateClinicSettings(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'update', entity: 'clinic_settings', metadata: { currency: settings.currency, defaultVat: settings.defaultVat } });
        return res.json({ settings });
      }
      case 'quotations_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ quotations: await listQuotations(tenant.tenantId, payload) });
      }
      case 'quotation_create': {
        const tenant = await requireTenantSession(req);
        const quotation = await createQuotation(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'quotation', entityId: quotation.id, metadata: { number: quotation.number, total: quotation.total } });
        return res.status(201).json({ quotation });
      }
      case 'anamnesis_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ records: await listAnamnesisRecords(tenant.tenantId) });
      }
      case 'anamnesis_create': {
        const tenant = await requireTenantSession(req);
        const record = await createAnamnesisRecord(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'anamnesis', entityId: record.id, metadata: { patientId: record.patientId, isDraft: record.isDraft } });
        return res.status(201).json({ record });
      }
      case 'diagnoses_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ records: await listDiagnoses(tenant.tenantId) });
      }
      case 'diagnosis_create': {
        const tenant = await requireTenantSession(req);
        const record = await createDiagnosis(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'diagnosis', entityId: record.id, metadata: { patientId: record.patientId, icdCode: record.icdCode } });
        return res.status(201).json({ record });
      }
      case 'treatment_plans_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ plans: await listTreatmentPlans(tenant.tenantId) });
      }
      case 'treatment_plan_create': {
        const tenant = await requireTenantSession(req);
        const plan = await createTreatmentPlan(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'treatment_plan', entityId: plan.id, metadata: { patientId: plan.patientId, plannedSessions: plan.plannedSessions } });
        return res.status(201).json({ plan });
      }
      case 'treatment_sessions_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ sessions: await listTreatmentSessions(tenant.tenantId) });
      }
      case 'treatment_session_create': {
        const tenant = await requireTenantSession(req);
        const sessionRecord = await createTreatmentSession(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'treatment_session', entityId: sessionRecord.id, metadata: { patientId: sessionRecord.patientId, treatmentPlanId: sessionRecord.treatmentPlanId } });
        return res.status(201).json({ session: sessionRecord });
      }
      case 'reminders_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ reminders: await listReminders(tenant.tenantId, payload) });
      }
      case 'reminder_create': {
        const tenant = await requireTenantSession(req);
        const reminder = await createReminder(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'create', entity: 'reminder', entityId: reminder.id, metadata: { patientId: reminder.patientId, type: reminder.type, channel: reminder.channel } });
        return res.status(201).json({ reminder });
      }
      case 'reminder_update_status': {
        const tenant = await requireTenantSession(req);
        const reminder = await updateReminderStatus(tenant.tenantId, payload);
        await insertAuditLog({ tenantId: tenant.tenantId, userId: tenant.sub, actorType: 'tenant_user', action: 'update_status', entity: 'reminder', entityId: reminder.id, metadata: { status: reminder.status } });
        return res.json({ reminder });
      }
      case 'audit_logs_list': {
        const tenant = await requireTenantSession(req);
        return res.json({ logs: await listAuditLogs(tenant.tenantId, payload) });
      }
      case 'admin_tenants_overview': {
        const session = await requireAdminSession(req);
        return res.json(await getAdminTenantsOverview(session.sub));
      }
      case 'admin_tenant_update_status': {
        const session = await requireAdminSession(req);
        const tenant = await updateAdminTenantStatus(payload);
        await insertAuditLog({ userId: session.sub, actorType: 'platform_admin', action: 'update_status', entity: 'tenant', entityId: tenant.id, metadata: { status: tenant.status } });
        return res.json({ tenant });
      }
      case 'admin_backups_overview': {
        await requireAdminSession(req);
        return res.json(await getBackupsOverview());
      }
      case 'admin_backup_run_now': {
        const session = await requireAdminSession(req);
        const backup = await createPlatformBackup({ initiatedBy: session.sub, triggerType: 'manual', payload });
        await insertAuditLog({ userId: session.sub, actorType: 'platform_admin', action: 'create', entity: 'platform_backup', entityId: backup.id, metadata: { status: backup.status, triggerType: backup.triggerType } });
        return res.status(201).json({ backup });
      }
      case 'admin_backup_delete': {
        const session = await requireAdminSession(req);
        const backup = await deletePlatformBackup(payload);
        await insertAuditLog({ userId: session.sub, actorType: 'platform_admin', action: 'delete', entity: 'platform_backup', entityId: backup.id, metadata: { fileName: backup.fileName } });
        return res.json({ backup });
      }
      case 'admin_backup_schedule_upsert': {
        const session = await requireAdminSession(req);
        const schedule = await upsertBackupSchedule(session.sub, payload);
        await insertAuditLog({ userId: session.sub, actorType: 'platform_admin', action: 'upsert', entity: 'platform_backup_schedule', entityId: schedule.id, metadata: { frequency: schedule.frequency, isActive: schedule.isActive } });
        return res.json({ schedule });
      }
      case 'admin_billing_overview': {
        await requireAdminSession(req);
        return res.json(await getAdminBillingOverview());
      }
      case 'admin_manual_payment_review': {
        const session = await requireAdminSession(req);
        const result = await reviewManualPayment(session.sub, payload);
        await insertAuditLog({ userId: session.sub, actorType: 'platform_admin', action: 'review', entity: 'platform_payment', entityId: result.transaction.id, metadata: { decision: result.decision, tenantId: result.transaction.tenantId } });
        return res.json(result);
      }
      case 'admin_payment_settings_update': {
        const session = await requireAdminSession(req);
        const settings = await updateAdminPaymentSettings(payload);
        await insertAuditLog({ userId: session.sub, actorType: 'platform_admin', action: 'update', entity: 'platform_payment_settings', entityId: 'global', metadata: { updated: true } });
        return res.json({ settings });
      }
      default:
        return res.status(400).json({ error: 'Unsupported action' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    const statusCode = error instanceof AppError
      ? error.status
      : message.toLowerCase().includes('invalid') || message.toLowerCase().includes('missing')
        ? 400
        : 500;
    return res.status(statusCode).json({ error: message });
  }
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

const server = app.listen(port, async () => {
  try {
    await ensureSuperAdmin();
    await ensureBackupInfrastructure();
    await ensureCommerceInfrastructure();
    startBackupScheduler();
    console.log(`BMedical API listening on port ${port}`);
  } catch (error) {
    console.error('API started but super admin bootstrap failed:', error.message);
  }
});

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received, closing BMedical API gracefully...`);
  stopBackupScheduler();
  server.close(async () => {
    try {
      await pool.end();
      console.log('HTTP server and PostgreSQL pool closed.');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');
        if (separatorIndex === -1) return [part, ''];
        return [part.slice(0, separatorIndex), decodeURIComponent(part.slice(separatorIndex + 1))];
      }),
  );
}

function getToken(req) {
  const cookies = parseCookies(req);
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : '';
  const queryToken = req.query?._token;
  return req.headers['x-physio-token'] || cookies[cookieName] || bearer || req.body?._token || queryToken || '';
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', tokenSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', tokenSecret).update(body).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

async function readSession(req) {
  const token = getToken(req);
  return verifyToken(token);
}

async function requireTenantSession(req) {
  const session = await readSession(req);
  if (!session) throw new AppError(401, 'Unauthorized');
  if (session.isAdmin) throw new AppError(403, 'Admins cannot access tenant patient data');
  if (!session.tenantId) throw new AppError(401, 'Missing tenant context');
  return session;
}

async function requireAdminSession(req) {
  const session = await readSession(req);
  if (!session) throw new AppError(401, 'Unauthorized');
  if (!session.isAdmin) throw new AppError(403, 'Admin access required');
  return session;
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure ? '; Secure' : ''}`);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function issueSession(user) {
  return signToken({
    sub: user.id,
    email: user.email,
    tenantId: user.tenantId,
    isAdmin: Boolean(user.isAdmin),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
}

function writeAuthResponse(res, user) {
  const token = issueSession(user);
  setAuthCookie(res, token);
  res.json({ user, token });
}

function mapTenantUser(row) {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role_code,
    tenantId: row.tenant_id,
    tenantName: row.business_name,
    plan: row.plan_code || 'professional',
  };
}

function mapAdminUser(row) {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: 'owner',
    tenantId: 'platform-admin',
    tenantName: 'BMedical Platform',
    plan: 'enterprise',
    isAdmin: true,
  };
}

async function loadUserForSession(session) {
  if (session.isAdmin) {
    const result = await pool.query(
      'SELECT id, email, full_name FROM platform_admins WHERE id = $1 AND is_active = TRUE',
      [session.sub],
    );
    return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
  }

  const result = await pool.query(
    `SELECT tu.id, tu.email, tu.full_name, tu.tenant_id, r.code AS role_code,
            t.business_name, COALESCE(sp.code, 'professional') AS plan_code
     FROM tenant_users tu
     JOIN roles r ON r.id = tu.role_id
     JOIN tenants t ON t.id = tu.tenant_id
     LEFT JOIN subscription_plans sp ON sp.id = t.current_plan_id
     WHERE tu.id = $1 AND tu.is_active = TRUE`,
    [session.sub],
  );
  return result.rows[0] ? mapTenantUser(result.rows[0]) : null;
}

async function loginPlatformAdmin(email, password) {
  if (!email || !password) throw new Error('Missing admin credentials');
  await ensureSuperAdmin();
  const result = await pool.query(
    'SELECT id, email, full_name, password_hash FROM platform_admins WHERE email = $1 AND is_active = TRUE',
    [String(email).trim().toLowerCase()],
  );
  const admin = result.rows[0];
  if (!admin) throw new Error('Invalid admin credentials');
  const matches = await bcrypt.compare(String(password), admin.password_hash);
  if (!matches) throw new Error('Invalid admin credentials');
  await insertAuditLog({
    actorType: 'platform_admin',
    userId: admin.id,
    action: 'login',
    entity: 'platform_admin',
    entityId: admin.id,
    metadata: { email: admin.email },
  });
  return mapAdminUser(admin);
}

async function loginTenantUser(email, password) {
  if (!email || !password) throw new Error('Missing user credentials');
  const result = await pool.query(
    `SELECT tu.id, tu.email, tu.full_name, tu.password_hash, tu.tenant_id, r.code AS role_code,
            t.business_name, COALESCE(sp.code, 'professional') AS plan_code
     FROM tenant_users tu
     JOIN roles r ON r.id = tu.role_id
     JOIN tenants t ON t.id = tu.tenant_id
     LEFT JOIN subscription_plans sp ON sp.id = t.current_plan_id
     WHERE tu.email = $1 AND tu.is_active = TRUE AND t.status = 'active'`,
    [String(email).trim().toLowerCase()],
  );
  const user = result.rows[0];
  if (!user) throw new Error('Invalid login credentials');
  const matches = await bcrypt.compare(String(password), user.password_hash);
  if (!matches) throw new Error('Invalid login credentials');
  await pool.query('UPDATE tenant_users SET last_login_at = NOW() WHERE id = $1', [user.id]);
  await insertAuditLog({
    actorType: 'tenant_user',
    tenantId: user.tenant_id,
    userId: user.id,
    action: 'login',
    entity: 'tenant_user',
    entityId: user.id,
    metadata: { email: user.email },
  });
  return mapTenantUser(user);
}

async function registerTenant(payload) {
  const parsed = signupRegisterSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid registration payload');
  }

  const input = parsed.data;
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(String(input.password), 12);
  const ownerName = `${input.firstName} ${input.lastName}`.trim();
  const businessName = normalizeOptionalText(input.businessName) || `${ownerName} Practice`;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const roleResult = await client.query("SELECT id FROM roles WHERE code = 'owner'");
    if (!roleResult.rows[0]) throw new Error('Owner role is missing. Run the schema seed first.');

    const planCode = input.plan;
    const planResult = await client.query(
      `SELECT id, code
       FROM subscription_plans
       WHERE code = $1
         AND is_active = TRUE`,
      [planCode],
    );
    if (!planResult.rows[0]) throw new Error('Selected subscription plan is not available');

    const tenantResult = await client.query(
      `INSERT INTO tenants (
         business_name, owner_name, email, phone, address, city, country, tax_number, type, current_plan_id, status, billing_cycle
       ) VALUES ($1, $2, $3, $4, NULL, NULL, 'Kosovo', NULL, $5, $6, 'pending_verification', 'monthly')
       RETURNING id, business_name`,
      [
        businessName,
        ownerName,
        email,
        input.phone || null,
        planCode === 'enterprise' ? 'hospital' : 'clinic',
        planResult.rows[0]?.id || null,
      ],
    );

    const tenant = tenantResult.rows[0];
    const userResult = await client.query(
      `INSERT INTO tenant_users (tenant_id, email, password_hash, full_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, tenant_id`,
      [
        tenant.id,
        email,
        passwordHash,
        ownerName,
        input.phone || null,
        roleResult.rows[0].id,
      ],
    );

    const verification = await createSignupVerification(client, {
      tenantId: tenant.id,
      email,
      ownerName,
      planCode,
      billingCycle: input.billingCycle || 'monthly',
      seatCount: input.seatCount || 1,
    });

    await client.query(
      `INSERT INTO audit_logs (tenant_id, user_id, actor_type, action, entity, entity_id, metadata)
       VALUES ($1, $2, 'tenant_user', 'register_pending', 'tenant', $1, $3::jsonb)`,
      [tenant.id, userResult.rows[0].id, JSON.stringify({ email, planCode })],
    );

    await client.query(
      `INSERT INTO clinic_settings (tenant_id, currency, default_vat, working_hours)
       VALUES ($1, 'EUR', 22.00, $2::jsonb)`,
      [tenant.id, JSON.stringify(defaultWorkingHours())],
    );

    await seedDefaultServices(client, tenant.id);

    await client.query('COMMIT');

    await sendSignupVerificationEmail({
      to: email,
      ownerName,
      businessName: tenant.business_name,
      verificationUrl: verification.url,
      expiresAt: verification.expiresAt,
      planCode,
    });

    return {
      email,
      tenantId: tenant.id,
      tenantName: tenant.business_name,
      plan: planResult.rows[0]?.code || 'professional',
      verificationRequired: true,
      verificationUrl: allowLocalVerificationLink ? verification.url : undefined,
      verificationExpiresAt: verification.expiresAt,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23505' || String(error.message).includes('duplicate key')) {
      throw new Error('An account with this email already exists');
    }
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSuperAdmin() {
  const email = String(process.env.SUPERADMIN_EMAIL || 'admin@bmedical.com').trim().toLowerCase();
  const password = String(process.env.SUPERADMIN_PASSWORD || 'admin@bmedical.com');
  const fullName = process.env.SUPERADMIN_NAME || 'BMedical Super Admin';

  const existsResult = await pool.query('SELECT 1 FROM platform_admins WHERE email = $1', [email]);
  if (existsResult.rows[0]) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO platform_admins (email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, TRUE)`,
    [email, passwordHash, fullName],
  );
}

async function ensureCommerceInfrastructure() {
  await pool.query(`
    ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
  `);
  await pool.query(`
    ALTER TABLE subscription_plans
      ADD COLUMN IF NOT EXISTS monthly_price_cents INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS yearly_price_cents INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS included_users INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS extra_user_monthly_cents INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS extra_user_yearly_cents INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS summary TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS signup_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'signup_verification',
      expires_at TIMESTAMPTZ NOT NULL,
      verified_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_payment_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      customer_email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      plan_code TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      seat_count INTEGER NOT NULL DEFAULT 1,
      included_users INTEGER NOT NULL DEFAULT 1,
      extra_users INTEGER NOT NULL DEFAULT 0,
      base_amount_cents INTEGER NOT NULL DEFAULT 0,
      extra_users_amount_cents INTEGER NOT NULL DEFAULT 0,
      total_amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      method TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_manual_review',
      bank_region TEXT,
      reference_code TEXT,
      proof_note TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      approved_by UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES subscription_plans(id),
      status TEXT NOT NULL DEFAULT 'active',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      current_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      current_end TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      renews_at TIMESTAMPTZ,
      seat_count INTEGER NOT NULL DEFAULT 1,
      total_amount_cents INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_payment_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_tenant_unique ON subscriptions(tenant_id)`);

  await pool.query(`
    UPDATE subscription_plans
       SET monthly_price_cents = CASE code
         WHEN 'professional' THEN 2000
         WHEN 'enterprise' THEN 5000
         ELSE monthly_price_cents
       END,
           yearly_price_cents = CASE code
         WHEN 'professional' THEN 20000
         WHEN 'enterprise' THEN 50000
         ELSE yearly_price_cents
       END,
           included_users = 1,
           extra_user_monthly_cents = CASE code
         WHEN 'professional' THEN 2000
         WHEN 'enterprise' THEN 5000
         ELSE extra_user_monthly_cents
       END,
           extra_user_yearly_cents = CASE code
         WHEN 'professional' THEN 20000
         WHEN 'enterprise' THEN 50000
         ELSE extra_user_yearly_cents
       END,
           summary = CASE code
         WHEN 'professional' THEN 'Clinic / Ordinance'
         WHEN 'enterprise' THEN 'Hospital / Multi-location'
         ELSE summary
       END,
           price_cents = CASE code
         WHEN 'professional' THEN 2000
         WHEN 'enterprise' THEN 5000
         ELSE price_cents
       END
     WHERE code IN ('professional', 'enterprise')
  `);
}

async function ensureBackupInfrastructure() {
  await fsp.mkdir(backupRootDir, { recursive: true });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_backups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      schedule_id UUID,
      backup_kind TEXT NOT NULL DEFAULT 'database',
      engine TEXT NOT NULL DEFAULT 'json_snapshot',
      format TEXT NOT NULL DEFAULT 'json.gz',
      status TEXT NOT NULL DEFAULT 'pending',
      file_name TEXT,
      storage_path TEXT,
      content_type TEXT,
      file_size_bytes BIGINT NOT NULL DEFAULT 0,
      retention_days INTEGER NOT NULL DEFAULT 14,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      error_message TEXT,
      created_by UUID REFERENCES platform_admins(id) ON DELETE SET NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_backup_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      frequency TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      day_of_week INTEGER,
      day_of_month INTEGER,
      retention_days INTEGER NOT NULL DEFAULT 14,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE platform_backup_schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_backup_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      backup_id UUID REFERENCES platform_backups(id) ON DELETE CASCADE,
      schedule_id UUID REFERENCES platform_backup_schedules(id) ON DELETE SET NULL,
      level TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function startBackupScheduler() {
  if (backupSchedulerInterval) return;
  backupSchedulerInterval = setInterval(() => {
    void runDueBackupSchedules();
  }, 60_000);
  void runDueBackupSchedules();
}

function stopBackupScheduler() {
  if (!backupSchedulerInterval) return;
  clearInterval(backupSchedulerInterval);
  backupSchedulerInterval = null;
}

async function runDueBackupSchedules() {
  try {
    const result = await pool.query(
      `SELECT id
       FROM platform_backup_schedules
       WHERE is_active = TRUE
         AND next_run_at <= NOW()
       ORDER BY next_run_at ASC`,
    );
    for (const row of result.rows) {
      if (backupJobLocks.has(`schedule:${row.id}`)) continue;
      backupJobLocks.add(`schedule:${row.id}`);
      try {
        await createPlatformBackup({ triggerType: 'scheduled', scheduleId: row.id });
        await bumpScheduleAfterRun(row.id);
      } catch (error) {
        await appendBackupLog({
          scheduleId: row.id,
          level: 'error',
          message: error instanceof Error ? error.message : 'Scheduled backup failed',
        });
      } finally {
        backupJobLocks.delete(`schedule:${row.id}`);
      }
    }
  } catch (error) {
    console.error('Backup scheduler failed:', error instanceof Error ? error.message : error);
  }
}

async function sendSignupVerificationEmail({ to, ownerName, businessName, verificationUrl, expiresAt, planCode }) {
  if (!resendApiKey || !resendFromEmail) {
    console.warn('Resend is not configured. Verification email was not sent.');
    return { delivered: false, reason: 'missing_resend_configuration' };
  }

  const planLabel = planCode === 'enterprise' ? 'Enterprise' : 'Professional';
  const expiresLabel = new Date(expiresAt).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; background: #f8fbfd; padding: 32px; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1E4057 0%, #2C5F7C 55%, #6AA6B9 100%); color: white; padding: 28px 32px;">
          <div style="font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.78;">BMedical</div>
          <h1 style="margin: 10px 0 0; font-size: 28px; line-height: 1.2;">Verify your email to continue</h1>
          <p style="margin: 12px 0 0; font-size: 15px; line-height: 1.7; opacity: 0.88;">
            Your workspace is almost ready. One quick verification keeps the checkout calm and secure.
          </p>
        </div>
        <div style="padding: 32px;">
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7;">Hello ${escapeHtml(ownerName)},</p>
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7;">
            We prepared your <strong>${escapeHtml(planLabel)}</strong> workspace for <strong>${escapeHtml(businessName)}</strong>.
            Please verify this email before continuing to the payment page.
          </p>
          <div style="margin: 28px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: #2C5F7C; color: white; text-decoration: none; padding: 14px 22px; border-radius: 14px; font-weight: 600;">
              Verify email and continue
            </a>
          </div>
          <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.7; color: #475569;">
            This verification link expires on <strong>${escapeHtml(expiresLabel)}</strong>.
          </p>
          <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.7; color: #475569;">
            If the button above does not open, copy this link into your browser:
          </p>
          <p style="margin: 0; padding: 14px; background: #f8fafc; border-radius: 14px; font-size: 13px; line-height: 1.7; color: #0f172a; word-break: break-all;">
            ${escapeHtml(verificationUrl)}
          </p>
        </div>
      </div>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [to],
      subject: 'Verify your BMedical workspace email',
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.error('Resend delivery failed:', errorBody || response.statusText);
    throw new AppError(502, 'Verification email could not be delivered');
  }

  return { delivered: true };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function createSignupVerification(client, { tenantId, email, ownerName, planCode, billingCycle, seatCount }) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const token = signToken({
    type: 'signup_verification',
    tenantId,
    email,
    exp: expiresAt.getTime(),
  });
  const tokenHash = hashOpaqueToken(token);

  await client.query(
    `INSERT INTO signup_verifications (tenant_id, email, token_hash, purpose, expires_at, metadata)
     VALUES ($1, $2, $3, 'signup_verification', $4, $5::jsonb)`,
    [tenantId, email, tokenHash, expiresAt.toISOString(), JSON.stringify({ ownerName, planCode, billingCycle, seatCount })],
  );

  return {
    token,
    url: `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`,
    expiresAt: expiresAt.toISOString(),
  };
}

function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function loadSignupContext(token, { allowPendingVerification = false } = {}) {
  const parsed = signupTokenSchema.safeParse({ token });
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid verification token');

  const signedPayload = verifyToken(parsed.data.token);
  if (!signedPayload || signedPayload.type !== 'signup_verification') {
    throw new AppError(400, 'Verification link is invalid or has expired');
  }

  const tokenHash = hashOpaqueToken(parsed.data.token);
  const verificationResult = await pool.query(
    `SELECT sv.id, sv.tenant_id, sv.email, sv.expires_at, sv.verified_at, sv.metadata,
            t.business_name, t.owner_name, t.phone, t.status,
            COALESCE(sp.code, 'professional') AS plan_code,
            COALESCE(sp.name, 'Professional') AS plan_name,
            tu.id AS owner_user_id
     FROM signup_verifications sv
     JOIN tenants t ON t.id = sv.tenant_id
     LEFT JOIN subscription_plans sp ON sp.id = t.current_plan_id
     LEFT JOIN tenant_users tu ON tu.tenant_id = t.id
     LEFT JOIN roles r ON r.id = tu.role_id
     WHERE sv.token_hash = $1
       AND sv.purpose = 'signup_verification'
       AND (r.code = 'owner' OR r.code IS NULL)
     ORDER BY tu.created_at ASC NULLS LAST
     LIMIT 1`,
    [tokenHash],
  );

  const context = verificationResult.rows[0];
  if (!context) throw new AppError(404, 'Verification session was not found');
  if (new Date(context.expires_at).getTime() < Date.now()) {
    throw new AppError(410, 'Verification session has expired');
  }
  if (!allowPendingVerification && context.status === 'pending_verification') {
    throw new AppError(409, 'Email verification must be completed first');
  }

  return {
    token: parsed.data.token,
    verificationId: context.id,
    tenantId: context.tenant_id,
    email: context.email,
    businessName: context.business_name,
    ownerName: context.owner_name,
    phone: context.phone || '',
    status: context.status,
    planCode: context.plan_code || 'professional',
    planName: context.plan_name || 'Professional',
    ownerUserId: context.owner_user_id || null,
    verifiedAt: context.verified_at,
    initialBillingCycle: context.metadata?.billingCycle || 'monthly',
    initialSeatCount: Number(context.metadata?.seatCount || 1),
  };
}

async function verifySignupRegistration(payload) {
  const context = await loadSignupContext(payload.token, { allowPendingVerification: true });

  if (context.status === 'pending_verification') {
    await pool.query(
      `UPDATE tenants
          SET status = 'verified_unpaid',
              verified_at = NOW()
        WHERE id = $1`,
      [context.tenantId],
    );
    await pool.query(
      `UPDATE signup_verifications
          SET verified_at = COALESCE(verified_at, NOW())
        WHERE id = $1`,
      [context.verificationId],
    );
    await insertAuditLog({
      tenantId: context.tenantId,
      userId: context.ownerUserId,
      actorType: 'tenant_user',
      action: 'verify_email',
      entity: 'tenant',
      entityId: context.tenantId,
      metadata: { email: context.email },
    });
  }

  return getSignupCheckout(payload);
}

async function getSignupCheckout(payload) {
  const context = await loadSignupContext(payload.token, { allowPendingVerification: false });
  const pricingRules = await getPricingRules();
  const selectedRule = pricingRules.find((rule) => rule.code === context.planCode) || pricingRules[0] || null;
  const paymentSettings = await getAdminPaymentSettings();

  return {
    token: context.token,
    tenant: {
      tenantId: context.tenantId,
      businessName: context.businessName,
      ownerName: context.ownerName,
      email: context.email,
      phone: context.phone,
      status: context.status,
      plan: context.planCode,
    },
    selectedPlan: selectedRule,
    pricingRules,
    initialBillingCycle: context.initialBillingCycle,
    initialSeatCount: context.initialSeatCount,
    bankDetails: buildBankDetails(context.tenantId, paymentSettings),
  };
}

function buildBankDetails(tenantId, paymentSettings) {
  const reference = `BMD-${String(tenantId).slice(0, 8).toUpperCase()}`;
  return {
    kosovo: {
      region: 'Kosovo',
      provider: paymentSettings.bankKosovoProvider,
      beneficiary: paymentSettings.bankKosovoBeneficiary,
      iban: paymentSettings.bankKosovoIban,
      bic: paymentSettings.bankKosovoBic,
      referencePrefix: paymentSettings.bankReferencePrefix,
      reference,
      paymentDescription: `BMedical subscription - ${reference}`,
      verificationWindow: 'Up to 3 business days',
    },
    sepa: {
      region: 'International / SEPA Zone',
      provider: paymentSettings.bankSepaProvider,
      beneficiary: paymentSettings.bankSepaBeneficiary,
      iban: paymentSettings.bankSepaIban,
      bic: paymentSettings.bankSepaBic,
      referencePrefix: paymentSettings.bankReferencePrefix,
      reference,
      paymentDescription: `BMedical subscription - ${reference}`,
      verificationWindow: 'Up to 3 business days',
    },
  };
}

async function submitSignupPayment(payload) {
  const parsed = signupPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid payment request');
  }

  const input = parsed.data;
  const context = await loadSignupContext(input.token, { allowPendingVerification: false });
  const pricingRules = await getPricingRules();
  const pricingRule = pricingRules.find((rule) => rule.code === context.planCode);
  if (!pricingRule) throw new AppError(404, 'Pricing rule not found');
  if (input.method !== 'bank_transfer') {
    throw new AppError(409, 'This payment method is not live yet');
  }

  const includedUsers = pricingRule.includedUsers;
  const extraUsers = Math.max(0, input.seatCount - includedUsers);
  const baseAmountCents = input.billingCycle === 'yearly' ? pricingRule.yearlyPriceCents : pricingRule.monthlyPriceCents;
  const extraUsersAmountCents = extraUsers * (input.billingCycle === 'yearly' ? pricingRule.extraUserYearlyCents : pricingRule.extraUserMonthlyCents);
  const totalAmountCents = baseAmountCents + extraUsersAmountCents;
  const isInstant = false;
  const transactionStatus = isInstant ? 'completed' : 'pending_manual_review';
  const tenantStatus = isInstant ? 'active' : 'payment_pending_manual_review';
  const referenceCode = `${input.method.slice(0, 2).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const transactionResult = await client.query(
      `INSERT INTO platform_payment_transactions (
         tenant_id, customer_email, customer_name, plan_code, billing_cycle, seat_count,
         included_users, extra_users, base_amount_cents, extra_users_amount_cents, total_amount_cents,
         currency, method, provider, status, bank_region, reference_code, proof_note, metadata
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11,
         'EUR', $12, $13, $14, $15, $16, $17, $18::jsonb
       )
       RETURNING id, tenant_id, customer_email, customer_name, plan_code, billing_cycle, seat_count, total_amount_cents, method, status, created_at`,
      [
        context.tenantId,
        context.email,
        context.ownerName,
        pricingRule.code,
        input.billingCycle,
        input.seatCount,
        includedUsers,
        extraUsers,
        baseAmountCents,
        extraUsersAmountCents,
        totalAmountCents,
        input.method,
        input.method === 'bank_transfer' ? `bank_${input.bankRegion || 'kosovo'}` : input.method,
        transactionStatus,
        input.bankRegion || null,
        referenceCode,
        normalizeOptionalText(input.paymentProofNote),
        JSON.stringify({
          cardholderName: normalizeOptionalText(input.cardholderName),
          cardLast4: normalizeOptionalText(input.cardLast4),
          paypalEmail: normalizeOptionalText(input.paypalEmail),
        }),
      ],
    );

    await client.query(
      `UPDATE tenants
          SET status = $2,
              billing_cycle = $3,
              activated_at = CASE WHEN $2 = 'active' THEN NOW() ELSE activated_at END
        WHERE id = $1`,
      [context.tenantId, tenantStatus, input.billingCycle],
    );

    if (isInstant) {
      await upsertTenantSubscription(client, {
        tenantId: context.tenantId,
        planId: pricingRule.id,
        billingCycle: input.billingCycle,
        seatCount: input.seatCount,
        totalAmountCents,
      });
    }

    await client.query('COMMIT');

    const transaction = transactionResult.rows[0];
    await insertAuditLog({
      tenantId: context.tenantId,
      userId: context.ownerUserId,
      actorType: 'tenant_user',
      action: 'payment_submit',
      entity: 'platform_payment',
      entityId: transaction.id,
      metadata: { method: input.method, status: transactionStatus, billingCycle: input.billingCycle, seatCount: input.seatCount },
    });

    return {
      transaction: mapPlatformTransaction(transaction),
      accountStatus: tenantStatus,
      loginReady: isInstant,
      nextStepMessage: isInstant ? 'Payment confirmed. Your workspace is now active.' : 'Bank transfer received. We will verify the payment within 3 business days.',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function upsertTenantSubscription(client, { tenantId, planId, billingCycle, seatCount, totalAmountCents }) {
  if (!planId) throw new AppError(404, 'Subscription plan is missing');
  const now = new Date();
  const currentEnd = new Date(now);
  if (billingCycle === 'yearly') currentEnd.setFullYear(currentEnd.getFullYear() + 1);
  else currentEnd.setMonth(currentEnd.getMonth() + 1);

  await client.query(
    `INSERT INTO subscriptions (
       tenant_id, plan_id, status, billing_cycle, current_start, current_end, renews_at, seat_count, total_amount_cents
     ) VALUES ($1, $2, 'active', $3, NOW(), $4, $4, $5, $6)
     ON CONFLICT (tenant_id)
     DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       status = 'active',
       billing_cycle = EXCLUDED.billing_cycle,
       current_start = NOW(),
       current_end = EXCLUDED.current_end,
       renews_at = EXCLUDED.renews_at,
       seat_count = EXCLUDED.seat_count,
       total_amount_cents = EXCLUDED.total_amount_cents`,
    [tenantId, planId, billingCycle, currentEnd.toISOString(), seatCount, totalAmountCents],
  );
}

async function getBackupsOverview() {
  const [backupsResult, schedulesResult, logsResult] = await Promise.all([
    pool.query(
      `SELECT id, trigger_type, schedule_id, backup_kind, engine, format, status, file_name, file_size_bytes,
              retention_days,
              TO_CHAR(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
              TO_CHAR(completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS completed_at,
              error_message
       FROM platform_backups
       ORDER BY started_at DESC
       LIMIT 25`,
    ),
    pool.query(
      `SELECT id, frequency, hour, minute, day_of_week, day_of_month, retention_days, is_active,
              TO_CHAR(last_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_run_at,
              TO_CHAR(next_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS next_run_at
       FROM platform_backup_schedules
       ORDER BY created_at ASC, next_run_at ASC`,
    ),
    pool.query(
      `SELECT id, backup_id, schedule_id, level, message,
              TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
       FROM platform_backup_logs
       ORDER BY created_at DESC
       LIMIT 30`,
    ),
  ]);

  const backups = backupsResult.rows.map((row) => ({
    id: row.id,
    triggerType: row.trigger_type,
    scheduleId: row.schedule_id,
    backupKind: row.backup_kind,
    engine: row.engine,
    format: row.format,
    status: row.status,
    fileName: row.file_name,
    fileSizeBytes: Number(row.file_size_bytes || 0),
    retentionDays: row.retention_days,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    downloadPath: row.status === 'completed' ? `/admin/backups/${row.id}/download` : null,
  }));

  const schedules = schedulesResult.rows.map((row) => ({
    id: row.id,
    frequency: row.frequency,
    hour: row.hour,
    minute: row.minute,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    retentionDays: row.retention_days,
    isActive: row.is_active,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
  }));

  const logs = logsResult.rows.map((row) => ({
    id: row.id,
    backupId: row.backup_id,
    scheduleId: row.schedule_id,
    level: row.level,
    message: row.message,
    createdAt: row.created_at,
  }));

  const latestCompleted = backups.find((item) => item.status === 'completed') || null;
  return {
    backups,
    schedules,
    logs,
    summary: {
      totalBackups: backups.length,
      latestCompletedAt: latestCompleted?.completedAt || null,
      latestCompletedSizeBytes: latestCompleted?.fileSizeBytes || 0,
      activeSchedules: schedules.filter((item) => item.isActive).length,
    },
  };
}

async function createPlatformBackup({ initiatedBy = null, triggerType, scheduleId = null, payload = {} }) {
  const parsed = backupRunSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid backup request');
  }

  if (backupJobLocks.has('backup:platform')) {
    throw new AppError(409, 'A platform backup is already running');
  }
  backupJobLocks.add('backup:platform');

  const retentionDays = parsed.data.retentionDays || 14;
  let backupId = null;
  try {
    const inserted = await pool.query(
      `INSERT INTO platform_backups (trigger_type, schedule_id, retention_days, created_by, status)
       VALUES ($1, $2, $3, $4, 'running')
       RETURNING id`,
      [triggerType, scheduleId, retentionDays, initiatedBy],
    );
    backupId = inserted.rows[0].id;
    await appendBackupLog({ backupId, scheduleId, message: 'Backup job started' });

    const artifact = await buildDatabaseBackupArtifact();
    await pool.query(
      `UPDATE platform_backups
          SET engine = $2,
              format = $3,
              status = 'completed',
              file_name = $4,
              storage_path = $5,
              content_type = $6,
              file_size_bytes = $7,
              completed_at = NOW(),
              error_message = NULL
        WHERE id = $1`,
      [backupId, artifact.engine, artifact.format, artifact.fileName, artifact.storagePath, artifact.contentType, artifact.fileSizeBytes],
    );
    await appendBackupLog({ backupId, scheduleId, message: `Backup completed using ${artifact.engine}` });
    await enforceBackupRetention(retentionDays);
    return (await getBackupsOverview()).backups.find((item) => item.id === backupId);
  } catch (error) {
    if (backupId) {
      await pool.query(
        `UPDATE platform_backups
            SET status = 'failed',
                completed_at = NOW(),
                error_message = $2
          WHERE id = $1`,
        [backupId, error instanceof Error ? error.message : 'Backup failed'],
      ).catch(() => {});
      await appendBackupLog({
        backupId,
        scheduleId,
        level: 'error',
        message: error instanceof Error ? error.message : 'Backup failed',
      });
    }
    throw error;
  } finally {
    backupJobLocks.delete('backup:platform');
  }
}

async function deletePlatformBackup(payload) {
  const parsed = backupDeleteSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid backup delete request');
  }
  const backup = await getBackupDownloadRecord(parsed.data.id);
  if (!backup) throw new AppError(404, 'Backup not found');
  if (backup.storagePath) {
    await fsp.rm(backup.storagePath, { force: true }).catch(() => {});
  }
  await pool.query('DELETE FROM platform_backups WHERE id = $1', [parsed.data.id]);
  return backup;
}

async function upsertBackupSchedule(userId, payload) {
  const parsed = backupScheduleUpsertSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid backup schedule');
  }
  const input = parsed.data;
  if (input.frequency === 'weekly' && (input.dayOfWeek === null || input.dayOfWeek === undefined)) {
    throw new AppError(400, 'Weekly schedules require a day of week');
  }
  if (input.frequency === 'monthly' && (input.dayOfMonth === null || input.dayOfMonth === undefined)) {
    throw new AppError(400, 'Monthly schedules require a day of month');
  }
  const nextRunAt = computeNextRunAt(input).toISOString();
  let result;
  if (input.id) {
    result = await pool.query(
      `UPDATE platform_backup_schedules
          SET frequency = $2,
              hour = $3,
              minute = $4,
              day_of_week = $5,
              day_of_month = $6,
              retention_days = $7,
              is_active = $8,
              next_run_at = $9::timestamptz,
              updated_at = NOW()
        WHERE id = $1
        RETURNING id, frequency, hour, minute, day_of_week, day_of_month, retention_days, is_active,
                  TO_CHAR(last_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_run_at,
                  TO_CHAR(next_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS next_run_at`,
      [input.id, input.frequency, input.hour, input.minute, input.dayOfWeek ?? null, input.dayOfMonth ?? null, input.retentionDays, input.isActive, nextRunAt],
    );
    if (!result.rows[0]) throw new AppError(404, 'Backup schedule not found');
  } else {
    result = await pool.query(
      `INSERT INTO platform_backup_schedules (
         frequency, hour, minute, day_of_week, day_of_month, retention_days, is_active, next_run_at, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9)
       RETURNING id, frequency, hour, minute, day_of_week, day_of_month, retention_days, is_active,
                 TO_CHAR(last_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_run_at,
                 TO_CHAR(next_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS next_run_at`,
      [input.frequency, input.hour, input.minute, input.dayOfWeek ?? null, input.dayOfMonth ?? null, input.retentionDays, input.isActive, nextRunAt, userId],
    );
  }
  const row = result.rows[0];
  return {
    id: row.id,
    frequency: row.frequency,
    hour: row.hour,
    minute: row.minute,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    retentionDays: row.retention_days,
    isActive: row.is_active,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
  };
}

async function bumpScheduleAfterRun(scheduleId) {
  const scheduleResult = await pool.query(
    `SELECT id, frequency, hour, minute, day_of_week, day_of_month, retention_days, is_active
     FROM platform_backup_schedules
     WHERE id = $1`,
    [scheduleId],
  );
  const schedule = scheduleResult.rows[0];
  if (!schedule) return;
  const nextRunAt = computeNextRunAt({
    frequency: schedule.frequency,
    hour: schedule.hour,
    minute: schedule.minute,
    dayOfWeek: schedule.day_of_week,
    dayOfMonth: schedule.day_of_month,
    retentionDays: schedule.retention_days,
    isActive: schedule.is_active,
  }).toISOString();
  await pool.query(
    `UPDATE platform_backup_schedules
        SET last_run_at = NOW(),
            next_run_at = $2::timestamptz,
            updated_at = NOW()
      WHERE id = $1`,
    [scheduleId, nextRunAt],
  );
}

function computeNextRunAt(input) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(input.hour, input.minute, 0, 0);

  if (input.frequency === 'daily') {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  if (input.frequency === 'weekly') {
    const dayOfWeek = input.dayOfWeek ?? 0;
    const current = next.getUTCDay();
    let delta = dayOfWeek - current;
    if (delta < 0 || (delta === 0 && next <= now)) delta += 7;
    next.setUTCDate(next.getUTCDate() + delta);
    return next;
  }

  const dayOfMonth = input.dayOfMonth ?? 1;
  next.setUTCDate(dayOfMonth);
  if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

async function buildDatabaseBackupArtifact() {
  await fsp.mkdir(backupRootDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const pgDumpPath = await resolvePgDumpPath();
  if (pgDumpPath) {
    return createPgDumpBackup(pgDumpPath, stamp);
  }
  return createJsonSnapshotBackup(stamp);
}

async function resolvePgDumpPath() {
  const configured = process.env.PG_DUMP_PATH;
  if (configured && fs.existsSync(configured)) return configured;
  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      ]
    : ['/usr/bin/pg_dump', '/usr/local/bin/pg_dump'];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function createPgDumpBackup(pgDumpPath, stamp) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new AppError(500, 'DATABASE_URL is not configured');
  const connection = new URL(databaseUrl);
  const dbName = connection.pathname.replace(/^\//, '');
  const fileName = `BMedical-db-${stamp}.dump`;
  const storagePath = path.join(backupRootDir, fileName);
  const args = [
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--file', storagePath,
    '--host', connection.hostname,
    '--port', connection.port || '5432',
    '--username', decodeURIComponent(connection.username),
    dbName,
  ];
  await runProcess(pgDumpPath, args, {
    ...process.env,
    PGPASSWORD: decodeURIComponent(connection.password),
  });
  const stats = await fsp.stat(storagePath);
  return {
    engine: 'pg_dump',
    format: 'dump',
    fileName,
    storagePath,
    contentType: 'application/octet-stream',
    fileSizeBytes: stats.size,
  };
}

async function createJsonSnapshotBackup(stamp) {
  const fileName = `BMedical-db-${stamp}.json.gz`;
  const storagePath = path.join(backupRootDir, fileName);
  const snapshot = await exportDatabaseSnapshot();
  const payload = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8');
  const compressed = zlib.gzipSync(payload, { level: 9 });
  await fsp.writeFile(storagePath, compressed);
  return {
    engine: 'json_snapshot',
    format: 'json.gz',
    fileName,
    storagePath,
    contentType: 'application/gzip',
    fileSizeBytes: compressed.byteLength,
  };
}

async function exportDatabaseSnapshot() {
  const tablesResult = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
     ORDER BY table_name ASC`,
  );
  const tables = {};
  for (const row of tablesResult.rows) {
    const tableName = row.table_name;
    const data = await pool.query(`SELECT * FROM ${escapeIdentifier(tableName)}`);
    tables[tableName] = data.rows;
  }
  return {
    exportedAt: new Date().toISOString(),
    node: os.hostname(),
    database: maskDatabaseName(process.env.DATABASE_URL || ''),
    tables,
  };
}

function escapeIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function maskDatabaseName(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return 'bmedical';
  }
}

function runProcess(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new AppError(500, stderr.trim() || `${path.basename(command)} failed with code ${code}`));
    });
  });
}

async function enforceBackupRetention(retentionDays) {
  const result = await pool.query(
    `SELECT id
     FROM platform_backups
     WHERE status = 'completed'
       AND completed_at < NOW() - ($1::text || ' days')::interval`,
    [retentionDays],
  );
  for (const row of result.rows) {
    await deletePlatformBackup({ id: row.id }).catch(() => {});
  }
}

async function appendBackupLog({ backupId = null, scheduleId = null, level = 'info', message }) {
  await pool.query(
    `INSERT INTO platform_backup_logs (backup_id, schedule_id, level, message)
     VALUES ($1, $2, $3, $4)`,
    [backupId, scheduleId, level, message],
  ).catch(() => {});
}

async function getBackupDownloadRecord(id) {
  const result = await pool.query(
    `SELECT id, file_name, storage_path, content_type, file_size_bytes, status
     FROM platform_backups
     WHERE id = $1`,
    [id],
  );
  return result.rows[0]
    ? {
        id: result.rows[0].id,
        fileName: result.rows[0].file_name,
        storagePath: result.rows[0].storage_path,
        contentType: result.rows[0].content_type,
        fileSizeBytes: Number(result.rows[0].file_size_bytes || 0),
        status: result.rows[0].status,
      }
    : null;
}

async function insertAuditLog({ tenantId = null, userId = null, actorType, action, entity, entityId = null, metadata = {} }) {
  await pool.query(
    `INSERT INTO audit_logs (tenant_id, user_id, actor_type, action, entity, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [tenantId, userId, actorType, action, entity, entityId, JSON.stringify(metadata)],
  ).catch(() => {});
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

async function seedDefaultServices(client, tenantId) {
  for (const service of defaultServices) {
    await client.query(
      `INSERT INTO services (tenant_id, name, category, duration_min, price_cents, vat_rate, is_active)
       VALUES ($1, $2, $3, $4, $5, 22.00, TRUE)`,
      [tenantId, service.name, service.category, service.duration, service.priceCents],
    );
  }
}

function defaultWorkingHours() {
  return [
    { day: 'Mon', open: '08:00', close: '19:00', enabled: true },
    { day: 'Tue', open: '08:00', close: '19:00', enabled: true },
    { day: 'Wed', open: '08:00', close: '19:00', enabled: true },
    { day: 'Thu', open: '08:00', close: '19:00', enabled: true },
    { day: 'Fri', open: '08:00', close: '19:00', enabled: true },
    { day: 'Sat', open: '08:00', close: '13:00', enabled: true },
    { day: 'Sun', open: '00:00', close: '00:00', enabled: false },
  ];
}

function mapPatientRow(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.date_of_birth,
    gender: row.gender || '',
    phone: row.phone || '',
    email: row.email || '',
    city: row.city || '',
    address: row.address || '',
    status: row.status,
    condition: row.notes || '',
    lastVisit: row.last_visit || null,
    createdAt: row.created_at,
  };
}

async function listPatients(tenantId) {
  const result = await pool.query(
    `SELECT p.id,
            p.first_name,
            p.last_name,
            p.date_of_birth,
            p.gender,
            p.phone,
            p.email,
            p.city,
            p.address,
            p.status,
            p.notes,
            p.created_at,
            MAX(a.starts_at)::date AS last_visit
     FROM patients p
     LEFT JOIN appointments a
       ON a.patient_id = p.id
      AND a.tenant_id = p.tenant_id
      AND a.status = 'completed'
     WHERE p.tenant_id = $1
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [tenantId],
  );

  return result.rows.map(mapPatientRow);
}

async function createPatient(tenantId, payload) {
  const parsed = patientCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid patient data');
  }

  const input = parsed.data;
  const result = await pool.query(
    `INSERT INTO patients (
       tenant_id, first_name, last_name, date_of_birth, gender, phone, email, address, city, notes, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
     RETURNING id, first_name, last_name, date_of_birth, gender, phone, email, city, address, status, notes, created_at`,
    [
      tenantId,
      input.firstName,
      input.lastName,
      input.dob || null,
      normalizeOptionalText(input.gender),
      normalizeOptionalText(input.phone),
      normalizeOptionalText(input.email),
      normalizeOptionalText(input.address),
      normalizeOptionalText(input.city),
      normalizeOptionalText(input.condition),
    ],
  );

  return mapPatientRow(result.rows[0]);
}

async function updatePatient(tenantId, payload) {
  const parsed = patientUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid patient data');
  }

  const input = parsed.data;
  const result = await pool.query(
    `UPDATE patients
        SET first_name = $3,
            last_name = $4,
            date_of_birth = $5,
            gender = $6,
            phone = $7,
            email = $8,
            address = $9,
            city = $10,
            notes = $11,
            status = COALESCE($12, status)
      WHERE tenant_id = $1
        AND id = $2
    RETURNING id, first_name, last_name, date_of_birth, gender, phone, email, city, address, status, notes, created_at`,
    [
      tenantId,
      input.id,
      input.firstName,
      input.lastName,
      input.dob || null,
      normalizeOptionalText(input.gender),
      normalizeOptionalText(input.phone),
      normalizeOptionalText(input.email),
      normalizeOptionalText(input.address),
      normalizeOptionalText(input.city),
      normalizeOptionalText(input.condition),
      input.status || null,
    ],
  );

  if (!result.rows[0]) throw new AppError(404, 'Patient not found');
  return mapPatientRow(result.rows[0]);
}

async function archivePatient(tenantId, payload) {
  const parsed = patientArchiveSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid patient id');
  }

  const result = await pool.query(
    `UPDATE patients
        SET status = 'archived'
      WHERE tenant_id = $1
        AND id = $2
      RETURNING id`,
    [tenantId, parsed.data.id],
  );

  if (!result.rows[0]) throw new AppError(404, 'Patient not found');
}

function mapAppointmentRow(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    therapistId: row.therapist_id,
    therapist: row.therapist_name,
    date: row.date,
    time: row.time,
    duration: row.duration_min,
    serviceId: row.service_id,
    service: row.service_name || 'Custom service',
    status: row.status,
    room: row.room || '',
    notes: row.notes || '',
  };
}

async function ensureTenantServices(tenantId) {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS count FROM services WHERE tenant_id = $1',
    [tenantId],
  );

  if (result.rows[0]?.count > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedDefaultServices(client, tenantId);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getAppointmentResources(tenantId) {
  await ensureTenantServices(tenantId);

  const [patientsResult, staffResult, servicesResult] = await Promise.all([
    pool.query(
      `SELECT id, first_name, last_name, status
       FROM patients
       WHERE tenant_id = $1
         AND status <> 'archived'
       ORDER BY first_name, last_name`,
      [tenantId],
    ),
    pool.query(
      `SELECT tu.id, tu.full_name, r.code AS role_code
       FROM tenant_users tu
       JOIN roles r ON r.id = tu.role_id
       WHERE tu.tenant_id = $1
         AND tu.is_active = TRUE
       ORDER BY tu.full_name`,
      [tenantId],
    ),
    pool.query(
      `SELECT id, name, category, duration_min, price_cents
       FROM services
       WHERE tenant_id = $1
         AND is_active = TRUE
       ORDER BY name`,
      [tenantId],
    ),
  ]);

  return {
    patients: patientsResult.rows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      status: row.status,
    })),
    staff: staffResult.rows.map((row) => ({
      id: row.id,
      name: row.full_name,
      role: row.role_code,
    })),
    services: servicesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category || '',
      duration: row.duration_min,
      price: Number(row.price_cents) / 100,
    })),
  };
}

async function listAppointments(tenantId, payload) {
  const parsed = appointmentListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid date');
  }

  const result = await pool.query(
    `SELECT a.id,
            a.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            a.therapist_id,
            tu.full_name AS therapist_name,
            a.service_id,
            s.name AS service_name,
            a.duration_min,
            a.status,
            a.room,
            a.notes,
            TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
            TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS time
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
     JOIN tenant_users tu ON tu.id = a.therapist_id AND tu.tenant_id = a.tenant_id
     LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1
       AND (a.starts_at AT TIME ZONE 'UTC')::date = $2::date
     ORDER BY a.starts_at ASC`,
    [tenantId, parsed.data.date],
  );

  return result.rows.map(mapAppointmentRow);
}

async function createAppointment(tenantId, payload) {
  const parsed = appointmentCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid appointment data');
  }

  await ensureTenantServices(tenantId);
  const input = parsed.data;

  const [patientCheck, therapistCheck, serviceCheck] = await Promise.all([
    pool.query(
      `SELECT id FROM patients
       WHERE tenant_id = $1
         AND id = $2
         AND status <> 'archived'`,
      [tenantId, input.patientId],
    ),
    pool.query(
      `SELECT id FROM tenant_users
       WHERE tenant_id = $1
         AND id = $2
         AND is_active = TRUE`,
      [tenantId, input.therapistId],
    ),
    pool.query(
      `SELECT id, duration_min FROM services
       WHERE tenant_id = $1
         AND id = $2
         AND is_active = TRUE`,
      [tenantId, input.serviceId],
    ),
  ]);

  if (!patientCheck.rows[0]) throw new AppError(404, 'Patient not found');
  if (!therapistCheck.rows[0]) throw new AppError(404, 'Therapist not found');
  if (!serviceCheck.rows[0]) throw new AppError(404, 'Service not found');

  const startsAt = `${input.date}T${input.time}:00Z`;
  const duration = serviceCheck.rows[0].duration_min;

  const conflictResult = await pool.query(
    `SELECT id
     FROM appointments
     WHERE tenant_id = $1
       AND therapist_id = $2
       AND status <> 'canceled'
       AND starts_at = $3::timestamptz
     LIMIT 1`,
    [tenantId, input.therapistId, startsAt],
  );

  if (conflictResult.rows[0]) {
    throw new AppError(409, 'This therapist already has an appointment at the selected time');
  }

  const result = await pool.query(
    `INSERT INTO appointments (
       tenant_id, patient_id, therapist_id, service_id, room, starts_at, duration_min, status, notes
     ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, 'booked', $8)
     RETURNING id`,
    [
      tenantId,
      input.patientId,
      input.therapistId,
      input.serviceId,
      input.room,
      startsAt,
      duration,
      normalizeOptionalText(input.notes),
    ],
  );

  const created = await pool.query(
    `SELECT a.id,
            a.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            a.therapist_id,
            tu.full_name AS therapist_name,
            a.service_id,
            s.name AS service_name,
            a.duration_min,
            a.status,
            a.room,
            a.notes,
            TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
            TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS time
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
     JOIN tenant_users tu ON tu.id = a.therapist_id AND tu.tenant_id = a.tenant_id
     LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1
       AND a.id = $2`,
    [tenantId, result.rows[0].id],
  );

  return mapAppointmentRow(created.rows[0]);
}

async function updateAppointmentStatus(tenantId, payload) {
  const parsed = appointmentStatusUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid appointment update');
  }

  const result = await pool.query(
    `UPDATE appointments
        SET status = $3
      WHERE tenant_id = $1
        AND id = $2
      RETURNING id`,
    [tenantId, parsed.data.id, parsed.data.status],
  );

  if (!result.rows[0]) throw new AppError(404, 'Appointment not found');

  await syncWaitingRoomWithAppointmentStatus(tenantId, parsed.data.id, parsed.data.status);

  const updated = await pool.query(
    `SELECT a.id,
            a.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            a.therapist_id,
            tu.full_name AS therapist_name,
            a.service_id,
            s.name AS service_name,
            a.duration_min,
            a.status,
            a.room,
            a.notes,
            TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
            TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS time
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
     JOIN tenant_users tu ON tu.id = a.therapist_id AND tu.tenant_id = a.tenant_id
     LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1
       AND a.id = $2`,
    [tenantId, parsed.data.id],
  );

  return mapAppointmentRow(updated.rows[0]);
}

function mapWaitingRoomRow(row) {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    patientName: row.patient_name,
    appointmentTime: row.appointment_time,
    checkedInAt: row.checked_in_at_time,
    status: row.status,
    therapist: row.therapist_name,
    estWait: row.est_wait_min || 0,
  };
}

async function listWaitingRoom(tenantId, payload) {
  const parsed = waitingRoomListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid waiting room date');
  }

  const [entriesResult, candidatesResult] = await Promise.all([
    pool.query(
      `SELECT w.id,
              w.appointment_id,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS appointment_time,
              TO_CHAR(w.checked_in_at AT TIME ZONE 'UTC', 'HH24:MI') AS checked_in_at_time,
              w.status,
              tu.full_name AS therapist_name,
              w.est_wait_min
       FROM waiting_room_entries w
       JOIN appointments a ON a.id = w.appointment_id AND a.tenant_id = w.tenant_id
       JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
       JOIN tenant_users tu ON tu.id = a.therapist_id AND tu.tenant_id = a.tenant_id
       WHERE w.tenant_id = $1
         AND (a.starts_at AT TIME ZONE 'UTC')::date = $2::date
       ORDER BY w.checked_in_at DESC`,
      [tenantId, parsed.data.date],
    ),
    pool.query(
      `SELECT a.id,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS appointment_time,
              s.name AS service_name,
              tu.full_name AS therapist_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
       JOIN tenant_users tu ON tu.id = a.therapist_id AND tu.tenant_id = a.tenant_id
       LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
       LEFT JOIN waiting_room_entries w ON w.appointment_id = a.id AND w.tenant_id = a.tenant_id
       WHERE a.tenant_id = $1
         AND (a.starts_at AT TIME ZONE 'UTC')::date = $2::date
         AND a.status IN ('booked', 'confirmed')
         AND w.id IS NULL
       ORDER BY a.starts_at ASC`,
      [tenantId, parsed.data.date],
    ),
  ]);

  return {
    entries: entriesResult.rows.map(mapWaitingRoomRow),
    candidates: candidatesResult.rows.map((row) => ({
      id: row.id,
      patientName: row.patient_name,
      appointmentTime: row.appointment_time,
      service: row.service_name || 'Custom service',
      therapist: row.therapist_name,
    })),
  };
}

async function checkInWaitingRoom(tenantId, payload) {
  const parsed = waitingRoomCheckInSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid appointment id');
  }

  const appointmentResult = await pool.query(
    `SELECT id
     FROM appointments
     WHERE tenant_id = $1
       AND id = $2`,
    [tenantId, parsed.data.appointmentId],
  );

  if (!appointmentResult.rows[0]) throw new AppError(404, 'Appointment not found');

  const existing = await pool.query(
    `SELECT id FROM waiting_room_entries
     WHERE tenant_id = $1
       AND appointment_id = $2`,
    [tenantId, parsed.data.appointmentId],
  );

  if (existing.rows[0]) {
    await pool.query(
      `UPDATE appointments
          SET status = 'waiting'
        WHERE tenant_id = $1
          AND id = $2`,
      [tenantId, parsed.data.appointmentId],
    );
    await pool.query(
      `UPDATE waiting_room_entries
          SET status = 'waiting',
              checked_in_at = NOW(),
              est_wait_min = COALESCE(est_wait_min, 10),
              updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2`,
      [tenantId, existing.rows[0].id],
    );
    return getWaitingRoomEntryById(tenantId, existing.rows[0].id);
  }

  await pool.query(
    `UPDATE appointments
        SET status = 'waiting'
      WHERE tenant_id = $1
        AND id = $2`,
    [tenantId, parsed.data.appointmentId],
  );

  const result = await pool.query(
    `INSERT INTO waiting_room_entries (tenant_id, appointment_id, checked_in_at, status, est_wait_min, updated_at)
     VALUES ($1, $2, NOW(), 'waiting', 10, NOW())
     RETURNING id`,
    [tenantId, parsed.data.appointmentId],
  );

  return getWaitingRoomEntryById(tenantId, result.rows[0].id);
}

async function updateWaitingRoomStatus(tenantId, payload) {
  const parsed = waitingRoomStatusSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid waiting room update');
  }

  const appointmentStatusMap = {
    waiting: 'waiting',
    in_treatment: 'in_treatment',
    completed: 'completed',
    canceled: 'canceled',
  };

  const result = await pool.query(
    `UPDATE waiting_room_entries
        SET status = $3,
            est_wait_min = CASE WHEN $3 = 'waiting' THEN COALESCE(est_wait_min, 10) ELSE 0 END,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
      RETURNING appointment_id`,
    [tenantId, parsed.data.entryId, parsed.data.status],
  );

  if (!result.rows[0]) throw new AppError(404, 'Waiting room entry not found');

  await pool.query(
    `UPDATE appointments
        SET status = $3
      WHERE tenant_id = $1
        AND id = $2`,
    [tenantId, result.rows[0].appointment_id, appointmentStatusMap[parsed.data.status]],
  );

  return getWaitingRoomEntryById(tenantId, parsed.data.entryId);
}

async function getWaitingRoomEntryById(tenantId, entryId) {
  const result = await pool.query(
    `SELECT w.id,
            w.appointment_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS appointment_time,
            TO_CHAR(w.checked_in_at AT TIME ZONE 'UTC', 'HH24:MI') AS checked_in_at_time,
            w.status,
            tu.full_name AS therapist_name,
            w.est_wait_min
     FROM waiting_room_entries w
     JOIN appointments a ON a.id = w.appointment_id AND a.tenant_id = w.tenant_id
     JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
     JOIN tenant_users tu ON tu.id = a.therapist_id AND tu.tenant_id = a.tenant_id
     WHERE w.tenant_id = $1
       AND w.id = $2`,
    [tenantId, entryId],
  );

  if (!result.rows[0]) throw new AppError(404, 'Waiting room entry not found');
  return mapWaitingRoomRow(result.rows[0]);
}

async function syncWaitingRoomWithAppointmentStatus(tenantId, appointmentId, status) {
  if (!['waiting', 'in_treatment', 'completed', 'canceled', 'checked_in'].includes(status)) return;

  const waitingStatus = status === 'checked_in' ? 'waiting' : status;
  const existing = await pool.query(
    `SELECT id
     FROM waiting_room_entries
     WHERE tenant_id = $1
       AND appointment_id = $2`,
    [tenantId, appointmentId],
  );

  if (!existing.rows[0]) {
    if (waitingStatus === 'waiting' || waitingStatus === 'in_treatment') {
      await pool.query(
        `INSERT INTO waiting_room_entries (tenant_id, appointment_id, checked_in_at, status, est_wait_min, updated_at)
         VALUES ($1, $2, NOW(), $3, $4, NOW())`,
        [tenantId, appointmentId, waitingStatus, waitingStatus === 'waiting' ? 10 : 0],
      );
    }
    return;
  }

  await pool.query(
    `UPDATE waiting_room_entries
        SET status = $3,
            est_wait_min = CASE WHEN $3 = 'waiting' THEN COALESCE(est_wait_min, 10) ELSE 0 END,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2`,
    [tenantId, existing.rows[0].id, waitingStatus],
  );
}

async function getDashboardSummary(tenantId, payload) {
  const parsed = dashboardSummarySchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid dashboard date');
  }

  const date = parsed.data.date;
  const [metricsResult, upcomingResult, waitingResult, servicesResult, staffResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE (a.starts_at AT TIME ZONE 'UTC')::date = $2::date) AS appointments_today,
         COUNT(DISTINCT a.patient_id) FILTER (WHERE (a.starts_at AT TIME ZONE 'UTC')::date = $2::date) AS patients_today,
         COUNT(*) FILTER (
           WHERE (a.starts_at AT TIME ZONE 'UTC')::date = $2::date
             AND a.status = 'completed'
         ) AS completed_today,
         COALESCE(SUM(i.total_cents) FILTER (WHERE i.issued_at = $2::date), 0) AS revenue_today_cents,
         COALESCE(SUM(i.total_cents) FILTER (WHERE i.status <> 'paid'), 0) AS outstanding_cents
       FROM appointments a
       FULL OUTER JOIN invoices i ON i.tenant_id = $1
       WHERE (a.tenant_id = $1 OR a.tenant_id IS NULL)
         AND (i.tenant_id = $1 OR i.tenant_id IS NULL)`,
      [tenantId, date],
    ),
    pool.query(
      `SELECT a.id,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              TO_CHAR(a.starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS time,
              s.name AS service_name,
              tu.full_name AS therapist_name,
              a.room,
              a.status
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
       JOIN tenant_users tu ON tu.id = a.therapist_id AND tu.tenant_id = a.tenant_id
       LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
       WHERE a.tenant_id = $1
         AND (a.starts_at AT TIME ZONE 'UTC')::date = $2::date
       ORDER BY a.starts_at ASC
       LIMIT 8`,
      [tenantId, date],
    ),
    pool.query(
      `SELECT CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              w.status,
              w.est_wait_min
       FROM waiting_room_entries w
       JOIN appointments a ON a.id = w.appointment_id AND a.tenant_id = w.tenant_id
       JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
       WHERE w.tenant_id = $1
         AND (a.starts_at AT TIME ZONE 'UTC')::date = $2::date
       ORDER BY w.checked_in_at DESC
       LIMIT 6`,
      [tenantId, date],
    ),
    pool.query(
      `SELECT COALESCE(s.name, 'Custom service') AS name, COUNT(*)::int AS count
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
       WHERE a.tenant_id = $1
         AND DATE_TRUNC('month', a.starts_at AT TIME ZONE 'UTC') = DATE_TRUNC('month', $2::date)
       GROUP BY COALESCE(s.name, 'Custom service')
       ORDER BY count DESC, name ASC
       LIMIT 4`,
      [tenantId, date],
    ),
    pool.query(
      `SELECT tu.full_name AS therapist_name,
              COUNT(*) FILTER (WHERE (a.starts_at AT TIME ZONE 'UTC')::date = $2::date)::int AS sessions_today
       FROM tenant_users tu
       LEFT JOIN appointments a
         ON a.therapist_id = tu.id
        AND a.tenant_id = tu.tenant_id
       WHERE tu.tenant_id = $1
         AND tu.is_active = TRUE
       GROUP BY tu.id, tu.full_name
       ORDER BY sessions_today DESC, tu.full_name ASC
       LIMIT 5`,
      [tenantId, date],
    ),
  ]);

  const metrics = metricsResult.rows[0] || {};
  const totalServiceUsage = servicesResult.rows.reduce((sum, row) => sum + Number(row.count), 0);

  return {
    metrics: {
      appointmentsToday: Number(metrics.appointments_today || 0),
      patientsToday: Number(metrics.patients_today || 0),
      completedToday: Number(metrics.completed_today || 0),
      revenueToday: Number(metrics.revenue_today_cents || 0) / 100,
      outstanding: Number(metrics.outstanding_cents || 0) / 100,
    },
    upcoming: upcomingResult.rows.map((row) => ({
      id: row.id,
      patientName: row.patient_name,
      time: row.time,
      service: row.service_name || 'Custom service',
      therapist: row.therapist_name,
      room: row.room || '',
      status: row.status,
    })),
    waitingRoom: waitingResult.rows.map((row) => ({
      patientName: row.patient_name,
      status: row.status,
      estWait: row.est_wait_min || 0,
    })),
    services: servicesResult.rows.map((row) => ({
      name: row.name,
      percentage: totalServiceUsage > 0 ? Math.round((Number(row.count) / totalServiceUsage) * 100) : 0,
      count: Number(row.count),
    })),
    staff: staffResult.rows.map((row) => ({
      name: row.therapist_name,
      sessionsToday: Number(row.sessions_today || 0),
    })),
  };
}

function monthToDateRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function getPricingRules() {
  const result = await pool.query(
    `SELECT id, code, name, monthly_price_cents, yearly_price_cents, included_users,
            extra_user_monthly_cents, extra_user_yearly_cents, summary
     FROM subscription_plans
     WHERE code IN ('professional', 'enterprise')
       AND is_active = TRUE
     ORDER BY CASE code WHEN 'professional' THEN 1 WHEN 'enterprise' THEN 2 ELSE 99 END`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    summary: row.summary || '',
    monthlyPriceCents: Number(row.monthly_price_cents || 0),
    yearlyPriceCents: Number(row.yearly_price_cents || 0),
    monthlyPrice: centsToAmount(row.monthly_price_cents),
    yearlyPrice: centsToAmount(row.yearly_price_cents),
    includedUsers: Number(row.included_users || 1),
    extraUserMonthlyCents: Number(row.extra_user_monthly_cents || 0),
    extraUserYearlyCents: Number(row.extra_user_yearly_cents || 0),
    extraUserMonthly: centsToAmount(row.extra_user_monthly_cents),
    extraUserYearly: centsToAmount(row.extra_user_yearly_cents),
  }));
}

function centsToAmount(value) {
  return Number(value || 0) / 100;
}

function defaultPaymentSettings() {
  return {
    bankKosovoProvider: defaultBankDetails.kosovo.provider,
    bankKosovoBeneficiary: defaultBankDetails.kosovo.beneficiary,
    bankKosovoIban: defaultBankDetails.kosovo.iban,
    bankKosovoBic: defaultBankDetails.kosovo.bic,
    bankSepaProvider: defaultBankDetails.sepa.provider,
    bankSepaBeneficiary: defaultBankDetails.sepa.beneficiary,
    bankSepaIban: defaultBankDetails.sepa.iban,
    bankSepaBic: defaultBankDetails.sepa.bic,
    bankReferencePrefix: defaultBankDetails.kosovo.referencePrefix,
    cardLabel: 'Credit Card Payment',
    cardHelpText: 'Coming Soon. The future card flow will stay inside the same checkout experience.',
    cardIsEnabled: false,
    cardIsComingSoon: true,
    paypalLabel: 'PayPal',
    paypalHelpText: 'Coming Soon. PayPal will also stay inside the same checkout page experience.',
    paypalIsEnabled: false,
    paypalIsComingSoon: true,
  };
}

async function getAdminPaymentSettings() {
  const defaults = defaultPaymentSettings();
  const result = await pool.query(`SELECT setting_key, setting_value FROM platform_payment_settings`);
  const settings = { ...defaults };
  for (const row of result.rows) {
    if (!(row.setting_key in settings)) continue;
    if (row.setting_key.endsWith('IsEnabled') || row.setting_key.endsWith('IsComingSoon')) {
      settings[row.setting_key] = row.setting_value === 'true';
    } else {
      settings[row.setting_key] = row.setting_value;
    }
  }
  return settings;
}

async function updateAdminPaymentSettings(payload) {
  const parsed = adminPaymentSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid payment settings');
  }
  const entries = Object.entries(parsed.data);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of entries) {
      await client.query(
        `INSERT INTO platform_payment_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, String(value)],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getAdminPaymentSettings();
}

function mapPlatformTransaction(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    planCode: row.plan_code,
    billingCycle: row.billing_cycle,
    seatCount: Number(row.seat_count || 1),
    totalAmount: centsToAmount(row.total_amount_cents),
    method: row.method,
    status: row.status,
    createdAt: row.created_at,
    referenceCode: row.reference_code || '',
    bankRegion: row.bank_region || null,
    proofNote: row.proof_note || '',
  };
}

async function getAdminBillingOverview() {
  const [pricingRules, paymentSettings, pendingResult, recentResult, subscriptionsResult] = await Promise.all([
    getPricingRules(),
    getAdminPaymentSettings(),
    pool.query(
      `SELECT id, tenant_id, customer_email, customer_name, plan_code, billing_cycle, seat_count,
              total_amount_cents, method, status, created_at, reference_code, bank_region, proof_note
       FROM platform_payment_transactions
       WHERE status = 'pending_manual_review'
       ORDER BY created_at ASC`,
    ),
    pool.query(
      `SELECT id, tenant_id, customer_email, customer_name, plan_code, billing_cycle, seat_count,
              total_amount_cents, method, status, created_at, reference_code, bank_region, proof_note
       FROM platform_payment_transactions
       ORDER BY created_at DESC
       LIMIT 12`,
    ),
    pool.query(
      `SELECT t.id AS tenant_id,
              t.business_name,
              t.status,
              t.billing_cycle,
              COALESCE(sp.code, 'professional') AS plan_code,
              COALESCE(s.seat_count, 1) AS seat_count,
              COALESCE(s.total_amount_cents, 0) AS total_amount_cents
       FROM tenants t
       LEFT JOIN subscriptions s ON s.tenant_id = t.id
       LEFT JOIN subscription_plans sp ON sp.id = t.current_plan_id
       ORDER BY t.created_at DESC
       LIMIT 30`,
    ),
  ]);

  return {
    pricingRules,
    paymentSettings,
    pendingManualReviews: pendingResult.rows.map(mapPlatformTransaction),
    recentTransactions: recentResult.rows.map(mapPlatformTransaction),
    subscriptions: subscriptionsResult.rows.map((row) => ({
      tenantId: row.tenant_id,
      businessName: row.business_name,
      status: row.status,
      billingCycle: row.billing_cycle || 'monthly',
      planCode: row.plan_code,
      seatCount: Number(row.seat_count || 1),
      totalAmount: centsToAmount(row.total_amount_cents),
    })),
  };
}

async function reviewManualPayment(adminId, payload) {
  const parsed = adminManualPaymentReviewSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid payment review request');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const transactionResult = await client.query(
      `SELECT id, tenant_id, customer_email, customer_name, plan_code, billing_cycle, seat_count,
              total_amount_cents, method, status, created_at, reference_code, bank_region, proof_note
       FROM platform_payment_transactions
       WHERE id = $1
       FOR UPDATE`,
      [parsed.data.transactionId],
    );
    const transaction = transactionResult.rows[0];
    if (!transaction) throw new AppError(404, 'Payment transaction not found');
    if (transaction.status !== 'pending_manual_review') {
      throw new AppError(409, 'This payment has already been reviewed');
    }

    const nextStatus = parsed.data.decision === 'approve' ? 'completed' : 'rejected';
    await client.query(
      `UPDATE platform_payment_transactions
          SET status = $2,
              approved_by = $3,
              approved_at = NOW(),
              proof_note = COALESCE($4, proof_note),
              updated_at = NOW()
        WHERE id = $1`,
      [transaction.id, nextStatus, adminId, normalizeOptionalText(parsed.data.notes)],
    );

    if (parsed.data.decision === 'approve') {
      const planResult = await client.query('SELECT id FROM subscription_plans WHERE code = $1 LIMIT 1', [transaction.plan_code]);
      await upsertTenantSubscription(client, {
        tenantId: transaction.tenant_id,
        planId: planResult.rows[0]?.id,
        billingCycle: transaction.billing_cycle,
        seatCount: Number(transaction.seat_count || 1),
        totalAmountCents: Number(transaction.total_amount_cents || 0),
      });
      await client.query(
        `UPDATE tenants
            SET status = 'active',
                billing_cycle = $2,
                activated_at = COALESCE(activated_at, NOW())
          WHERE id = $1`,
        [transaction.tenant_id, transaction.billing_cycle],
      );
    } else {
      await client.query(
        `UPDATE tenants
            SET status = 'verified_unpaid'
          WHERE id = $1`,
        [transaction.tenant_id],
      );
    }

    await client.query('COMMIT');
    return {
      decision: parsed.data.decision,
      transaction: mapPlatformTransaction({ ...transaction, status: nextStatus }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function mapInvoiceRow(row) {
  return {
    id: row.id,
    number: row.number,
    patientId: row.patient_id,
    patientName: row.patient_name || 'Walk-in patient',
    date: row.issued_at,
    amount: centsToAmount(row.subtotal_cents),
    tax: centsToAmount(row.vat_cents),
    total: centsToAmount(row.total_cents),
    status: row.status,
    method: row.payment_method || 'pending',
    notes: row.notes || '',
  };
}

async function listInvoices(tenantId, payload) {
  const parsed = invoiceListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid month');
  }

  const { start, end } = monthToDateRange(parsed.data.month);
  const result = await pool.query(
    `SELECT i.id,
            i.number,
            i.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            i.issued_at,
            i.subtotal_cents,
            i.vat_cents,
            i.total_cents,
            i.status,
            i.payment_method,
            i.notes
     FROM invoices i
     LEFT JOIN patients p ON p.id = i.patient_id AND p.tenant_id = i.tenant_id
     WHERE i.tenant_id = $1
       AND i.issued_at >= $2::date
       AND i.issued_at < $3::date
     ORDER BY i.issued_at DESC, i.number DESC`,
    [tenantId, start, end],
  );

  return result.rows.map(mapInvoiceRow);
}

async function createInvoice(tenantId, payload) {
  const parsed = invoiceCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid invoice data');
  }

  await ensureTenantServices(tenantId);
  const input = parsed.data;
  const [patientResult, serviceResult] = await Promise.all([
    pool.query(
      `SELECT id
       FROM patients
       WHERE tenant_id = $1
         AND id = $2
         AND status <> 'archived'`,
      [tenantId, input.patientId],
    ),
    pool.query(
      `SELECT id, name, price_cents, vat_rate
       FROM services
       WHERE tenant_id = $1
         AND id = $2
         AND is_active = TRUE`,
      [tenantId, input.serviceId],
    ),
  ]);

  if (!patientResult.rows[0]) throw new AppError(404, 'Patient not found');
  if (!serviceResult.rows[0]) throw new AppError(404, 'Service not found');

  const service = serviceResult.rows[0];
  const subtotalCents = Number(service.price_cents);
  const vatRate = Number(service.vat_rate || 22);
  const vatCents = Math.round(subtotalCents * (vatRate / 100));
  const totalCents = subtotalCents + vatCents;

  const sequenceResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM invoices
     WHERE tenant_id = $1
       AND EXTRACT(YEAR FROM issued_at) = EXTRACT(YEAR FROM $2::date)`,
    [tenantId, input.issuedAt],
  );

  const sequence = String((sequenceResult.rows[0]?.count || 0) + 1).padStart(4, '0');
  const invoiceNumber = `INV-${input.issuedAt.slice(0, 4)}-${sequence}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      `INSERT INTO invoices (
         tenant_id, patient_id, number, issued_at, subtotal_cents, vat_cents, total_cents, status, payment_method, notes
       ) VALUES ($1, $2, $3, $4::date, $5, $6, $7, 'unpaid', $8, $9)
       RETURNING id`,
      [
        tenantId,
        input.patientId,
        invoiceNumber,
        input.issuedAt,
        subtotalCents,
        vatCents,
        totalCents,
        normalizeOptionalText(input.paymentMethod),
        normalizeOptionalText(input.notes),
      ],
    );

    await client.query(
      `INSERT INTO invoice_items (invoice_id, service_id, description, quantity, price_cents, vat_rate)
       VALUES ($1, $2, $3, 1, $4, $5)`,
      [invoiceResult.rows[0].id, service.id, service.name, subtotalCents, vatRate],
    );

    await client.query('COMMIT');

    const createdResult = await pool.query(
      `SELECT i.id,
              i.number,
              i.patient_id,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              i.issued_at,
              i.subtotal_cents,
              i.vat_cents,
              i.total_cents,
              i.status,
              i.payment_method,
              i.notes
       FROM invoices i
       LEFT JOIN patients p ON p.id = i.patient_id AND p.tenant_id = i.tenant_id
       WHERE i.tenant_id = $1
         AND i.id = $2`,
      [tenantId, invoiceResult.rows[0].id],
    );

    return mapInvoiceRow(createdResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function markInvoicePaid(tenantId, payload) {
  const parsed = invoiceMarkPaidSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid payment update');
  }

  const invoiceResult = await pool.query(
    `UPDATE invoices
        SET status = 'paid',
            payment_method = $3
      WHERE tenant_id = $1
        AND id = $2
      RETURNING id, total_cents`,
    [tenantId, parsed.data.id, parsed.data.method],
  );

  if (!invoiceResult.rows[0]) throw new AppError(404, 'Invoice not found');

  const paymentExists = await pool.query(
    `SELECT id FROM payments
     WHERE tenant_id = $1
       AND invoice_id = $2
     LIMIT 1`,
    [tenantId, parsed.data.id],
  );

  if (!paymentExists.rows[0]) {
    await pool.query(
      `INSERT INTO payments (tenant_id, invoice_id, method, amount_cents, paid_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [tenantId, parsed.data.id, parsed.data.method, invoiceResult.rows[0].total_cents],
    );
  }

  const updatedResult = await pool.query(
    `SELECT i.id,
            i.number,
            i.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            i.issued_at,
            i.subtotal_cents,
            i.vat_cents,
            i.total_cents,
            i.status,
            i.payment_method,
            i.notes
     FROM invoices i
     LEFT JOIN patients p ON p.id = i.patient_id AND p.tenant_id = i.tenant_id
     WHERE i.tenant_id = $1
       AND i.id = $2`,
    [tenantId, parsed.data.id],
  );

  return mapInvoiceRow(updatedResult.rows[0]);
}

function getReportDateRange(range) {
  const today = new Date('2026-04-21T00:00:00Z');
  const start = new Date(today);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 1);

  if (range === 'week') start.setUTCDate(start.getUTCDate() - 6);
  if (range === 'month') start.setUTCDate(1);
  if (range === 'year') {
    start.setUTCMonth(0, 1);
  }
  if (range === 'custom') start.setUTCDate(start.getUTCDate() - 13);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function getReportsSummary(tenantId, payload) {
  const parsed = reportsSummarySchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid report range');
  }

  const { start, end } = getReportDateRange(parsed.data.range);

  const [metricsResult, servicesResult, staffResult] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(i.total_cents), 0) AS revenue_cents,
         COUNT(a.id)::int AS appointments_count,
         COUNT(DISTINCT a.patient_id)::int AS new_patients_proxy,
         CASE
           WHEN COUNT(a.id) = 0 THEN 0
           ELSE ROUND((COUNT(*) FILTER (WHERE a.status = 'no_show')::numeric / COUNT(a.id)::numeric) * 100, 1)
         END AS no_show_rate
       FROM appointments a
       LEFT JOIN invoices i
         ON i.tenant_id = a.tenant_id
        AND i.patient_id = a.patient_id
        AND i.issued_at >= $2::date
        AND i.issued_at < $3::date
       WHERE a.tenant_id = $1
         AND (a.starts_at AT TIME ZONE 'UTC')::date >= $2::date
         AND (a.starts_at AT TIME ZONE 'UTC')::date < $3::date`,
      [tenantId, start, end],
    ),
    pool.query(
      `SELECT COALESCE(s.name, 'Custom service') AS name,
              COUNT(*)::int AS count
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
       WHERE a.tenant_id = $1
         AND (a.starts_at AT TIME ZONE 'UTC')::date >= $2::date
         AND (a.starts_at AT TIME ZONE 'UTC')::date < $3::date
       GROUP BY COALESCE(s.name, 'Custom service')
       ORDER BY count DESC, name ASC
       LIMIT 6`,
      [tenantId, start, end],
    ),
    pool.query(
      `SELECT tu.full_name AS therapist_name,
              COUNT(a.id)::int AS sessions_count,
              COALESCE(SUM(i.total_cents), 0) AS revenue_cents
       FROM tenant_users tu
       LEFT JOIN appointments a
         ON a.therapist_id = tu.id
        AND a.tenant_id = tu.tenant_id
        AND (a.starts_at AT TIME ZONE 'UTC')::date >= $2::date
        AND (a.starts_at AT TIME ZONE 'UTC')::date < $3::date
       LEFT JOIN invoices i
         ON i.tenant_id = tu.tenant_id
        AND i.patient_id = a.patient_id
        AND i.issued_at >= $2::date
        AND i.issued_at < $3::date
       WHERE tu.tenant_id = $1
         AND tu.is_active = TRUE
       GROUP BY tu.id, tu.full_name
       ORDER BY sessions_count DESC, tu.full_name ASC
       LIMIT 6`,
      [tenantId, start, end],
    ),
  ]);

  const metrics = metricsResult.rows[0] || {};
  const totalServices = servicesResult.rows.reduce((sum, row) => sum + Number(row.count), 0);

  return {
    metrics: {
      revenue: centsToAmount(metrics.revenue_cents),
      appointments: Number(metrics.appointments_count || 0),
      newPatients: Number(metrics.new_patients_proxy || 0),
      noShowRate: Number(metrics.no_show_rate || 0),
    },
    services: servicesResult.rows.map((row) => ({
      name: row.name,
      count: Number(row.count),
      percentage: totalServices > 0 ? Math.round((Number(row.count) / totalServices) * 100) : 0,
    })),
    staff: staffResult.rows.map((row) => ({
      name: row.therapist_name,
      sessions: Number(row.sessions_count || 0),
      revenue: centsToAmount(row.revenue_cents),
    })),
  };
}

async function listStaff(tenantId) {
  const result = await pool.query(
    `SELECT tu.id,
            tu.full_name,
            tu.email,
            tu.phone,
            tu.is_active,
            r.code AS role_code,
            COUNT(a.id)::int AS sessions_this_month
     FROM tenant_users tu
     JOIN roles r ON r.id = tu.role_id
     LEFT JOIN appointments a
       ON a.therapist_id = tu.id
      AND a.tenant_id = tu.tenant_id
      AND DATE_TRUNC('month', a.starts_at AT TIME ZONE 'UTC') = DATE_TRUNC('month', DATE '2026-04-21')
     WHERE tu.tenant_id = $1
     GROUP BY tu.id, r.code
     ORDER BY tu.created_at ASC`,
    [tenantId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.full_name,
    role: row.role_code,
    email: row.email,
    phone: row.phone || '',
    status: row.is_active ? 'active' : 'inactive',
    sessionsThisMonth: Number(row.sessions_this_month || 0),
  }));
}

async function createStaffMember(tenantId, payload) {
  const parsed = staffCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid staff data');
  }

  const input = parsed.data;
  const roleResult = await pool.query(
    'SELECT id FROM roles WHERE code = $1',
    [input.role],
  );

  if (!roleResult.rows[0]) throw new AppError(400, 'Selected role is not available');

  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO tenant_users (tenant_id, email, password_hash, full_name, phone, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, full_name, email, phone, is_active`,
      [tenantId, input.email.trim().toLowerCase(), passwordHash, input.fullName, normalizeOptionalText(input.phone), roleResult.rows[0].id],
    );

    return {
      id: result.rows[0].id,
      name: result.rows[0].full_name,
      role: input.role,
      email: result.rows[0].email,
      phone: result.rows[0].phone || '',
      status: result.rows[0].is_active ? 'active' : 'inactive',
      sessionsThisMonth: 0,
    };
  } catch (error) {
    if (error?.code === '23505') {
      throw new AppError(409, 'A staff account with this email already exists');
    }
    throw error;
  }
}

async function getClinicSettings(tenantId) {
  const result = await pool.query(
    `SELECT t.business_name,
            t.email,
            t.phone,
            t.address,
            t.city,
            t.country,
            t.tax_number,
            cs.currency,
            cs.default_vat,
            cs.working_hours
     FROM tenants t
     LEFT JOIN clinic_settings cs ON cs.tenant_id = t.id
     WHERE t.id = $1`,
    [tenantId],
  );

  if (!result.rows[0]) throw new AppError(404, 'Clinic settings not found');
  const row = result.rows[0];
  return {
    clinicName: row.business_name,
    email: row.email,
    phone: row.phone || '',
    taxNumber: row.tax_number || '',
    address: row.address || '',
    city: row.city || '',
    country: row.country || '',
    currency: row.currency || 'EUR',
    defaultVat: Number(row.default_vat || 22),
    workingHours: row.working_hours || defaultWorkingHours(),
  };
}

async function updateClinicSettings(tenantId, payload) {
  const parsed = settingsUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid clinic settings');
  }

  const input = parsed.data;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE tenants
          SET business_name = $2,
              email = $3,
              phone = $4,
              tax_number = $5,
              address = $6,
              city = $7,
              country = $8
        WHERE id = $1`,
      [
        tenantId,
        input.clinicName,
        input.email.trim().toLowerCase(),
        normalizeOptionalText(input.phone),
        normalizeOptionalText(input.taxNumber),
        normalizeOptionalText(input.address),
        normalizeOptionalText(input.city),
        normalizeOptionalText(input.country),
      ],
    );

    await client.query(
      `INSERT INTO clinic_settings (tenant_id, currency, default_vat, working_hours, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET currency = EXCLUDED.currency,
                     default_vat = EXCLUDED.default_vat,
                     working_hours = EXCLUDED.working_hours,
                     updated_at = NOW()`,
      [tenantId, input.currency, input.defaultVat, JSON.stringify(defaultWorkingHours())],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return getClinicSettings(tenantId);
}

function mapQuotationRow(row) {
  return {
    id: row.id,
    number: row.number,
    patientName: row.patient_name,
    total: centsToAmount(row.total_cents),
    status: row.status,
    validUntil: row.valid_until,
    issuedAt: row.issued_at,
    notes: row.notes || '',
  };
}

async function listQuotations(tenantId, payload) {
  const parsed = quotationListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid month');
  }

  const { start, end } = monthToDateRange(parsed.data.month);
  const result = await pool.query(
    `SELECT q.id,
            q.number,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            q.total_cents,
            q.status,
            q.valid_until,
            q.issued_at,
            q.discount_cents,
            NULL::text AS notes
     FROM quotations q
     JOIN patients p ON p.id = q.patient_id AND p.tenant_id = q.tenant_id
     WHERE q.tenant_id = $1
       AND q.issued_at >= $2::date
       AND q.issued_at < $3::date
     ORDER BY q.issued_at DESC, q.number DESC`,
    [tenantId, start, end],
  );

  return result.rows.map(mapQuotationRow);
}

async function createQuotation(tenantId, payload) {
  const parsed = quotationCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid quotation data');
  }

  const input = parsed.data;
  const [patientResult, serviceResult] = await Promise.all([
    pool.query(
      `SELECT id
       FROM patients
       WHERE tenant_id = $1
         AND id = $2
         AND status <> 'archived'`,
      [tenantId, input.patientId],
    ),
    pool.query(
      `SELECT id, name, price_cents, vat_rate
       FROM services
       WHERE tenant_id = $1
         AND id = $2
         AND is_active = TRUE`,
      [tenantId, input.serviceId],
    ),
  ]);

  if (!patientResult.rows[0]) throw new AppError(404, 'Patient not found');
  if (!serviceResult.rows[0]) throw new AppError(404, 'Service not found');

  const service = serviceResult.rows[0];
  const subtotalCents = Number(service.price_cents);
  const vatRate = Number(service.vat_rate || 22);
  const totalCents = subtotalCents + Math.round(subtotalCents * (vatRate / 100));

  const sequenceResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM quotations
     WHERE tenant_id = $1
       AND EXTRACT(YEAR FROM issued_at) = EXTRACT(YEAR FROM $2::date)`,
    [tenantId, input.issuedAt],
  );
  const sequence = String((sequenceResult.rows[0]?.count || 0) + 1).padStart(4, '0');
  const quotationNumber = `OFF-${input.issuedAt.slice(0, 4)}-${sequence}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quotationResult = await client.query(
      `INSERT INTO quotations (tenant_id, patient_id, number, issued_at, valid_until, status, discount_cents, total_cents)
       VALUES ($1, $2, $3, $4::date, $5::date, 'draft', 0, $6)
       RETURNING id`,
      [tenantId, input.patientId, quotationNumber, input.issuedAt, input.validUntil || null, totalCents],
    );

    await client.query(
      `INSERT INTO quotation_items (quotation_id, service_id, description, quantity, price_cents, vat_rate)
       VALUES ($1, $2, $3, 1, $4, $5)`,
      [quotationResult.rows[0].id, service.id, service.name, subtotalCents, vatRate],
    );

    await client.query('COMMIT');

    const created = await pool.query(
      `SELECT q.id,
              q.number,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              q.total_cents,
              q.status,
              q.valid_until,
              q.issued_at,
              NULL::text AS notes
       FROM quotations q
       JOIN patients p ON p.id = q.patient_id AND p.tenant_id = q.tenant_id
       WHERE q.tenant_id = $1
         AND q.id = $2`,
      [tenantId, quotationResult.rows[0].id],
    );

    return mapQuotationRow(created.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function mapAnamnesisRow(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    therapistId: row.therapist_id,
    therapistName: row.therapist_name,
    mainComplaint: row.main_complaint || '',
    painLocation: row.pain_location || '',
    painIntensity: row.pain_intensity === null ? null : Number(row.pain_intensity),
    symptomsDuration: row.symptoms_duration || '',
    injuryHistory: row.injury_history || '',
    medicalHistory: row.medical_history || '',
    surgicalHistory: row.surgical_history || '',
    workFactors: row.work_factors || '',
    sportFactors: row.sport_factors || '',
    mobilityLimits: row.mobility_limits || '',
    observations: row.observations || '',
    redFlags: Array.isArray(row.red_flags) ? row.red_flags : [],
    isDraft: Boolean(row.is_draft),
    createdAt: row.created_at,
  };
}

async function listAnamnesisRecords(tenantId) {
  const result = await pool.query(
    `SELECT ar.id,
            ar.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            ar.therapist_id,
            tu.full_name AS therapist_name,
            ar.main_complaint,
            ar.pain_location,
            ar.pain_intensity,
            ar.symptoms_duration,
            ar.injury_history,
            ar.medical_history,
            ar.surgical_history,
            ar.work_factors,
            ar.sport_factors,
            ar.mobility_limits,
            ar.observations,
            ar.red_flags,
            ar.is_draft,
            TO_CHAR(ar.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
     FROM anamnesis_records ar
     JOIN patients p ON p.id = ar.patient_id AND p.tenant_id = ar.tenant_id
     JOIN tenant_users tu ON tu.id = ar.therapist_id AND tu.tenant_id = ar.tenant_id
     WHERE ar.tenant_id = $1
     ORDER BY ar.created_at DESC
     LIMIT 20`,
    [tenantId],
  );

  return result.rows.map(mapAnamnesisRow);
}

async function createAnamnesisRecord(tenantId, payload) {
  const parsed = anamnesisCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid anamnesis data');
  }

  const input = parsed.data;
  const [patientResult, therapistResult] = await Promise.all([
    pool.query(
      `SELECT id
       FROM patients
       WHERE tenant_id = $1
         AND id = $2
         AND status <> 'archived'`,
      [tenantId, input.patientId],
    ),
    pool.query(
      `SELECT id
       FROM tenant_users
       WHERE tenant_id = $1
         AND id = $2
         AND is_active = TRUE`,
      [tenantId, input.therapistId],
    ),
  ]);

  if (!patientResult.rows[0]) throw new AppError(404, 'Patient not found');
  if (!therapistResult.rows[0]) throw new AppError(404, 'Therapist not found');

  const result = await pool.query(
    `INSERT INTO anamnesis_records (
       tenant_id, patient_id, therapist_id, main_complaint, pain_location, pain_intensity,
       injury_history, surgical_history, medical_history, work_factors, sport_factors,
       mobility_limits, symptoms_duration, red_flags, observations, is_draft
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11,
       $12, $13, $14::jsonb, $15, $16
     )
     RETURNING id`,
    [
      tenantId,
      input.patientId,
      input.therapistId,
      input.mainComplaint,
      normalizeOptionalText(input.painLocation),
      input.painIntensity ?? null,
      normalizeOptionalText(input.injuryHistory),
      normalizeOptionalText(input.surgicalHistory),
      normalizeOptionalText(input.medicalHistory),
      normalizeOptionalText(input.workFactors),
      normalizeOptionalText(input.sportFactors),
      normalizeOptionalText(input.mobilityLimits),
      normalizeOptionalText(input.symptomsDuration),
      JSON.stringify(input.redFlags || []),
      normalizeOptionalText(input.observations),
      input.isDraft === true,
    ],
  );

  const created = await pool.query(
    `SELECT ar.id,
            ar.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            ar.therapist_id,
            tu.full_name AS therapist_name,
            ar.main_complaint,
            ar.pain_location,
            ar.pain_intensity,
            ar.symptoms_duration,
            ar.injury_history,
            ar.medical_history,
            ar.surgical_history,
            ar.work_factors,
            ar.sport_factors,
            ar.mobility_limits,
            ar.observations,
            ar.red_flags,
            ar.is_draft,
            TO_CHAR(ar.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
     FROM anamnesis_records ar
     JOIN patients p ON p.id = ar.patient_id AND p.tenant_id = ar.tenant_id
     JOIN tenant_users tu ON tu.id = ar.therapist_id AND tu.tenant_id = ar.tenant_id
     WHERE ar.tenant_id = $1
       AND ar.id = $2`,
    [tenantId, result.rows[0].id],
  );

  return mapAnamnesisRow(created.rows[0]);
}

function mapDiagnosisRow(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    therapistId: row.therapist_id,
    therapistName: row.therapist_name,
    icdCode: row.icd_code || '',
    label: row.label,
    notes: row.notes || '',
    diagnosedAt: row.diagnosed_at,
    createdAt: row.created_at,
  };
}

async function listDiagnoses(tenantId) {
  const result = await pool.query(
    `SELECT d.id,
            d.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            d.therapist_id,
            tu.full_name AS therapist_name,
            d.icd_code,
            d.label,
            d.notes,
            d.diagnosed_at,
            TO_CHAR(d.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
     FROM diagnoses d
     JOIN patients p ON p.id = d.patient_id AND p.tenant_id = d.tenant_id
     JOIN tenant_users tu ON tu.id = d.therapist_id AND tu.tenant_id = d.tenant_id
     WHERE d.tenant_id = $1
     ORDER BY d.diagnosed_at DESC, d.created_at DESC
     LIMIT 30`,
    [tenantId],
  );

  return result.rows.map(mapDiagnosisRow);
}

async function createDiagnosis(tenantId, payload) {
  const parsed = diagnosisCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid diagnosis data');
  }

  const input = parsed.data;
  const [patientResult, therapistResult] = await Promise.all([
    pool.query(
      `SELECT id
       FROM patients
       WHERE tenant_id = $1
         AND id = $2
         AND status <> 'archived'`,
      [tenantId, input.patientId],
    ),
    pool.query(
      `SELECT id
       FROM tenant_users
       WHERE tenant_id = $1
         AND id = $2
         AND is_active = TRUE`,
      [tenantId, input.therapistId],
    ),
  ]);

  if (!patientResult.rows[0]) throw new AppError(404, 'Patient not found');
  if (!therapistResult.rows[0]) throw new AppError(404, 'Therapist not found');

  const result = await pool.query(
    `INSERT INTO diagnoses (tenant_id, patient_id, therapist_id, icd_code, label, notes, diagnosed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::date)
     RETURNING id`,
    [
      tenantId,
      input.patientId,
      input.therapistId,
      normalizeOptionalText(input.icdCode),
      input.label,
      normalizeOptionalText(input.notes),
      input.diagnosedAt,
    ],
  );

  const created = await pool.query(
    `SELECT d.id,
            d.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            d.therapist_id,
            tu.full_name AS therapist_name,
            d.icd_code,
            d.label,
            d.notes,
            d.diagnosed_at,
            TO_CHAR(d.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
     FROM diagnoses d
     JOIN patients p ON p.id = d.patient_id AND p.tenant_id = d.tenant_id
     JOIN tenant_users tu ON tu.id = d.therapist_id AND tu.tenant_id = d.tenant_id
     WHERE d.tenant_id = $1
       AND d.id = $2`,
    [tenantId, result.rows[0].id],
  );

  return mapDiagnosisRow(created.rows[0]);
}

function mapTreatmentPlanRow(row) {
  const plannedSessions = Number(row.planned_sessions || 0);
  const completedSessions = Number(row.completed_sessions || 0);
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    therapistId: row.therapist_id,
    therapistName: row.therapist_name,
    title: row.title,
    goals: row.goals || '',
    plannedSessions,
    completedSessions,
    techniques: row.techniques || '',
    homeExercises: row.home_exercises || '',
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    progress: plannedSessions > 0 ? Math.min(100, Math.round((completedSessions / plannedSessions) * 100)) : 0,
  };
}

async function listTreatmentPlans(tenantId) {
  const result = await pool.query(
    `SELECT tp.id,
            tp.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            tp.therapist_id,
            tu.full_name AS therapist_name,
            tp.title,
            tp.goals,
            tp.planned_sessions,
            tp.techniques,
            tp.home_exercises,
            tp.start_date,
            tp.end_date,
            tp.status,
            COUNT(ts.id)::int AS completed_sessions
     FROM treatment_plans tp
     JOIN patients p ON p.id = tp.patient_id AND p.tenant_id = tp.tenant_id
     JOIN tenant_users tu ON tu.id = tp.therapist_id AND tu.tenant_id = tp.tenant_id
     LEFT JOIN treatment_sessions ts ON ts.treatment_plan_id = tp.id AND ts.tenant_id = tp.tenant_id
     WHERE tp.tenant_id = $1
     GROUP BY tp.id, p.first_name, p.last_name, tu.full_name
     ORDER BY tp.start_date DESC NULLS LAST, tp.created_at DESC`,
    [tenantId],
  );

  return result.rows.map(mapTreatmentPlanRow);
}

async function createTreatmentPlan(tenantId, payload) {
  const parsed = treatmentPlanCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid treatment plan data');
  }

  const input = parsed.data;
  const [patientResult, therapistResult] = await Promise.all([
    pool.query(
      `SELECT id
       FROM patients
       WHERE tenant_id = $1
         AND id = $2
         AND status <> 'archived'`,
      [tenantId, input.patientId],
    ),
    pool.query(
      `SELECT id
       FROM tenant_users
       WHERE tenant_id = $1
         AND id = $2
         AND is_active = TRUE`,
      [tenantId, input.therapistId],
    ),
  ]);

  if (!patientResult.rows[0]) throw new AppError(404, 'Patient not found');
  if (!therapistResult.rows[0]) throw new AppError(404, 'Therapist not found');

  const result = await pool.query(
    `INSERT INTO treatment_plans (
       tenant_id, patient_id, therapist_id, title, goals, planned_sessions,
       techniques, home_exercises, start_date, end_date, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9::date, $10::date, $11
     )
     RETURNING id`,
    [
      tenantId,
      input.patientId,
      input.therapistId,
      input.title,
      normalizeOptionalText(input.goals),
      input.plannedSessions,
      normalizeOptionalText(input.techniques),
      normalizeOptionalText(input.homeExercises),
      input.startDate,
      input.endDate || null,
      input.status || 'active',
    ],
  );

  const created = await pool.query(
    `SELECT tp.id,
            tp.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            tp.therapist_id,
            tu.full_name AS therapist_name,
            tp.title,
            tp.goals,
            tp.planned_sessions,
            tp.techniques,
            tp.home_exercises,
            tp.start_date,
            tp.end_date,
            tp.status,
            0::int AS completed_sessions
     FROM treatment_plans tp
     JOIN patients p ON p.id = tp.patient_id AND p.tenant_id = tp.tenant_id
     JOIN tenant_users tu ON tu.id = tp.therapist_id AND tu.tenant_id = tp.tenant_id
     WHERE tp.tenant_id = $1
       AND tp.id = $2`,
    [tenantId, result.rows[0].id],
  );

  return mapTreatmentPlanRow(created.rows[0]);
}

function mapTreatmentSessionRow(row) {
  const painBefore = row.pain_before === null ? null : Number(row.pain_before);
  const painAfter = row.pain_after === null ? null : Number(row.pain_after);
  return {
    id: row.id,
    treatmentPlanId: row.treatment_plan_id,
    planTitle: row.plan_title || '',
    patientId: row.patient_id,
    patientName: row.patient_name,
    therapistId: row.therapist_id,
    therapistName: row.therapist_name,
    performedAt: row.performed_at,
    date: row.session_date,
    time: row.session_time,
    duration: Number(row.duration_min || 0),
    techniques: row.techniques || '',
    bodyArea: row.body_area || '',
    painBefore,
    painAfter,
    notes: row.notes || '',
    recommendations: row.recommendations || '',
    followUpNeeded: Boolean(row.follow_up_needed),
    painDelta: painBefore !== null && painAfter !== null ? `${painBefore}->${painAfter}` : null,
  };
}

async function listTreatmentSessions(tenantId) {
  const result = await pool.query(
    `SELECT ts.id,
            ts.treatment_plan_id,
            tp.title AS plan_title,
            ts.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            ts.therapist_id,
            tu.full_name AS therapist_name,
            TO_CHAR(ts.performed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS performed_at,
            TO_CHAR(ts.performed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS session_date,
            TO_CHAR(ts.performed_at AT TIME ZONE 'UTC', 'HH24:MI') AS session_time,
            ts.duration_min,
            ts.techniques,
            ts.body_area,
            ts.pain_before,
            ts.pain_after,
            ts.notes,
            ts.recommendations,
            ts.follow_up_needed
     FROM treatment_sessions ts
     JOIN patients p ON p.id = ts.patient_id AND p.tenant_id = ts.tenant_id
     JOIN tenant_users tu ON tu.id = ts.therapist_id AND tu.tenant_id = ts.tenant_id
     LEFT JOIN treatment_plans tp ON tp.id = ts.treatment_plan_id AND tp.tenant_id = ts.tenant_id
     WHERE ts.tenant_id = $1
     ORDER BY ts.performed_at DESC
     LIMIT 30`,
    [tenantId],
  );

  return result.rows.map(mapTreatmentSessionRow);
}

async function createTreatmentSession(tenantId, payload) {
  const parsed = treatmentSessionCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid treatment session data');
  }

  const input = parsed.data;
  const checks = await Promise.all([
    pool.query(
      `SELECT id
       FROM patients
       WHERE tenant_id = $1
         AND id = $2
         AND status <> 'archived'`,
      [tenantId, input.patientId],
    ),
    pool.query(
      `SELECT id
       FROM tenant_users
       WHERE tenant_id = $1
         AND id = $2
         AND is_active = TRUE`,
      [tenantId, input.therapistId],
    ),
    input.treatmentPlanId
      ? pool.query(
          `SELECT id
           FROM treatment_plans
           WHERE tenant_id = $1
             AND id = $2`,
          [tenantId, input.treatmentPlanId],
        )
      : Promise.resolve({ rows: [{ id: null }] }),
  ]);

  if (!checks[0].rows[0]) throw new AppError(404, 'Patient not found');
  if (!checks[1].rows[0]) throw new AppError(404, 'Therapist not found');
  if (input.treatmentPlanId && !checks[2].rows[0]) throw new AppError(404, 'Treatment plan not found');

  const performedAt = `${input.performedAt}:00Z`;
  const result = await pool.query(
    `INSERT INTO treatment_sessions (
       tenant_id, treatment_plan_id, patient_id, therapist_id, performed_at, duration_min,
       techniques, body_area, pain_before, pain_after, notes, recommendations, follow_up_needed
     ) VALUES (
       $1, $2, $3, $4, $5::timestamptz, $6,
       $7, $8, $9, $10, $11, $12, $13
     )
     RETURNING id`,
    [
      tenantId,
      input.treatmentPlanId || null,
      input.patientId,
      input.therapistId,
      performedAt,
      input.duration,
      input.techniques,
      normalizeOptionalText(input.bodyArea),
      input.painBefore ?? null,
      input.painAfter ?? null,
      normalizeOptionalText(input.notes),
      normalizeOptionalText(input.recommendations),
      input.followUpNeeded === true,
    ],
  );

  const created = await pool.query(
    `SELECT ts.id,
            ts.treatment_plan_id,
            tp.title AS plan_title,
            ts.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            ts.therapist_id,
            tu.full_name AS therapist_name,
            TO_CHAR(ts.performed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS performed_at,
            TO_CHAR(ts.performed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS session_date,
            TO_CHAR(ts.performed_at AT TIME ZONE 'UTC', 'HH24:MI') AS session_time,
            ts.duration_min,
            ts.techniques,
            ts.body_area,
            ts.pain_before,
            ts.pain_after,
            ts.notes,
            ts.recommendations,
            ts.follow_up_needed
     FROM treatment_sessions ts
     JOIN patients p ON p.id = ts.patient_id AND p.tenant_id = ts.tenant_id
     JOIN tenant_users tu ON tu.id = ts.therapist_id AND tu.tenant_id = ts.tenant_id
     LEFT JOIN treatment_plans tp ON tp.id = ts.treatment_plan_id AND tp.tenant_id = ts.tenant_id
     WHERE ts.tenant_id = $1
       AND ts.id = $2`,
    [tenantId, result.rows[0].id],
  );

  return mapTreatmentSessionRow(created.rows[0]);
}

function mapReminderRow(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || 'Unknown patient',
    type: row.type,
    channel: row.channel,
    scheduledAt: row.scheduled_at,
    status: row.status,
    notes: row.notes || '',
  };
}

async function listReminders(tenantId, payload) {
  const parsed = reminderListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid reminder filter');
  }

  const statusFilter = parsed.data.status || null;
  const result = await pool.query(
    `SELECT r.id,
            r.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            r.type,
            r.channel,
            TO_CHAR(r.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS scheduled_at,
            r.status,
            COALESCE(r.payload->>'notes', '') AS notes
     FROM reminders r
     LEFT JOIN patients p ON p.id = r.patient_id AND p.tenant_id = r.tenant_id
     WHERE r.tenant_id = $1
       AND ($2::text IS NULL OR r.status = $2)
     ORDER BY r.scheduled_at ASC
     LIMIT 20`,
    [tenantId, statusFilter],
  );

  return result.rows.map(mapReminderRow);
}

async function createReminder(tenantId, payload) {
  const parsed = reminderCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid reminder data');
  }

  const input = parsed.data;
  const patientResult = await pool.query(
    `SELECT id, first_name, last_name
     FROM patients
     WHERE tenant_id = $1
       AND id = $2
       AND status <> 'archived'`,
    [tenantId, input.patientId],
  );

  if (!patientResult.rows[0]) throw new AppError(404, 'Patient not found');

  const scheduledAt = `${input.scheduledAt}:00Z`;
  const result = await pool.query(
    `INSERT INTO reminders (tenant_id, patient_id, type, channel, scheduled_at, status, payload)
     VALUES ($1, $2, $3, $4, $5::timestamptz, 'pending', $6::jsonb)
     RETURNING id`,
    [tenantId, input.patientId, input.type, input.channel, scheduledAt, JSON.stringify({ notes: input.notes || '' })],
  );

  await pool.query(
    `INSERT INTO notifications (tenant_id, title, body)
     VALUES ($1, $2, $3)`,
    [
      tenantId,
      `Reminder scheduled: ${input.type.replace('_', ' ')}`,
      `${patientResult.rows[0].first_name} ${patientResult.rows[0].last_name} via ${input.channel} at ${input.scheduledAt.replace('T', ' ')}`,
    ],
  );

  const created = await pool.query(
    `SELECT r.id,
            r.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            r.type,
            r.channel,
            TO_CHAR(r.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS scheduled_at,
            r.status,
            COALESCE(r.payload->>'notes', '') AS notes
     FROM reminders r
     JOIN patients p ON p.id = r.patient_id AND p.tenant_id = r.tenant_id
     WHERE r.tenant_id = $1
       AND r.id = $2`,
    [tenantId, result.rows[0].id],
  );

  return mapReminderRow(created.rows[0]);
}

async function updateReminderStatus(tenantId, payload) {
  const parsed = reminderStatusUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid reminder update');
  }

  const result = await pool.query(
    `UPDATE reminders
        SET status = $3,
            sent_at = CASE WHEN $3 = 'sent' THEN NOW() ELSE sent_at END
      WHERE tenant_id = $1
        AND id = $2
      RETURNING id`,
    [tenantId, parsed.data.id, parsed.data.status],
  );

  if (!result.rows[0]) throw new AppError(404, 'Reminder not found');

  const updated = await pool.query(
    `SELECT r.id,
            r.patient_id,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
            r.type,
            r.channel,
            TO_CHAR(r.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS scheduled_at,
            r.status,
            COALESCE(r.payload->>'notes', '') AS notes
     FROM reminders r
     LEFT JOIN patients p ON p.id = r.patient_id AND p.tenant_id = r.tenant_id
     WHERE r.tenant_id = $1
       AND r.id = $2`,
    [tenantId, parsed.data.id],
  );

  return mapReminderRow(updated.rows[0]);
}

async function listAuditLogs(tenantId, payload) {
  const parsed = auditLogListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid audit log filter');
  }

  const limit = parsed.data.limit || 15;
  const result = await pool.query(
    `SELECT al.id,
            al.action,
            al.entity,
            al.entity_id,
            al.metadata,
            TO_CHAR(al.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            COALESCE(tu.full_name, pa.full_name, 'System') AS actor_name,
            al.actor_type
     FROM audit_logs al
     LEFT JOIN tenant_users tu ON tu.id = al.user_id AND al.actor_type = 'tenant_user'
     LEFT JOIN platform_admins pa ON pa.id = al.user_id AND al.actor_type = 'platform_admin'
     WHERE al.tenant_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2`,
    [tenantId, limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    actorName: row.actor_name,
    actorType: row.actor_type,
  }));
}

async function getAdminTenantsOverview() {
  const [tenantsResult, metricsResult] = await Promise.all([
    pool.query(
      `SELECT t.id,
              t.business_name AS name,
              t.city,
              t.country,
              COALESCE(sp.code, 'professional') AS plan,
              t.status,
              COUNT(DISTINCT tu.id)::int AS staff_count,
              COUNT(DISTINCT p.id)::int AS patients_count,
              t.created_at::date AS joined_at
       FROM tenants t
       LEFT JOIN subscription_plans sp ON sp.id = t.current_plan_id
       LEFT JOIN tenant_users tu ON tu.tenant_id = t.id
       LEFT JOIN patients p ON p.tenant_id = t.id
       GROUP BY t.id, sp.code
       ORDER BY t.created_at DESC`,
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS registered_clinics,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_subscriptions,
         COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended_count,
         COALESCE(SUM(CASE WHEN sp.code = 'professional' AND t.status = 'active' THEN sp.price_cents ELSE 0 END), 0) AS monthly_mrr_cents,
         COALESCE(SUM(CASE WHEN sp.code = 'enterprise' AND t.status = 'active' THEN 480000 ELSE 0 END), 0) AS yearly_revenue_cents
       FROM tenants t
       LEFT JOIN subscription_plans sp ON sp.id = t.current_plan_id`,
    ),
  ]);

  const tenants = tenantsResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city || '',
    country: row.country || '',
    plan: row.plan,
    status: row.status,
    staffCount: Number(row.staff_count || 0),
    patientsCount: Number(row.patients_count || 0),
    mrr: row.plan === 'professional' && row.status === 'active' ? 50 : 0,
    yearlyFee: row.plan === 'enterprise' && row.status === 'active' ? 4800 : 0,
    joinedAt: row.joined_at,
  }));

  const metrics = metricsResult.rows[0];
  return {
    tenants,
    metrics: {
      registeredClinics: Number(metrics.registered_clinics || 0),
      activeSubscriptions: Number(metrics.active_subscriptions || 0),
      suspendedCount: Number(metrics.suspended_count || 0),
      monthlyMrr: centsToAmount(metrics.monthly_mrr_cents),
      yearlyRevenue: centsToAmount(metrics.yearly_revenue_cents),
    },
  };
}

async function updateAdminTenantStatus(payload) {
  const parsed = adminTenantStatusSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message || 'Invalid tenant status update');
  }

  const result = await pool.query(
    `UPDATE tenants
        SET status = $2
      WHERE id = $1
      RETURNING id, business_name, status`,
    [parsed.data.tenantId, parsed.data.status],
  );

  if (!result.rows[0]) throw new AppError(404, 'Tenant not found');
  return {
    id: result.rows[0].id,
    name: result.rows[0].business_name,
    status: result.rows[0].status,
  };
}
