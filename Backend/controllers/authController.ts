import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { AuthRequest } from '../middlewares/auth.js';
import { dbService } from '../services/dbService.js';
import { isFirebaseConfigured } from '../config/firebase-admin.js';
import { getAuth } from 'firebase-admin/auth';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'maintainiq_default_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

let transporter: nodemailer.Transporter | null = null;
const otpRequestStore = new Map<string, number>(); // email -> last request timestamp

function getTransporter() {
  if (!transporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
  }
  return transporter;
}

export async function demoLogin(req: Request, res: Response) {
  try {
    const { role } = req.body;

    if (!role || (role !== 'Admin' && role !== 'Technician' && role !== 'User')) {
      return res.status(400).json({ error: 'Invalid or missing role. Must be "Admin", "Technician", or "User".' });
    }

    let email = 'unknown@maintainiq.com';
    let name = 'Guest User';
    let uid = `demo-uid-${Date.now()}`;

    if (role === 'Admin') {
      email = 'admin@maintainiq.com';
      name = 'System Administrator';
      uid = 'admin-uid-12345';
    } else if (role === 'Technician') {
      email = 'tech.jane@maintainiq.com';
      name = 'Jane Technician';
      uid = 'technician-uid-12345';
    } else if (role === 'User') {
      email = 'customer.bob@maintainiq.com';
      name = 'Customer Bob';
      uid = 'customer-uid-12345';
    }

    // Insert user into DB if doesn't exist
    const sanitizedEmail = email.toLowerCase().trim();
    let userObj = await dbService.users.findOne({ email: sanitizedEmail });
    if (!userObj) {
      userObj = await dbService.users.create({
        uid,
        email: sanitizedEmail,
        name,
        role,
      });
    } else {
      // Ensure the role matches the demo request and retrieve accurate fields
      uid = userObj.uid || uid;
      name = userObj.name || name;
      if (userObj.role !== role) {
        userObj = await dbService.users.findOneAndUpdate(
          { email: sanitizedEmail },
          { role }
        );
      }
    }

    // Generate JWT token with secret
    const payload = {
      uid,
      email: sanitizedEmail,
      role,
      name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    return res.json({
      message: 'Demo login successful',
      token,
      user: payload,
    });
  } catch (err: any) {
    console.error('Demo Login Error:', err);
    return res.status(500).json({ error: 'Failed to authenticate demo user' });
  }
}

export async function syncProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No active session' });
    }
    return res.json({
      message: 'Profile synchronized successfully',
      user: req.user,
    });
  } catch (err: any) {
    console.error('Error syncing profile:', err);
    return res.status(500).json({ error: 'Failed to synchronize profile' });
  }
}

export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    const users = await dbService.users.find({});
    return res.json({ users });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
}

export async function getTechnicians(req: AuthRequest, res: Response) {
  try {
    const technicians = await dbService.users.find({ role: 'Technician' });
    return res.json({ technicians });
  } catch (err: any) {
    console.error('Error fetching technicians:', err);
    return res.status(500).json({ error: 'Failed to retrieve technicians' });
  }
}

export async function addTechnician(req: AuthRequest, res: Response) {
  try {
    const { name, email, password, category } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required to add a technician.' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    let existingUser = await dbService.users.findOne({ email: sanitizedEmail });
    let uidToSet = existingUser?.uid;

    if (isFirebaseConfigured && password) {
      try {
        let firebaseUser;
        try {
          firebaseUser = await getAuth().getUserByEmail(sanitizedEmail);
        } catch (err: any) {
          if (err.code !== 'auth/user-not-found') {
            throw err;
          }
        }

        if (firebaseUser) {
          await getAuth().updateUser(firebaseUser.uid, {
            password,
            displayName: name,
          });
          uidToSet = firebaseUser.uid;
        } else {
          const createdUser = await getAuth().createUser({
            email: sanitizedEmail,
            password,
            displayName: name,
          });
          uidToSet = createdUser.uid;
        }
      } catch (firebaseErr: any) {
        console.error('Error syncing/creating Firebase user:', firebaseErr);
        return res.status(400).json({ error: `Firebase Admin error: ${firebaseErr.message}` });
      }
    }

    const updateFields: any = { role: 'Technician', name };
    if (password) {
      updateFields.password = bcrypt.hashSync(password, 10);
    }
    if (category) {
      updateFields.category = category;
    }
    if (uidToSet) {
      updateFields.uid = uidToSet;
    }

    if (existingUser) {
      existingUser = await dbService.users.findOneAndUpdate(
        { email: sanitizedEmail },
        updateFields
      );
    } else {
      existingUser = await dbService.users.create({
        name,
        email: sanitizedEmail,
        role: 'Technician',
        password: password ? bcrypt.hashSync(password, 10) : bcrypt.hashSync("password123", 10),
        category: category || 'General',
        uid: uidToSet || `tech-uid-${Date.now()}`,
      });
    }

    return res.status(201).json({
      message: 'Technician added successfully',
      user: existingUser,
    });
  } catch (err: any) {
    console.error('Error adding technician:', err);
    return res.status(500).json({ error: err.message || 'Failed to add technician' });
  }
}

export async function signUp(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    const sanitizedEmail = email.toLowerCase().trim();
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await dbService.users.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const uid = `user-uid-${Date.now()}`;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await dbService.users.create({
      uid,
      name,
      email: sanitizedEmail,
      password: hashedPassword,
      role: 'User'
    });

    const payload = {
      uid,
      email: sanitizedEmail,
      role: 'User',
      name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: payload
    });
  } catch (err: any) {
    console.error('Sign Up Error:', err);
    return res.status(500).json({ error: 'Failed to register account' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const sanitizedEmail = email.toLowerCase().trim();

    const user = await dbService.users.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password against stored hash or fallback to raw comparison
    console.log("Login user found:", user.email, "Password exists:", !!user.password);
    
    let isPasswordValid = false;
    try {
        isPasswordValid = bcrypt.compareSync(password, user.password) || (user.password === password);
    } catch (bcryptErr) {
        console.error("Bcrypt comparison error:", bcryptErr);
        throw bcryptErr;
    }
    
    if (!isPasswordValid) {
      console.log("Login invalid password for:", user.email);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const payload = {
      uid: user.uid || `user-uid-${Date.now()}`,
      email: user.email,
      role: user.role,
      name: user.name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      message: 'Login successful',
      token,
      user: payload
    });
  } catch (err: any) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Failed to authenticate' });
  }
}

async function sendOTPEmail(email: string, otp: string) {
  const mailOptions = {
    from: '"MaintainIQ" <noreply@maintainiq.com>',
    to: email,
    subject: 'MaintainIQ - Password Reset OTP',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 28px; font-weight: bold;">MaintainIQ</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Smart Asset Maintenance Platform</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
        <p style="font-size: 16px; color: #334155;">Hello,</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">We received a request to reset your password for your MaintainIQ account. Please use the following One-Time Password (OTP) to complete the verification:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #eff6ff; padding: 10px 30px; border-radius: 8px; border: 1px dashed #bfdbfe; display: inline-block;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">This OTP is valid for 10 minutes. If you did not make this request, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 15px;" />
        <p style="font-size: 12px; text-align: center; color: #94a3b8; margin: 0;">&copy; 2026 MaintainIQ. All rights reserved.</p>
      </div>
    `
  };

  const smtpTransporter = getTransporter();

  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail(mailOptions);
      console.log(`[SMTP] Successfully sent OTP email to ${email}`);
    } catch (smtpErr) {
      console.error('[SMTP] Error sending email via SMTP:', smtpErr);
      throw smtpErr; // Rethrow to inform the caller
    }
  } else {
    console.log(`
┌────────────────────────────────────────────────────────┐
│                   MAINTAINIQ SMTP LOG                  │
├────────────────────────────────────────────────────────┤
│ To: ${email.padEnd(51)} │
│ Subject: MaintainIQ - Password Reset OTP               │
│ OTP: ${otp.padEnd(50)} │
└────────────────────────────────────────────────────────┘
    `);
  }
}

export async function requestOTP(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const sanitizedEmail = email.toLowerCase().trim();

    // Simple rate limiting: 1 minute
    const lastRequest = otpRequestStore.get(sanitizedEmail);
    if (lastRequest && Date.now() - lastRequest < 60000) {
        return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }
    otpRequestStore.set(sanitizedEmail, Date.now());

    const user = await dbService.users.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await dbService.users.findOneAndUpdate(
      { email: sanitizedEmail },
      { otp, otpExpires }
    );

    await sendOTPEmail(sanitizedEmail, otp);

    const responsePayload: any = {
      message: 'OTP has been successfully sent to your email.',
      email: sanitizedEmail
    };

    if (process.env.NODE_ENV !== 'production' || !process.env.SMTP_HOST) {
      responsePayload.dev_otp = otp;
    }

    return res.json(responsePayload);
  } catch (err: any) {
    console.error('Request OTP Error:', err);
    return res.status(500).json({ error: 'Failed to generate and send OTP' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }
    const sanitizedEmail = email.toLowerCase().trim();

    const user = await dbService.users.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email.' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid verification OTP.' });
    }

    if (user.otpExpires && new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    await dbService.users.findOneAndUpdate(
      { email: sanitizedEmail },
      { 
        password: hashedPassword, 
        otp: undefined, 
        otpExpires: undefined 
      }
    );

    return res.json({
      message: 'Your password has been successfully reset. You can now log in.'
    });
  } catch (err: any) {
    console.error('Reset Password Error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}

export async function updateTechnicianProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'Technician') {
      return res.status(403).json({ error: 'Forbidden: Only technicians can update their profile.' });
    }

    const { isOnline, category } = req.body;
    const updateFields: any = {};
    if (isOnline !== undefined) updateFields.isOnline = !!isOnline;
    if (category !== undefined) updateFields.category = category;

    const updatedUser = await dbService.users.findOneAndUpdate(
      { email: req.user.email.toLowerCase() },
      updateFields
    );

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err: any) {
    console.error('Update Technician Profile Error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}
