import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database.json');

// Helper to get fresh mock times relative to now
const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

const INITIAL_DATA = {
  proofs: [
    {
      id: "lead_1",
      name: "Jean-Francois Berube",
      email: "jf.berube@example.ca",
      phone: "514-555-0192",
      contactMethod: "WhatsApp",
      livesInCanada: true,
      hasKoho: false,
      hasNeo: false,
      provider: "Both", // Eligible for both KOHO and Neo!
      status: "pending", // represented as "New Lead"
      createdAt: minutesAgo(25),
      adminNotes: "",
      payoutRef: ""
    },
    {
      id: "lead_2",
      name: "Samantha Miller",
      email: "sam.m@example.ca",
      phone: "416-555-0817",
      contactMethod: "SMS/Text",
      livesInCanada: true,
      hasKoho: true,
      hasNeo: false,
      provider: "Neo", // Only eligible for Neo!
      status: "pending", // represented as "New Lead"
      createdAt: hoursAgo(3),
      adminNotes: "",
      payoutRef: ""
    },
    {
      id: "lead_3",
      name: "Marcus Tremblay",
      email: "marcus.t@example.ca",
      phone: "581-555-0238",
      contactMethod: "WhatsApp",
      livesInCanada: true,
      hasKoho: false,
      hasNeo: true,
      provider: "KOHO",
      status: "contacted", // represented as "Contacted"
      createdAt: daysAgo(1),
      adminNotes: "Sent KOHO referral code on WhatsApp. Waiting for activation.",
      payoutRef: "",
      processedAt: hoursAgo(18)
    }
  ],
  leaderboard: [
    { name: "David F.", referrals: 14, earned: 1400 },
    { name: "Sophie Roy", referrals: 12, earned: 1200 },
    { name: "Marc-Andre L.", referrals: 9, earned: 900 },
    { name: "Chloe Dufour", referrals: 8, earned: 800 },
    { name: "Ryan Wright", referrals: 7, earned: 700 },
    { name: "Chantal Levesque", referrals: 6, earned: 600 },
    { name: "Mathieu Tremblay", referrals: 6, earned: 600 },
    { name: "Samantha Miller", referrals: 5, earned: 500 },
    { name: "Jean-Francois B.", referrals: 5, earned: 500 },
    { name: "Marcus Tremblay", referrals: 4, earned: 400 },
    { name: "Emma Pelletier", referrals: 4, earned: 400 },
    { name: "Olivier Gagne", referrals: 4, earned: 400 },
    { name: "Liam Cloutier", referrals: 3, earned: 300 },
    { name: "Ava Morin", referrals: 3, earned: 300 },
    { name: "Lucas Bernier", referrals: 3, earned: 300 },
    { name: "Charlotte Harvey", referrals: 3, earned: 300 },
    { name: "William Roy", referrals: 2, earned: 200 },
    { name: "Sophia Dube", referrals: 2, earned: 200 },
    { name: "Benjamin Tessier", referrals: 2, earned: 200 },
    { name: "Amelia Simard", referrals: 2, earned: 200 },
    { name: "James Kennedy", referrals: 1, earned: 100 },
    { name: "Isabella Poulin", referrals: 1, earned: 100 },
    { name: "Leo Mercier", referrals: 1, earned: 100 },
    { name: "Mia Wong", referrals: 1, earned: 100 },
    { name: "Henry LeBlanc", referrals: 1, earned: 100 }
  ]
};

// programmatically populate exactly 150 approved payout leads!
const firstNames = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Lucas", "Charlotte", "William", "Sophia", "Benjamin", "Amelia", "James", "Isabella", "Leo", "Mia", "Henry", "Evelyn", "Jacob", "Harper", "Marc", "Sophie", "Jean", "Chantal", "David", "Mathieu", "Chloe", "Philippe", "Andre", "Antoine", "Daphne", "Julian", "Zoey", "Sarah", "Gabriel", "Samuel"];
const lastNames = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "V", "W", "Y"];
const providers = ["KOHO", "Neo", "Both"];

for (let i = 1; i <= 150; i++) {
  const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const provider = providers[Math.floor(Math.random() * providers.length)];
  const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@example.ca`;
  const payout = provider === 'Both' ? 200 : 100;
  
  INITIAL_DATA.proofs.push({
    id: `mock_lead_${i}`,
    name: `${fName} ${lName}.`,
    email: email,
    phone: `647-555-${String(i).padStart(4, '0')}`,
    contactMethod: "WhatsApp",
    livesInCanada: true,
    hasKoho: provider === 'Neo',
    hasNeo: provider === 'KOHO',
    provider: provider,
    status: "approved",
    createdAt: daysAgo(i / 10 + 0.1),
    adminNotes: "Signed up and verified.",
    payoutRef: `REF-ETR${100000 + i}`,
    payoutAmount: payout,
    processedAt: daysAgo(i / 10)
  });
}

// -------------------------------------------------------------
// POSTGRESQL POOL INTEGRATION
// -------------------------------------------------------------
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let pool = null;

if (connectionString) {
  const { Pool } = pg;
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Vercel Postgres / Neon / Supabase
  });
}

// Initialize tables and auto-seed if empty in PostgreSQL
const initPostgresDB = async () => {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proofs (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        contact_method VARCHAR(100),
        lives_in_canada BOOLEAN,
        has_koho BOOLEAN,
        has_neo BOOLEAN,
        provider VARCHAR(50),
        status VARCHAR(50),
        created_at TIMESTAMP,
        admin_notes TEXT,
        payout_ref VARCHAR(100),
        payout_amount INT DEFAULT 0,
        processed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        name VARCHAR(255) PRIMARY KEY,
        referrals INT,
        earned INT
      )
    `);

    // Auto-seed if database is empty
    const countRes = await pool.query('SELECT COUNT(*) FROM proofs');
    if (parseInt(countRes.rows[0].count) < 50) {
      console.log("🌱 Cloud Database empty. Seeding initial mock leads & leaderboard...");

      // Seed proofs
      for (const proof of INITIAL_DATA.proofs) {
        await pool.query(`
          INSERT INTO proofs (id, name, email, phone, contact_method, lives_in_canada, has_koho, has_neo, provider, status, created_at, admin_notes, payout_ref, payout_amount, processed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO NOTHING
        `, [
          proof.id, proof.name, proof.email, proof.phone, proof.contactMethod,
          proof.livesInCanada, proof.hasKoho, proof.hasNeo, proof.provider, proof.status,
          proof.createdAt, proof.adminNotes, proof.payoutRef, proof.payoutAmount || 0, proof.processedAt
        ]);
      }

      // Seed leaderboard
      for (const row of INITIAL_DATA.leaderboard) {
        await pool.query(`
          INSERT INTO leaderboard (name, referrals, earned)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO NOTHING
        `, [row.name, row.referrals, row.earned]);
      }
      console.log("✅ Database seeding completed successfully!");
    }
  } catch (err) {
    console.error("❌ Failed to initialize / seed PostgreSQL database:", err.message);
  }
};

// Auto run init in background if Postgres mode
if (pool) {
  initPostgresDB();
}

// -------------------------------------------------------------
// CORE EXPORTED DATABASE ACTIONS (Unified Asynchronous Interface)
// -------------------------------------------------------------

export const getDB = async () => {
  // Option A: PostgreSQL Cloud Database (Vercel)
  if (pool) {
    try {
      const proofsResult = await pool.query('SELECT * FROM proofs ORDER BY created_at DESC');
      const leaderboardResult = await pool.query('SELECT * FROM leaderboard ORDER BY referrals DESC');
      
      const proofs = proofsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        contactMethod: row.contact_method,
        livesInCanada: row.lives_in_canada,
        hasKoho: row.has_koho,
        hasNeo: row.has_neo,
        provider: row.provider,
        status: row.status,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        adminNotes: row.admin_notes || '',
        payoutRef: row.payout_ref || '',
        payoutAmount: row.payout_amount,
        processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null
      }));

      const leaderboard = leaderboardResult.rows.map(row => ({
        name: row.name,
        referrals: row.referrals,
        earned: row.earned
      }));

      return { proofs, leaderboard };
    } catch (error) {
      console.error("❌ Failed to read from PostgreSQL database, falling back to empty database", error);
      return { proofs: [], leaderboard: [] };
    }
  }

  // Option B: Local JSON File Database (Development)
  try {
    if (!fs.existsSync(DB_PATH)) {
      saveDB(INITIAL_DATA);
      return INITIAL_DATA;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    
    if (!parsed.proofs || parsed.proofs.length < 100) {
      saveDB(INITIAL_DATA);
      return INITIAL_DATA;
    }
    return parsed;
  } catch (error) {
    console.error("Error reading database file, resetting to initial data", error);
    return INITIAL_DATA;
  }
};

export const saveDB = async (data) => {
  // Option A: PostgreSQL Cloud Database (Vercel)
  if (pool) {
    try {
      // Upsert proofs
      for (const proof of data.proofs) {
        await pool.query(`
          INSERT INTO proofs (id, name, email, phone, contact_method, lives_in_canada, has_koho, has_neo, provider, status, created_at, admin_notes, payout_ref, payout_amount, processed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            admin_notes = EXCLUDED.admin_notes,
            payout_ref = EXCLUDED.payout_ref,
            payout_amount = EXCLUDED.payout_amount,
            processed_at = EXCLUDED.processed_at
        `, [
          proof.id, proof.name, proof.email, proof.phone, proof.contactMethod,
          proof.livesInCanada, proof.hasKoho, proof.hasNeo, proof.provider, proof.status,
          proof.createdAt, proof.adminNotes || '', proof.payoutRef || '', proof.payoutAmount || 0, proof.processedAt
        ]);
      }

      // Upsert leaderboard
      for (const row of data.leaderboard) {
        await pool.query(`
          INSERT INTO leaderboard (name, referrals, earned)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET
            referrals = EXCLUDED.referrals,
            earned = EXCLUDED.earned
        `, [row.name, row.referrals, row.earned]);
      }
      return true;
    } catch (error) {
      console.error("❌ Failed to save to PostgreSQL database", error);
      return false;
    }
  }

  // Option B: Local JSON File Database (Development)
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Error writing database file", error);
    return false;
  }
};
