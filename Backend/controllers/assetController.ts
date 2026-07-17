import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { dbService } from '../services/dbService.js';

// Security: script-filtering (HTML tag and script strip/escape)
export function sanitizeInput(str: any): any {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

// PUBLIC ROUTE - Get safe asset info accessed via QR codes without authentication
export async function getPublicAsset(req: AuthRequest, res: Response) {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ error: 'Asset code is required' });
    }

    const asset = await dbService.assets.findOne({ code });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Expose ONLY safe data
    const safeAsset = {
      name: asset.name,
      code: asset.code,
      category: asset.category,
      location: asset.location,
      condition: asset.condition,
      status: asset.status,
      lastServiceDate: asset.lastServiceDate,
      nextServiceDate: asset.nextServiceDate,
    };

    // Expose only safe history (no cost details or private names)
    const rawHistory = await dbService.history.find({ assetCode: asset.code });
    const safeHistory = rawHistory.map((item: any) => ({
      timestamp: item.timestamp,
      action: item.action,
      actor: item.actor === 'System Admin' || item.actor === 'Public User' ? item.actor : 'Technician',
      details: item.details,
    }));

    return res.json({ asset: safeAsset, history: safeHistory });
  } catch (err: any) {
    console.error('Error fetching public asset:', err);
    return res.status(500).json({ error: 'Internal server error while fetching asset info' });
  }
}

// PRIVATE ROUTE - Get all assets (Admin and Technician only)
export async function getAllAssets(req: AuthRequest, res: Response) {
  try {
    const assets = await dbService.assets.find({});
    return res.json({ assets });
  } catch (err: any) {
    console.error('Error fetching all assets:', err);
    return res.status(500).json({ error: 'Failed to fetch assets' });
  }
}

// PRIVATE ROUTE - Get single asset by code (Admin and Technician only)
export async function getAssetByCode(req: AuthRequest, res: Response) {
  try {
    const { code } = req.params;
    const asset = await dbService.assets.findOne({ code });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const history = await dbService.history.find({ assetCode: code });
    const issues = await dbService.issues.find({ assetCode: code });

    return res.json({ asset, history, issues });
  } catch (err: any) {
    console.error('Error fetching asset details:', err);
    return res.status(500).json({ error: 'Failed to fetch asset details' });
  }
}

// PRIVATE ROUTE - Create asset (Admin only)
export async function createAsset(req: AuthRequest, res: Response) {
  try {
    const { name, code, category, location, condition, status, lastServiceDate, nextServiceDate, assignedTechnician } = req.body;

    if (!name || !code || !category || !location || !condition || !lastServiceDate || !nextServiceDate) {
      return res.status(400).json({ error: 'All primary fields are required' });
    }

    // Auto-clean asset code: trim, uppercase, convert spaces and special characters to hyphens
    let sanitizedCode = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '-').replace(/-+/g, '-');
    if (sanitizedCode.endsWith('-')) {
      sanitizedCode = sanitizedCode.slice(0, -1);
    }
    if (sanitizedCode.startsWith('-')) {
      sanitizedCode = sanitizedCode.slice(1);
    }

    if (!sanitizedCode) {
      return res.status(400).json({ error: 'Asset code must contain alphanumeric characters.' });
    }

    // Input Sanitization (XSS and script filtering)
    const sanitizedName = sanitizeInput(name);
    const sanitizedCategory = sanitizeInput(category);
    const sanitizedLocation = sanitizeInput(location);
    const sanitizedCondition = sanitizeInput(condition);
    const sanitizedTechnician = sanitizeInput(assignedTechnician || '');

    // Verify duplicate code
    const existing = await dbService.assets.findOne({ code: sanitizedCode });
    if (existing) {
      return res.status(400).json({ error: `Duplicate asset code: ${sanitizedCode} is already registered.` });
    }

    const newAsset = await dbService.assets.create({
      name: sanitizedName,
      code: sanitizedCode,
      category: sanitizedCategory,
      location: sanitizedLocation,
      condition: sanitizedCondition,
      status: status || 'Operational',
      lastServiceDate: new Date(lastServiceDate),
      nextServiceDate: new Date(nextServiceDate),
      assignedTechnician: sanitizedTechnician,
    });

    // Record History
    await dbService.history.create({
      action: 'Asset Registered',
      actor: req.user?.name || 'System Admin',
      assetCode: sanitizedCode,
      details: `Asset "${sanitizedName}" was created with initial condition "${sanitizedCondition}" and status "${status || 'Operational'}".`,
    });

    return res.status(201).json({ message: 'Asset created successfully', asset: newAsset });
  } catch (err: any) {
    console.error('Error creating asset:', err);
    return res.status(500).json({ error: err.message || 'Failed to create asset' });
  }
}

// PRIVATE ROUTE - Update asset (Admin only)
export async function updateAsset(req: AuthRequest, res: Response) {
  try {
    const { code } = req.params;
    const updateData = req.body;

    const existingAsset = await dbService.assets.findOne({ code });
    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Input Sanitization
    const sanitizedName = updateData.name ? sanitizeInput(updateData.name) : existingAsset.name;
    const sanitizedCategory = updateData.category ? sanitizeInput(updateData.category) : existingAsset.category;
    const sanitizedLocation = updateData.location ? sanitizeInput(updateData.location) : existingAsset.location;
    const sanitizedCondition = updateData.condition ? sanitizeInput(updateData.condition) : existingAsset.condition;
    const sanitizedTechnician = updateData.assignedTechnician !== undefined ? sanitizeInput(updateData.assignedTechnician) : existingAsset.assignedTechnician;

    const updatedAsset = await dbService.assets.findOneAndUpdate({ code }, {
      name: sanitizedName,
      category: sanitizedCategory,
      location: sanitizedLocation,
      condition: sanitizedCondition,
      status: updateData.status,
      lastServiceDate: updateData.lastServiceDate ? new Date(updateData.lastServiceDate) : existingAsset.lastServiceDate,
      nextServiceDate: updateData.nextServiceDate ? new Date(updateData.nextServiceDate) : existingAsset.nextServiceDate,
      assignedTechnician: sanitizedTechnician,
    });

    // Determine what changed for History Log
    let changesDesc = [];
    if (updateData.status && updateData.status !== existingAsset.status) {
      changesDesc.push(`status changed from "${existingAsset.status}" to "${updateData.status}"`);
    }
    if (updateData.condition && updateData.condition !== existingAsset.condition) {
      changesDesc.push(`condition changed from "${existingAsset.condition}" to "${updateData.condition}"`);
    }
    if (updateData.assignedTechnician && updateData.assignedTechnician !== existingAsset.assignedTechnician) {
      changesDesc.push(`technician assigned to "${sanitizedTechnician}"`);
    }

    const details = changesDesc.length > 0 
      ? `Asset "${existingAsset.name}" updated: ${changesDesc.join(', ')}.`
      : `Asset "${existingAsset.name}" profile fields were updated.`;

    await dbService.history.create({
      action: 'Asset Updated',
      actor: req.user?.name || 'System Admin',
      assetCode: code,
      details,
    });

    return res.json({ message: 'Asset updated successfully', asset: updatedAsset });
  } catch (err: any) {
    console.error('Error updating asset:', err);
    return res.status(500).json({ error: 'Failed to update asset' });
  }
}

// PRIVATE ROUTE - Delete asset (Admin only)
export async function deleteAsset(req: AuthRequest, res: Response) {
  try {
    const { code } = req.params;
    const asset = await dbService.assets.findOne({ code });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    await dbService.assets.deleteOne({ code });

    await dbService.history.create({
      action: 'Asset Deleted',
      actor: req.user?.name || 'System Admin',
      assetCode: code,
      details: `Asset "${asset.name}" (${code}) was deleted from the system.`,
    });

    return res.json({ message: 'Asset deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting asset:', err);
    return res.status(500).json({ error: 'Failed to delete asset' });
  }
}

// PRIVATE ROUTE - Get all global history logs (Admin and Technician only)
export async function getAllHistory(req: AuthRequest, res: Response) {
  try {
    const history = await dbService.history.find({});
    return res.json({ history });
  } catch (err: any) {
    console.error('Error fetching global history logs:', err);
    return res.status(500).json({ error: 'Failed to fetch global history logs' });
  }
}
