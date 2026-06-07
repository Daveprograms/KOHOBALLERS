import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDB, saveDB } from './db.js';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Setup SMTP Transporter for lead notifications
const createEmailTransporter = () => {
  if (
    !process.env.SMTP_USER || 
    process.env.SMTP_USER === 'yoursenderemail@gmail.com' || 
    !process.env.SMTP_PASS || 
    process.env.SMTP_PASS === 'yourgmailapppassword'
  ) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// API 1: Get Safe Configuration
app.get('/api/config', (req, res) => {
  res.json({
    kohoReferralLink: process.env.KOHO_REFERRAL_LINK || 'https://web.koho.ca/referral/CHALLENGE',
    neoReferralLink: process.env.NEO_REFERRAL_LINK || 'https://member.neofinancial.com/signup?referral_code=CHALLENGE',
    bonusPayoutAmount: Number(process.env.BONUS_PAYOUT_AMOUNT) || 100
  });
});

// API 2: Get Referrals & Public Stats (Leaderboard + Recent paid ticker)
app.get('/api/referrals/summary', async (req, res) => {
  const db = await getDB();
  
  // Filter for approved items (Paid) to feed the recent ticker
  const recentPayouts = db.proofs
    .filter(p => p.status === 'approved')
    .sort((a, b) => new Date(b.processedAt || b.createdAt) - new Date(a.processedAt || a.createdAt))
    .slice(0, 10)
    .map(p => ({
      name: p.name.split(' ').map((n, i) => i === 0 ? n : n[0] + '.').join(' '), // Obfuscate last name
      provider: p.provider,
      amount: p.payoutAmount || (p.provider === 'Both' ? 200 : 100),
      time: p.processedAt || p.createdAt
    }));

  res.json({
    leaderboard: db.leaderboard,
    recentPayouts,
    stats: {
      totalReferrals: db.proofs.length,
      approvedPayouts: db.proofs.filter(p => p.status === 'approved').length,
      pendingPayouts: db.proofs.filter(p => p.status === 'pending').length,
      totalPaidOut: db.proofs
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + (p.payoutAmount || (p.provider === 'Both' ? 200 : 100)), 0)
    }
  });
});

// API 3: Get User's Personal Submissions / Leads by Email
app.get('/api/my-referrals', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email query parameter is required." });
  }
  
  const searchEmail = email.toString().toLowerCase().trim();
  const db = await getDB();
  
  const myProofs = db.proofs.filter(p => 
    p.email.toLowerCase().trim() === searchEmail
  );
  
  res.json(myProofs);
});

// API 4: Submit Lead screening form (JSON Payload)
app.post('/api/proofs', async (req, res) => {
  const { name, email, phone, contactMethod, livesInCanada, hasKoho, hasNeo, provider } = req.body;
  
  if (!name || !email || !phone || !contactMethod || provider === undefined) {
    return res.status(400).json({ error: "Missing required fields: name, email, phone, contactMethod, provider." });
  }

  const db = await getDB();
  const newLead = {
    id: `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    contactMethod,
    livesInCanada: !!livesInCanada,
    hasKoho: !!hasKoho,
    hasNeo: !!hasNeo,
    provider, // 'KOHO', 'Neo', or 'Both'
    status: 'pending', // "New Lead"
    createdAt: new Date().toISOString(),
    adminNotes: '',
    payoutRef: ''
  };

  db.proofs.unshift(newLead);
  await saveDB(db);

  // Send Lead Email Notification to Admin
  try {
    const transporter = createEmailTransporter();
    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL || 'yourpersonalemail@gmail.com';
    
    if (transporter && recipient && recipient !== 'yourpersonalemail@gmail.com') {
      const payoutAmount = newLead.provider === 'Both' ? 200 : 100;
      const mailOptions = {
        from: `"BonusHunt Notifications" <${process.env.SMTP_USER}>`,
        to: recipient,
        subject: `🍁 New Lead Registered: ${newLead.name} (${newLead.provider})`,
        html: `
          <div style="font-family:-apple-system, sans-serif; background-color:#0f172a; padding:30px; border-radius:16px; max-width:500px; color:#f8fafc; border:1px solid rgba(255,255,255,0.06); margin:0 auto;">
            <div style="text-align:center; padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.06);">
              <h2 style="color:#10b981; margin:0; font-size:24px;">🍁 New Lead Registered!</h2>
              <p style="color:#94a3b8; font-size:12px; margin:6px 0 0 0;">An eligibility screening form has been submitted.</p>
            </div>
            
            <div style="padding:20px 0; font-size:14px; line-height:1.6;">
              <div style="margin-bottom:12px;">
                <span style="color:#94a3b8; width:130px; display:inline-block;"><strong>Name:</strong></span>
                <span style="color:#f8fafc; font-weight:bold;">${newLead.name}</span>
              </div>
              <div style="margin-bottom:12px;">
                <span style="color:#94a3b8; width:130px; display:inline-block;"><strong>Email:</strong></span>
                <a href="mailto:${newLead.email}" style="color:#3b82f6; text-decoration:none; font-weight:bold;">${newLead.email}</a>
              </div>
              <div style="margin-bottom:12px;">
                <span style="color:#94a3b8; width:130px; display:inline-block;"><strong>Phone Number:</strong></span>
                <a href="tel:${newLead.phone}" style="color:#10b981; font-weight:bold; text-decoration:none;">${newLead.phone}</a>
              </div>
              <div style="margin-bottom:12px;">
                <span style="color:#94a3b8; width:130px; display:inline-block;"><strong>Best Reach Option:</strong></span>
                <span style="color:#0284c7; background:rgba(14,165,233,0.1); border:1px solid rgba(14,165,233,0.2); padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">${newLead.contactMethod}</span>
              </div>
              <hr style="border:none; border-top:1px dashed rgba(255,255,255,0.06); margin:18px 0;" />
              <div style="margin-bottom:12px;">
                <span style="color:#94a3b8; width:130px; display:inline-block;"><strong>Reside in Canada:</strong></span>
                <span style="color:#10b981; font-weight:bold;">Yes 🇨🇦</span>
              </div>
              <div style="margin-bottom:12px;">
                <span style="color:#94a3b8; width:130px; display:inline-block;"><strong>Owns KOHO:</strong></span>
                <span style="color:#f8fafc;">${newLead.hasKoho ? 'Yes' : 'No (Eligible)'}</span>
              </div>
              <div style="margin-bottom:12px;">
                <span style="color:#94a3b8; width:130px; display:inline-block;"><strong>Owns Neo:</strong></span>
                <span style="color:#f8fafc;">${newLead.hasNeo ? 'Yes' : 'No (Eligible)'}</span>
              </div>
              <div style="margin-top:16px; padding:12px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:10px;">
                <span style="color:#34d399; font-weight:bold;">Eligible Commission:</span>
                <span style="color:#10b981; font-weight:bold; float:right;">${newLead.provider === 'Both' ? 'KOHO + Neo ($200 CAD!)' : `${newLead.provider} ($100 CAD!)`}</span>
              </div>
            </div>
            
            <div style="text-align:center; padding-top:15px; border-top:1px solid rgba(255,255,255,0.06); font-size:11px; color:#64748b;">
              Lead recorded on ${new Date().toLocaleString()} • database.json
            </div>
          </div>
        `
      };
      
      transporter.sendMail(mailOptions, (mailErr, info) => {
        if (mailErr) {
          console.error("❌ Nodemailer failed to send email notification:", mailErr.message);
        } else {
          console.log("📧 Lead email notification dispatched successfully:", info.response);
        }
      });
    } else {
      console.log("⚠️ Lead email notification skipped: SMTP parameters are missing or defaulted in .env");
    }
  } catch (emailErr) {
    console.error("❌ Error setting up nodemailer dispatcher:", emailErr.message);
  }

  res.status(201).json({ success: true, proof: newLead });
});

// API 5: Admin - Get All Leads
app.get('/api/admin/proofs', async (req, res) => {
  const { passcode } = req.query;
  const adminPasscode = process.env.ADMIN_PASSCODE || '1234';

  if (!passcode || passcode.toString() !== adminPasscode) {
    return res.status(401).json({ error: "Access Denied: Invalid passcode." });
  }

  const db = await getDB();
  res.json(db.proofs);
});

// API 6: Admin - Update Lead Status CRM (Approve/Decline/Contact)
app.put('/api/admin/proofs/:id', async (req, res) => {
  const { id } = req.params;
  const { passcode, status, adminNotes, payoutRef } = req.body;
  const adminPasscode = process.env.ADMIN_PASSCODE || '1234';

  if (!passcode || passcode.toString() !== adminPasscode) {
    return res.status(401).json({ error: "Access Denied: Invalid passcode." });
  }

  if (!status || !['approved', 'declined', 'contacted', 'pending'].includes(status)) {
    return res.status(400).json({ error: "Invalid status parameter." });
  }

  const db = await getDB();
  const proofIndex = db.proofs.findIndex(p => p.id === id);

  if (proofIndex === -1) {
    return res.status(404).json({ error: "Lead not found." });
  }

  const lead = db.proofs[proofIndex];
  lead.status = status;
  lead.adminNotes = adminNotes || '';
  
  if (status === 'approved') {
    lead.payoutRef = payoutRef || `REF-ETR${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    // Determine payout amount: $200 if eligible for both, else $100
    const payoutFactor = lead.provider === 'Both' ? 2 : 1;
    lead.payoutAmount = (Number(process.env.BONUS_PAYOUT_AMOUNT) || 100) * payoutFactor;
    lead.processedAt = new Date().toISOString();

    // Check if referrer's name already exists in leaderboard, if yes increment, else add!
    const nameMatch = db.leaderboard.find(l => l.name.toLowerCase() === lead.name.toLowerCase());
    if (nameMatch) {
      nameMatch.referrals += payoutFactor;
      nameMatch.earned += lead.payoutAmount;
    } else {
      db.leaderboard.push({
        name: lead.name,
        referrals: payoutFactor,
        earned: lead.payoutAmount
      });
    }
    // Re-sort leaderboard by earnings descending
    db.leaderboard.sort((a, b) => b.earned - a.earned);
  } else if (status === 'contacted') {
    lead.processedAt = new Date().toISOString();
    lead.payoutRef = '';
    delete lead.payoutAmount;
  } else {
    lead.payoutRef = '';
    delete lead.payoutAmount;
    delete lead.processedAt;
  }

  db.proofs[proofIndex] = lead;
  await saveDB(db);

  res.json({ success: true, proof: lead });
});

// For production build serving
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// Fallback to React app index.html for clientside routing in production
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    res.sendFile(path.join(distDir, 'index.html'));
  } else {
    res.status(200).send(`
      <div style="background:#111827; color:#fff; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif;">
        <h2 style="color:#10B981;">BankBonus Hunt CRM Backend is Running!</h2>
        <p style="color:#9CA3AF;">Vite frontend dev server is active.</p>
        <div style="padding:10px 20px; background:#1F2937; border-radius:8px; border:1px solid #374151; font-weight:bold;">PORT: ${PORT}</div>
      </div>
    `);
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 BankBonus Hunt CRM Backend running on port ${PORT}`);
  });
}

export default app;
