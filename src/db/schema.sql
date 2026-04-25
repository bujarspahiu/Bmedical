-- =====================================================================
-- Bmedical SaaS — PostgreSQL Schema (production-ready, multi-tenant)
-- All data is isolated per tenant_id. Never use any other DB engine.
-- =====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== PLATFORM (super admin) ==========
CREATE TABLE platform_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscription_plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT UNIQUE NOT NULL,          -- 'professional' | 'enterprise'
  name               TEXT NOT NULL,
  price_cents        INTEGER NOT NULL,              -- 5000 = 50€
  billing_cycle      TEXT NOT NULL,                 -- 'monthly' | 'yearly'
  max_staff          INTEGER,                        -- NULL = unlimited
  max_invoices_month INTEGER,
  max_templates      INTEGER,
  features           JSONB NOT NULL DEFAULT '{}',
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_backups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type    TEXT NOT NULL DEFAULT 'manual',
  schedule_id     UUID,
  backup_kind     TEXT NOT NULL DEFAULT 'database',
  engine          TEXT NOT NULL DEFAULT 'json_snapshot',
  format          TEXT NOT NULL DEFAULT 'json.gz',
  status          TEXT NOT NULL DEFAULT 'pending',
  file_name       TEXT,
  storage_path    TEXT,
  content_type    TEXT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  retention_days  INTEGER NOT NULL DEFAULT 14,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_by      UUID REFERENCES platform_admins(id) ON DELETE SET NULL
);

CREATE TABLE platform_backup_schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency      TEXT NOT NULL,
  hour           INTEGER NOT NULL,
  minute         INTEGER NOT NULL,
  day_of_week    INTEGER,
  day_of_month   INTEGER,
  retention_days INTEGER NOT NULL DEFAULT 14,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at    TIMESTAMPTZ,
  next_run_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_backup_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id   UUID REFERENCES platform_backups(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES platform_backup_schedules(id) ON DELETE SET NULL,
  level       TEXT NOT NULL DEFAULT 'info',
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== TENANTS (clinic / hospital / ordinance) ==========
CREATE TABLE tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name    TEXT NOT NULL,
  owner_name       TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  phone            TEXT,
  address          TEXT,
  city             TEXT,
  country          TEXT,
  tax_number       TEXT,
  type             TEXT NOT NULL DEFAULT 'clinic',  -- clinic|hospital|ordinance|rehab
  status           TEXT NOT NULL DEFAULT 'active',  -- active|suspended|trial|deleted
  current_plan_id  UUID REFERENCES subscription_plans(id),
  trial_ends_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id        UUID NOT NULL REFERENCES subscription_plans(id),
  status         TEXT NOT NULL,                    -- active|canceled|past_due
  current_start  TIMESTAMPTZ NOT NULL,
  current_end    TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  address    TEXT,
  city       TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

-- ========== USERS & ROLES ==========
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,    -- owner|physio|doctor|receptionist|accountant|assistant
  label       TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE tenant_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  location_id   UUID REFERENCES tenant_locations(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

-- ========== PATIENTS ==========
CREATE TABLE patients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  date_of_birth    DATE,
  gender           TEXT,
  id_number        TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  city             TEXT,
  country          TEXT,
  occupation       TEXT,
  medical_history  TEXT,
  allergies        TEXT,
  chronic_conditions TEXT,
  notes            TEXT,
  tags             TEXT[],
  consent_signed   BOOLEAN NOT NULL DEFAULT FALSE,
  consent_signed_at TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'active',  -- active|inactive|archived
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_patients_tenant ON patients(tenant_id);

CREATE TABLE patient_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,    -- emergency|family|referrer
  name       TEXT NOT NULL,
  phone      TEXT,
  relation   TEXT
);

CREATE TABLE patient_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT,    -- report|scan|consent|finding|discharge
  file_url    TEXT NOT NULL,
  uploaded_by UUID REFERENCES tenant_users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== APPOINTMENTS ==========
CREATE TABLE services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  duration_min INTEGER NOT NULL DEFAULT 45,
  price_cents INTEGER NOT NULL,
  vat_rate    NUMERIC(4,2) NOT NULL DEFAULT 22.00,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE appointments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id     UUID NOT NULL REFERENCES patients(id),
  therapist_id   UUID NOT NULL REFERENCES tenant_users(id),
  service_id     UUID REFERENCES services(id),
  location_id    UUID REFERENCES tenant_locations(id),
  room           TEXT,
  starts_at      TIMESTAMPTZ NOT NULL,
  duration_min   INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'booked',  -- booked|confirmed|checked_in|waiting|in_treatment|completed|canceled|no_show
  notes          TEXT,
  recurring_id   UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appt_tenant_date ON appointments(tenant_id, starts_at);

CREATE TABLE waiting_room_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         TEXT NOT NULL DEFAULT 'waiting',
  est_wait_min   INTEGER,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== CLINICAL ==========
CREATE TABLE anamnesis_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id),
  therapist_id    UUID NOT NULL REFERENCES tenant_users(id),
  main_complaint  TEXT,
  pain_location   TEXT,
  pain_intensity  INTEGER,
  injury_history  TEXT,
  surgical_history TEXT,
  medical_history TEXT,
  work_factors    TEXT,
  sport_factors   TEXT,
  mobility_limits TEXT,
  symptoms_duration TEXT,
  red_flags       JSONB DEFAULT '{}',
  observations    TEXT,
  is_draft        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnosis_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  icd_code   TEXT,
  name       TEXT NOT NULL,
  description TEXT
);

CREATE TABLE diagnoses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id),
  therapist_id    UUID NOT NULL REFERENCES tenant_users(id),
  template_id     UUID REFERENCES diagnosis_templates(id),
  icd_code        TEXT,
  label           TEXT NOT NULL,
  notes           TEXT,
  diagnosed_at    DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE treatment_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id),
  therapist_id    UUID NOT NULL REFERENCES tenant_users(id),
  title           TEXT NOT NULL,
  goals           TEXT,
  planned_sessions INTEGER,
  techniques      TEXT,
  home_exercises  TEXT,
  start_date      DATE,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE treatment_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  treatment_plan_id UUID REFERENCES treatment_plans(id),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  therapist_id     UUID NOT NULL REFERENCES tenant_users(id),
  appointment_id   UUID REFERENCES appointments(id),
  performed_at     TIMESTAMPTZ NOT NULL,
  duration_min     INTEGER,
  techniques       TEXT,
  body_area        TEXT,
  pain_before      INTEGER,
  pain_after       INTEGER,
  notes            TEXT,
  recommendations  TEXT,
  follow_up_needed BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== BILLING ==========
CREATE TABLE quotations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  number     TEXT NOT NULL,
  issued_at  DATE NOT NULL,
  valid_until DATE,
  status     TEXT NOT NULL DEFAULT 'draft',    -- draft|sent|accepted|rejected
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quotation_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  service_id   UUID REFERENCES services(id),
  description  TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  price_cents  INTEGER NOT NULL,
  vat_rate     NUMERIC(4,2) NOT NULL DEFAULT 22.00
);

CREATE TABLE invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id  UUID REFERENCES patients(id),
  number      TEXT NOT NULL,
  issued_at   DATE NOT NULL,
  due_at      DATE,
  subtotal_cents INTEGER NOT NULL,
  vat_cents      INTEGER NOT NULL,
  discount_cents INTEGER DEFAULT 0,
  total_cents    INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'unpaid',  -- unpaid|partial|paid
  payment_method TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, number)
);
CREATE INDEX idx_invoices_tenant_month ON invoices(tenant_id, issued_at);

CREATE TABLE invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_id  UUID REFERENCES services(id),
  description TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL,
  vat_rate    NUMERIC(4,2) NOT NULL
);

CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  method       TEXT NOT NULL,    -- cash|card|bank_transfer
  amount_cents INTEGER NOT NULL,
  paid_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference    TEXT
);

-- ========== COMMUNICATION ==========
CREATE TABLE reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id  UUID REFERENCES patients(id),
  type        TEXT NOT NULL,    -- appointment|follow_up|payment|reevaluation
  channel     TEXT NOT NULL,    -- email|sms
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at     TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending',
  payload     JSONB
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES tenant_users(id),
  title      TEXT NOT NULL,
  body       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== CONFIG & SECURITY ==========
CREATE TABLE clinic_settings (
  tenant_id           UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url            TEXT,
  currency            TEXT NOT NULL DEFAULT 'EUR',
  default_vat         NUMERIC(4,2) NOT NULL DEFAULT 22.00,
  working_hours       JSONB,
  invoice_prefix      TEXT DEFAULT 'INV',
  print_preferences   JSONB,
  branding            JSONB,
  email_templates     JSONB,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE staff_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL,    -- 0-6
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL
);

CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id),
  user_id    UUID,
  actor_type TEXT,              -- platform_admin|tenant_user
  action     TEXT NOT NULL,     -- create|update|delete|login|etc
  entity     TEXT NOT NULL,
  entity_id  UUID,
  metadata   JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);

-- ========== ROW-LEVEL SECURITY (tenant isolation) ==========
-- Example (enable on every tenant-scoped table):
-- ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON patients
--   USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- ========== SEED: roles & plans ==========
INSERT INTO roles (code, label) VALUES
  ('owner', 'Clinic Owner / Main Admin'),
  ('physio', 'Physiotherapist'),
  ('doctor', 'Doctor / Specialist'),
  ('receptionist', 'Receptionist'),
  ('accountant', 'Accountant / Billing Staff'),
  ('assistant', 'Assistant / Support Staff')
ON CONFLICT (code) DO NOTHING;

INSERT INTO subscription_plans (code, name, price_cents, billing_cycle, max_staff, max_invoices_month, max_templates, features)
VALUES
  ('professional', 'Professional', 5000, 'monthly', 3, 30, 5,
    '{"locations":1,"advanced_analytics":false,"custom_branding":false,"api":false}'::jsonb),
  ('enterprise', 'Enterprise', 0, 'yearly', NULL, NULL, NULL,
    '{"locations":-1,"advanced_analytics":true,"custom_branding":true,"api":true,"priority_support":true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ========== COMMERCE UPGRADES ==========
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yearly_price_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS included_users INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_user_monthly_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_user_yearly_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS renews_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_tenant_unique ON subscriptions(tenant_id);

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
);

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
);

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
 WHERE code IN ('professional', 'enterprise');
