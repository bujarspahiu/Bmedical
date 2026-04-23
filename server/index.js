import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

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
});

const allowedOrigins = frontendOrigin.split(',').map((value) => value.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/physio', async (req, res) => {
  try {
    const { action, ...payload } = req.body || {};
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
        const user = await registerTenant(payload);
        return writeAuthResponse(res, user);
      }
      default:
        return res.status(400).json({ error: 'Unsupported action' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    const statusCode = message.toLowerCase().includes('invalid') || message.toLowerCase().includes('missing') ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }
});

app.listen(port, async () => {
  try {
    await ensureSuperAdmin();
    console.log(`Bmedical API listening on port ${port}`);
  } catch (error) {
    console.error('API started but super admin bootstrap failed:', error.message);
  }
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
  return req.headers['x-physio-token'] || cookies[cookieName] || bearer || req.body?._token || '';
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
    tenantName: 'Bmedical Platform',
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
  const requiredFields = ['businessName', 'ownerName', 'email', 'password', 'plan'];
  for (const field of requiredFields) {
    if (!payload[field]) throw new Error(`Missing required field: ${field}`);
  }

  const email = String(payload.email).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(String(payload.password), 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const roleResult = await client.query("SELECT id FROM roles WHERE code = 'owner'");
    if (!roleResult.rows[0]) throw new Error('Owner role is missing. Run the schema seed first.');

    const planCode = String(payload.plan || 'professional').trim().toLowerCase();
    const planResult = await client.query('SELECT id, code FROM subscription_plans WHERE code = $1 AND is_active = TRUE', [planCode]);

    const tenantResult = await client.query(
      `INSERT INTO tenants (
         business_name, owner_name, email, phone, address, city, country, tax_number, type, current_plan_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, business_name`,
      [
        payload.businessName,
        payload.ownerName,
        email,
        payload.phone || null,
        payload.address || null,
        payload.city || null,
        payload.country || null,
        payload.taxNumber || null,
        payload.type || 'clinic',
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
        payload.ownerName,
        payload.phone || null,
        roleResult.rows[0].id,
      ],
    );

    await client.query(
      `INSERT INTO audit_logs (tenant_id, user_id, actor_type, action, entity, entity_id, metadata)
       VALUES ($1, $2, 'tenant_user', 'register', 'tenant', $1, $3::jsonb)`,
      [tenant.id, userResult.rows[0].id, JSON.stringify({ email })],
    );

    await client.query('COMMIT');

    return {
      id: userResult.rows[0].id,
      name: userResult.rows[0].full_name,
      email: userResult.rows[0].email,
      role: 'owner',
      tenantId: tenant.id,
      tenantName: tenant.business_name,
      plan: planResult.rows[0]?.code || 'professional',
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
  const fullName = process.env.SUPERADMIN_NAME || 'Bmedical Super Admin';

  const existsResult = await pool.query('SELECT 1 FROM platform_admins WHERE email = $1', [email]);
  if (existsResult.rows[0]) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO platform_admins (email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, TRUE)`,
    [email, passwordHash, fullName],
  );
}

async function insertAuditLog({ tenantId = null, userId = null, actorType, action, entity, entityId = null, metadata = {} }) {
  await pool.query(
    `INSERT INTO audit_logs (tenant_id, user_id, actor_type, action, entity, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [tenantId, userId, actorType, action, entity, entityId, JSON.stringify(metadata)],
  ).catch(() => {});
}
