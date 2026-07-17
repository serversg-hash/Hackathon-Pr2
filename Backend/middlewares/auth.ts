import { Response, NextFunction } from 'express';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { isFirebaseConfigured } from '../config/firebase-admin.js';
import { getAuth } from 'firebase-admin/auth';
import { dbService } from '../services/dbService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'maintainiq_default_secret_key';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: 'Admin' | 'Technician' | 'User' | 'Public';
    name?: string;
  };
}

// Robust JWT decoder that falls back to manual base64 parsing if needed
function safeDecodeJWT(token: string): any {
  try {
    const decoded = jwt.decode(token);
    if (decoded) return decoded;
  } catch (e) {
    // ignore
  }

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(payloadBase64, 'base64').toString('utf8');
      return JSON.parse(jsonPayload);
    }
  } catch (err) {
    console.error('Manual base64 decoding of token failed:', err);
  }
  return null;
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    try {
      const cookies = req.headers.cookie.split(';').reduce((acc: any, c) => {
        const parts = c.split('=');
        if (parts[0]) {
          acc[parts[0].trim()] = (parts[1] || '').trim();
        }
        return acc;
      }, {});
      if (cookies.token) {
        token = cookies.token;
      }
    } catch (cookieErr) {
      console.error('Error parsing cookies in auth middleware:', cookieErr);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided in header or cookies' });
  }

  // 1. Try checking if it's a signed JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.uid) {
      const userProfile = await dbService.users.findOne({ uid: decoded.uid }) || await dbService.users.findOne({ email: decoded.email?.toLowerCase() });
      const role = userProfile ? userProfile.role : (decoded.role || 'User');
      req.user = {
        uid: decoded.uid,
        email: decoded.email || '',
        role,
        name: userProfile?.name || decoded.name || 'User',
      };
      return next();
    }
  } catch (err: any) {
    // Continue if decoding fails
  }

  // 2. Robust mock token fallback for local preview and development
  if (token.startsWith('mock-token-')) {
    const roleType = token.replace('mock-token-', '').toLowerCase();
    let email = 'unknown@maintainiq.com';
    let role: 'Admin' | 'Technician' | 'User' | 'Public' = 'Public';
    let name = 'Guest';

    if (roleType === 'admin') {
      email = 'admin@maintainiq.com';
      role = 'Admin';
      name = 'System Administrator';
    } else if (roleType === 'technician') {
      email = 'tech.jane@maintainiq.com';
      role = 'Technician';
      name = 'Jane Technician';
    } else if (roleType === 'user') {
      email = 'customer.bob@maintainiq.com';
      role = 'User';
      name = 'Customer Bob';
    }

    req.user = {
      uid: `${roleType}-uid-12345`,
      email,
      role,
      name,
    };
    return next();
  }

  // 3. Real Firebase Token verification
  if (isFirebaseConfigured) {
    try {
      console.log('Verifying Firebase token...');
      const decodedToken = await getAuth().verifyIdToken(token);
      console.log('Firebase token verified, uid:', decodedToken.uid);
      const email = decodedToken.email || '';
      const uid = decodedToken.uid;
      const name = decodedToken.name || email.split('@')[0] || 'User';

      // Look up user in db by uid or email
      let userProfile = await dbService.users.findOne({ uid });
      if (!userProfile && email) {
        userProfile = await dbService.users.findOne({ email: email.toLowerCase() });
        if (userProfile) {
          await dbService.users.findOneAndUpdate({ email: email.toLowerCase() }, { uid });
        }
      }

      let role: 'Admin' | 'Technician' | 'User' = 'User';
      const emailLower = email.toLowerCase();

      // Check if any admin exists
      const adminExists = await dbService.users.findOne({ role: 'Admin' });
      
      if (!adminExists) {
        role = 'Admin';
      } else if (userProfile) {
        role = userProfile.role;
      }

      if (!userProfile) {
        userProfile = await dbService.users.create({
          uid,
          email: emailLower,
          name,
          role,
        });
      }

      req.user = {
        uid,
        email: emailLower,
        role,
        name: userProfile?.name || name,
      };
      return next();
    } catch (err: any) {
      console.error('Firebase Auth Verification Error:', err.message);
      return res.status(403).json({ error: `Forbidden: ${err.message}` });
    }
  } else {
    // Graceful fallback for Firebase ID tokens in sandbox/preview environments
    try {
      const decodedToken = safeDecodeJWT(token);
      if (decodedToken && (decodedToken.sub || decodedToken.uid || decodedToken.email)) {
        // Expiry check (Disabled for development/preview)
        // if (decodedToken.exp && (Date.now() / 1000) > decodedToken.exp) {
        //   console.error('Fallback Auth: Token expired');
        //   return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
        // }

        const email = decodedToken.email || '';
        const uid = decodedToken.sub || decodedToken.uid || `mock-sub-${Date.now()}`;
        const name = decodedToken.name || email.split('@')[0] || 'User';

        // Look up user in db by uid or email
        let userProfile = await dbService.users.findOne({ uid });
        if (!userProfile && email) {
          userProfile = await dbService.users.findOne({ email: email.toLowerCase() });
          if (userProfile) {
            await dbService.users.findOneAndUpdate({ email: email.toLowerCase() }, { uid });
          }
        }

        let role: 'Admin' | 'Technician' | 'User' = 'User';
        const emailLower = email.toLowerCase();
        
        // Check if any admin exists
        const adminExists = await dbService.users.findOne({ role: 'Admin' });
        
        if (!adminExists) {
            role = 'Admin';
        } else if (userProfile) {
          role = userProfile.role;
        }

        if (!userProfile) {
          userProfile = await dbService.users.create({
            uid,
            email: emailLower,
            name,
            role,
          });
        }

        req.user = {
          uid,
          email: emailLower,
          role,
          name: userProfile?.name || name,
        };
        return next();
      }
    } catch (err) {
      console.error('Error in Firebase token fallback decoding:', err);
    }

    return res.status(401).json({
      error: 'Unauthorized: Invalid token or Authentication not configured.',
    });
  }
}

export function requireRole(roles: Array<'Admin' | 'Technician' | 'User' | 'Public'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: This action requires role(s): ${roles.join(', ')}. Current role is ${req.user.role}`,
      });
    }

    next();
  };
}
