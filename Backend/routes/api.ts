import { Router } from 'express';
import { getIsUsingFallbackDB } from '../config/db.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { demoLogin, syncProfile, getAllUsers, addTechnician, getTechnicians, signUp, login, requestOTP, resetPassword, updateTechnicianProfile } from '../controllers/authController.js';
import {
  getPublicAsset,
  getAllAssets,
  getAssetByCode,
  createAsset,
  updateAsset,
  deleteAsset,
  getAllHistory,
} from '../controllers/assetController.js';
import {
  reportIssue,
  getAllIssues,
  getIssueByNumber,
  updateIssue,
  triageIssueAI,
  suggestIssueDescription,
  getIssueMessages,
  sendIssueMessage,
} from '../controllers/issueController.js';
import { improveWriting } from '../controllers/aiController.js';

const router = Router();

// Diagnostic database status route
router.get('/db-status', (req, res) => {
  res.json({ isUsingFallbackDB: getIsUsingFallbackDB() });
});

// ==========================================
// PUBLIC ROUTES (No Auth Required)
// ==========================================

// Demo authentication endpoint
router.post('/auth/demo-login', demoLogin);

// Standard Authentication
router.post('/auth/signup', signUp);
router.post('/auth/login', login);
router.post('/auth/forgot-password', requestOTP);
router.post('/auth/reset-password', resetPassword);

// Accessed via QR codes to view safe asset details
router.get('/assets/public/:code', getPublicAsset);

// Publicly report an issue
router.post('/issues/public/report', reportIssue);

// Public AI triage endpoint (helps construct complaints)
router.post('/issues/public/triage', triageIssueAI);
router.post('/issues/suggest-description', suggestIssueDescription);
router.post('/ai/improve-writing', improveWriting);


// ==========================================
// PRIVATE ROUTES (Requires JWT authentication & RBAC)
// ==========================================

// Apply verification middleware to all routes below
router.use(verifyToken);

// Profile Synchronization
router.post('/auth/sync-profile', requireRole(['Admin', 'Technician', 'User']), syncProfile);

// Admin User/Technician Management
router.get('/users', requireRole(['Admin']), getAllUsers);
router.get('/technicians', requireRole(['Admin', 'Technician', 'User']), getTechnicians);
router.post('/users/technician', requireRole(['Admin']), addTechnician);
router.put('/technicians/profile', requireRole(['Technician']), updateTechnicianProfile);

// Assets CRUD
router.get('/assets', requireRole(['Admin', 'Technician', 'User']), getAllAssets);
router.get('/assets/:code', requireRole(['Admin', 'Technician']), getAssetByCode);
router.post('/assets', requireRole(['Admin']), createAsset);
router.put('/assets/:code', requireRole(['Admin']), updateAsset);
router.delete('/assets/:code', requireRole(['Admin']), deleteAsset);

// Global history logs
router.get('/history/all', requireRole(['Admin', 'Technician']), getAllHistory);

// Issues CRUD
router.get('/issues', requireRole(['Admin', 'Technician', 'User']), getAllIssues);
router.get('/issues/:issueNumber', requireRole(['Admin', 'Technician', 'User']), getIssueByNumber);
router.put('/issues/:issueNumber', requireRole(['Admin', 'Technician']), updateIssue);

// Group Chat Messages
router.get('/issues/:issueNumber/messages', requireRole(['Admin', 'Technician', 'User']), getIssueMessages);
router.post('/issues/:issueNumber/messages', requireRole(['Admin', 'Technician', 'User']), sendIssueMessage);

export default router;
