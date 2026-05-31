import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    { name: "David F. (You)", referrals: 14, earned: 1400 },
    { name: "Sophie Roy", referrals: 9, earned: 900 },
    { name: "Marc-Andre L.", referrals: 7, earned: 700 },
    { name: "Chantal Levesque", referrals: 2, earned: 200 },
    { name: "Ryan Wright", referrals: 1, earned: 100 }
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

export const getDB = () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      saveDB(INITIAL_DATA);
      return INITIAL_DATA;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Force reset if database has less than 100 items to instantly load the 150 mock payout leads
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

export const saveDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Error writing database file", error);
    return false;
  }
};
