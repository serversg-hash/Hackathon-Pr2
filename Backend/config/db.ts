import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { User } from '../models/user';
import { Asset } from '../models/asset';
import { Issue } from '../models/issue';
import { History } from '../models/history';
import bcrypt from 'bcryptjs';

export let isUsingFallbackDB = false;

export function getIsUsingFallbackDB() {
  return isUsingFallbackDB;
}

const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.resolve(process.cwd(), 'data');
const ASSETS_FILE = path.join(DATA_DIR, 'assets.json');
const ISSUES_FILE = path.join(DATA_DIR, 'issues.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function initFallbackDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ASSETS_FILE)) {
      // Seed some initial assets
      const initialAssets = [
        {
          name: "Classroom Projector 01",
          code: "PROJ-01",
          category: "IT / AV",
          location: "Room 401",
          condition: "Fair",
          status: "Operational",
          lastServiceDate: new Date("2026-05-10T10:00:00Z"),
          nextServiceDate: new Date("2026-11-10T10:00:00Z"),
          assignedTechnician: "Tech Jane",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Central HVAC Compressor",
          code: "HVAC-MAIN",
          category: "HVAC",
          location: "Roof Block B",
          condition: "Good",
          status: "Operational",
          lastServiceDate: new Date("2026-06-01T10:00:00Z"),
          nextServiceDate: new Date("2026-12-01T10:00:00Z"),
          assignedTechnician: "Tech John",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Emergency Power Generator",
          code: "GEN-EMER",
          category: "Electrical",
          location: "Ground Floor Yard",
          condition: "Poor",
          status: "Issue Reported",
          lastServiceDate: new Date("2026-04-15T10:00:00Z"),
          nextServiceDate: new Date("2026-10-15T10:00:00Z"),
          assignedTechnician: "Tech John",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      fs.writeFileSync(ASSETS_FILE, JSON.stringify(initialAssets, null, 2));
    }
    if (!fs.existsSync(ISSUES_FILE)) {
      const initialIssues = [
        {
          issueNumber: "REQ-1001",
          assetCode: "GEN-EMER",
          title: "Generator starter motor grinding noise",
          description: "The emergency generator makes a heavy grinding noise when starting up and fails to ignite on the first try.",
          priority: "High",
          category: "Electrical",
          status: "Reported",
          reporterName: "Alice Admin",
          reporterEmail: "alice@maintainiq.com",
          assignedTechnician: "Tech John",
          maintenanceNotes: "",
          partsReplaced: "",
          maintenanceCost: 0,
          isAISuggested: true,
          isUserEdited: false,
          createdAt: new Date("2026-07-10T09:00:00Z"),
          updatedAt: new Date("2026-07-10T09:00:00Z")
        }
      ];
      fs.writeFileSync(ISSUES_FILE, JSON.stringify(initialIssues, null, 2));
    }
    if (!fs.existsSync(HISTORY_FILE)) {
      const initialHistory = [
        {
          timestamp: new Date("2026-05-10T11:00:00Z"),
          action: "Asset Registered",
          actor: "System Admin",
          assetCode: "PROJ-01",
          details: "Classroom Projector 01 registered into system"
        },
        {
          timestamp: new Date("2026-07-10T09:00:00Z"),
          action: "Issue Reported",
          actor: "Alice Admin",
          assetCode: "GEN-EMER",
          issueNumber: "REQ-1001",
          details: "Issue REQ-1001: Generator starter motor grinding noise reported against GEN-EMER"
        }
      ];
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(initialHistory, null, 2));
    }
    let initialUsers: any[] = [];
    if (fs.existsSync(USERS_FILE)) {
      try {
        initialUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      } catch (e) {
        initialUsers = [];
      }
    }

    const defaultUsers = [
      {
        uid: "admin-uid-12345",
        email: "admin@maintainiq.com",
        name: "System Administrator",
        role: "Admin",
        password: bcrypt.hashSync("password123", 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        uid: "technician-uid-12345",
        email: "tech.jane@maintainiq.com",
        name: "Jane Technician",
        role: "Technician",
        password: bcrypt.hashSync("password123", 10),
        category: "HVAC",
        isOnline: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        uid: "customer-uid-12345",
        email: "customer.bob@maintainiq.com",
        name: "Customer Bob",
        role: "User",
        password: bcrypt.hashSync("password123", 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    let fallbackUpdated = false;
    for (const defU of defaultUsers) {
      const idx = initialUsers.findIndex((u: any) => u.email.toLowerCase() === defU.email.toLowerCase());
      if (idx === -1) {
        initialUsers.push(defU);
        fallbackUpdated = true;
      } else {
        let singleUpdated = false;
        // Verify if password is set and hashes properly to 'password123'
        const isCorrectHash = initialUsers[idx].password && 
                              initialUsers[idx].password.startsWith("$2b$") && 
                              bcrypt.compareSync("password123", initialUsers[idx].password);
        if (!isCorrectHash) {
          initialUsers[idx].password = bcrypt.hashSync("password123", 10);
          singleUpdated = true;
        }
        if (!initialUsers[idx].uid) {
          initialUsers[idx].uid = defU.uid;
          singleUpdated = true;
        }
        if (defU.category && !initialUsers[idx].category) {
          initialUsers[idx].category = defU.category;
          singleUpdated = true;
        }
        if (singleUpdated) {
          initialUsers[idx].updatedAt = new Date().toISOString();
          fallbackUpdated = true;
        }
      }
    }

    if (fallbackUpdated || !fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
    }

    if (!fs.existsSync(MESSAGES_FILE)) {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2));
    }
  } catch (err) {
    console.error("Error initializing fallback database files:", err);
  }
}

async function seedMongoDBUsers() {
  try {
    const defaultUsers = [
      {
        uid: "admin-uid-12345",
        email: "admin@maintainiq.com",
        name: "System Administrator",
        role: "Admin",
        password: bcrypt.hashSync("password123", 10)
      },
      {
        uid: "technician-uid-12345",
        email: "tech.jane@maintainiq.com",
        name: "Jane Technician",
        role: "Technician",
        password: bcrypt.hashSync("password123", 10),
        category: "HVAC",
        isOnline: true
      },
      {
        uid: "customer-uid-12345",
        email: "customer.bob@maintainiq.com",
        name: "Customer Bob",
        role: "User",
        password: bcrypt.hashSync("password123", 10)
      }
    ];

    for (const u of defaultUsers) {
      const exists = await (User as any).findOne({ email: u.email.toLowerCase() });
      if (!exists) {
        await (User as any).create(u);
        console.log(`[MongoDB Seed] Created user: ${u.email}`);
      } else {
        const isCorrectHash = exists.password && 
                              exists.password.startsWith("$2b$") && 
                              bcrypt.compareSync("password123", exists.password);
        if (!isCorrectHash) {
          exists.password = bcrypt.hashSync("password123", 10);
          await exists.save();
          console.log(`[MongoDB Seed] Reset/Updated password hash for: ${u.email}`);
        }
      }
    }
  } catch (err) {
    console.error("Failed to seed MongoDB default users:", err);
  }
}

async function seedMongoDBData() {
  try {
    const assetCount = await Asset.countDocuments();
    if (assetCount === 0) {
      const initialAssets = [
        {
          name: "Classroom Projector 01",
          code: "PROJ-01",
          category: "IT / AV",
          location: "Room 401",
          condition: "Fair",
          status: "Operational",
          lastServiceDate: new Date("2026-05-10T10:00:00Z"),
          nextServiceDate: new Date("2026-11-10T10:00:00Z"),
          assignedTechnician: "Tech Jane"
        },
        {
          name: "Central HVAC Compressor",
          code: "HVAC-MAIN",
          category: "HVAC",
          location: "Roof Block B",
          condition: "Good",
          status: "Operational",
          lastServiceDate: new Date("2026-06-01T10:00:00Z"),
          nextServiceDate: new Date("2026-12-01T10:00:00Z"),
          assignedTechnician: "Tech John"
        },
        {
          name: "Emergency Power Generator",
          code: "GEN-EMER",
          category: "Electrical",
          location: "Ground Floor Yard",
          condition: "Poor",
          status: "Issue Reported",
          lastServiceDate: new Date("2026-04-15T10:00:00Z"),
          nextServiceDate: new Date("2026-10-15T10:00:00Z"),
          assignedTechnician: "Tech John"
        }
      ];
      await Asset.insertMany(initialAssets as any);
      console.log("[MongoDB Seed] Created default assets successfully!");
    }

    const issueCount = await Issue.countDocuments();
    if (issueCount === 0) {
      const assetDoc = await Asset.findOne({ code: "GEN-EMER" } as any);
      const initialIssues = [
        {
          issueNumber: "REQ-1001",
          assetCode: "GEN-EMER",
          asset: assetDoc ? assetDoc._id : undefined,
          title: "Generator starter motor grinding noise",
          description: "The emergency generator makes a heavy grinding noise when starting up and fails to ignite on the first try.",
          priority: "High",
          category: "Electrical",
          status: "Reported",
          reporterName: "Alice Admin",
          reporterEmail: "alice@maintainiq.com",
          assignedTechnician: "Tech John",
          maintenanceNotes: "",
          partsReplaced: "",
          maintenanceCost: 0,
          isAISuggested: true,
          isUserEdited: false
        }
      ];
      await Issue.insertMany(initialIssues as any);
      console.log("[MongoDB Seed] Created default issues successfully!");
    }

    const historyCount = await History.countDocuments();
    if (historyCount === 0) {
      const projDoc = await Asset.findOne({ code: "PROJ-01" } as any);
      const genDoc = await Asset.findOne({ code: "GEN-EMER" } as any);
      const initialHistory = [
        {
          timestamp: new Date("2026-05-10T11:00:00Z"),
          action: "Asset Registered",
          actor: "System Admin",
          assetCode: "PROJ-01",
          asset: projDoc ? projDoc._id : undefined,
          details: "Classroom Projector 01 registered into system"
        },
        {
          timestamp: new Date("2026-07-10T09:00:00Z"),
          action: "Issue Reported",
          actor: "Alice Admin",
          assetCode: "GEN-EMER",
          asset: genDoc ? genDoc._id : undefined,
          issueNumber: "REQ-1001",
          details: "Issue REQ-1001: Generator starter motor grinding noise reported against GEN-EMER"
        }
      ];
      await History.insertMany(initialHistory as any);
      console.log("[MongoDB Seed] Created default history successfully!");
    }
  } catch (err) {
    console.error("Failed to seed MongoDB data:", err);
  }
}

export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (mongoose.connection.readyState >= 1) {
    return;
  }

  if (!mongoURI) {
    console.warn("WARNING: MONGODB_URI or MONGO_URI is not set in environment variables! Falling back to JSON local file-based database.");
    isUsingFallbackDB = true;
    initFallbackDB();
    return;
  }

  try {
    console.log("Connecting to MongoDB Atlas...");
    // Set a timeout for Mongoose connection
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Successfully connected to MongoDB Atlas. Strictly using MongoDB for all data tasks.");
    isUsingFallbackDB = false;
    
    // Seed default users in MongoDB Atlas
    await seedMongoDBUsers();
    // Seed default assets, issues, and histories in MongoDB Atlas
    await seedMongoDBData();
  } catch (err: any) {
    console.error("WARNING: Failed to connect to MongoDB Atlas! Falling back to JSON local file-based database. Error:", err.message || err);
    isUsingFallbackDB = true;
    initFallbackDB();
  }
}

// Validation helper regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const assetCodeRegex = /^[A-Za-z0-9_-]+$/;

function validateAsset(data: any, isUpdate = false) {
  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('ValidationError: Asset name is required.');
    }
    if (!data.code || typeof data.code !== 'string' || !assetCodeRegex.test(data.code)) {
      throw new Error('ValidationError: Asset code is required and must be alphanumeric (allowing hyphens/underscores).');
    }
    if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
      throw new Error('ValidationError: Asset category is required.');
    }
    if (!data.location || typeof data.location !== 'string' || data.location.trim() === '') {
      throw new Error('ValidationError: Asset location is required.');
    }
    if (!data.condition || typeof data.condition !== 'string' || data.condition.trim() === '') {
      throw new Error('ValidationError: Asset condition is required.');
    }
  }

  if (data.status !== undefined) {
    const validStatuses = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired'];
    if (!validStatuses.includes(data.status)) {
      throw new Error(`ValidationError: Invalid status "${data.status}". Must be one of: ${validStatuses.join(', ')}.`);
    }
  }
}

function validateIssue(data: any, isUpdate = false) {
  if (!isUpdate) {
    if (!data.assetCode || typeof data.assetCode !== 'string') {
      throw new Error('ValidationError: Asset code is required.');
    }
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new Error('ValidationError: Issue title is required.');
    }
    if (!data.description || typeof data.description !== 'string' || data.description.trim() === '') {
      throw new Error('ValidationError: Issue description is required.');
    }
    if (!data.reporterName || typeof data.reporterName !== 'string' || data.reporterName.trim() === '') {
      throw new Error('ValidationError: Reporter name is required.');
    }
    if (!data.reporterEmail || typeof data.reporterEmail !== 'string' || !emailRegex.test(data.reporterEmail)) {
      throw new Error('ValidationError: Valid reporter email is required.');
    }
  } else {
    if (data.reporterEmail !== undefined && !emailRegex.test(data.reporterEmail)) {
      throw new Error('ValidationError: Valid reporter email is required.');
    }
  }

  if (data.priority !== undefined) {
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(data.priority)) {
      throw new Error(`ValidationError: Invalid priority "${data.priority}". Must be one of: ${validPriorities.join(', ')}.`);
    }
  }

  if (data.status !== undefined) {
    const validStatuses = ['Reported', 'Assigned', 'Inspection Started', 'Maintenance In Progress', 'Waiting for Parts', 'Resolved', 'Closed', 'Reopened'];
    if (!validStatuses.includes(data.status)) {
      throw new Error(`ValidationError: Invalid status "${data.status}". Must be one of: ${validStatuses.join(', ')}.`);
    }
  }

  if (data.maintenanceCost !== undefined && (typeof data.maintenanceCost !== 'number' || data.maintenanceCost < 0)) {
    throw new Error('ValidationError: Maintenance cost cannot be negative.');
  }
}

function validateHistory(data: any) {
  if (!data.action || typeof data.action !== 'string' || data.action.trim() === '') {
    throw new Error('ValidationError: Action is required.');
  }
  if (!data.actor || typeof data.actor !== 'string' || data.actor.trim() === '') {
    throw new Error('ValidationError: Actor is required.');
  }
  if (!data.assetCode || typeof data.assetCode !== 'string' || data.assetCode.trim() === '') {
    throw new Error('ValidationError: Asset code is required.');
  }
}

// Fallback JSON-based Database Operations
export const fallbackStore = {
  assets: {
    find: async (filter: any = {}) => {
      initFallbackDB();
      const assets = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));
      return assets.filter((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
    },
    findOne: async (filter: any) => {
      initFallbackDB();
      const assets = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));
      return assets.find((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      }) || null;
    },
    create: async (data: any) => {
      initFallbackDB();
      validateAsset(data);
      const assets = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));
      const exists = assets.find((a: any) => a.code.toLowerCase() === data.code.toLowerCase());
      if (exists) {
        throw new Error(`Asset code ${data.code} already exists.`);
      }
      const newAsset = { ...data, createdAt: new Date(), updatedAt: new Date() };
      assets.push(newAsset);
      fs.writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2));
      return newAsset;
    },
    findOneAndUpdate: async (filter: any, update: any) => {
      initFallbackDB();
      validateAsset(update, true);
      const assets = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));
      const index = assets.findIndex((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
      if (index === -1) return null;
      const updated = { ...assets[index], ...update, updatedAt: new Date() };
      assets[index] = updated;
      fs.writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2));
      return updated;
    },
    deleteOne: async (filter: any) => {
      initFallbackDB();
      let assets = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));
      const initialLength = assets.length;
      assets = assets.filter((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return true; // Keep if not matching filter (i.e. not deleted)
        }
        return false; // Remove if matching filter (i.e. deleted)
      });
      fs.writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2));
      return { deletedCount: initialLength - assets.length };
    }
  },

  issues: {
    find: async (filter: any = {}) => {
      initFallbackDB();
      const issues = JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'));
      return issues.filter((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
    },
    findOne: async (filter: any) => {
      initFallbackDB();
      const issues = JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'));
      return issues.find((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      }) || null;
    },
    create: async (data: any) => {
      initFallbackDB();
      validateIssue(data);
      const issues = JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'));
      const lastIssue = issues[issues.length - 1];
      let nextNum = 1002;
      if (lastIssue && lastIssue.issueNumber) {
        const numPart = parseInt(lastIssue.issueNumber.replace('REQ-', ''));
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }
      const issueNumber = `REQ-${nextNum}`;
      const newIssue = {
        ...data,
        issueNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
        maintenanceNotes: data.maintenanceNotes || "",
        partsReplaced: data.partsReplaced || "",
        maintenanceCost: data.maintenanceCost || 0
      };
      issues.push(newIssue);
      fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2));
      return newIssue;
    },
    findOneAndUpdate: async (filter: any, update: any) => {
      initFallbackDB();
      validateIssue(update, true);
      const issues = JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'));
      const index = issues.findIndex((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
      if (index === -1) return null;
      const updated = { ...issues[index], ...update, updatedAt: new Date() };
      issues[index] = updated;
      fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2));
      return updated;
    }
  },

  history: {
    find: async (filter: any = {}) => {
      initFallbackDB();
      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      const filtered = history.filter((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
      // Sort by timestamp desc
      return filtered.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    create: async (data: any) => {
      initFallbackDB();
      validateHistory(data);
      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      const newEntry = { ...data, timestamp: new Date() };
      history.push(newEntry);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
      return newEntry;
    }
  },
  users: {
    find: async (filter: any = {}) => {
      initFallbackDB();
      const items = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      return items.filter((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
    },
    findOne: async (filter: any) => {
      initFallbackDB();
      const items = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      return items.find((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      }) || null;
    },
    create: async (data: any) => {
      initFallbackDB();
      const items = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      const exists = items.find((a: any) => a.email.toLowerCase() === data.email.toLowerCase());
      if (exists) {
        const updated = { ...exists, ...data, updatedAt: new Date() };
        const idx = items.findIndex((a: any) => a.email.toLowerCase() === data.email.toLowerCase());
        items[idx] = updated;
        fs.writeFileSync(USERS_FILE, JSON.stringify(items, null, 2));
        return updated;
      }
      const newItem = { ...data, createdAt: new Date(), updatedAt: new Date() };
      items.push(newItem);
      fs.writeFileSync(USERS_FILE, JSON.stringify(items, null, 2));
      return newItem;
    },
    findOneAndUpdate: async (filter: any, update: any) => {
      initFallbackDB();
      const items = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      const index = items.findIndex((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
      if (index === -1) {
        if (filter.email) {
          const newItem = { ...filter, ...update, createdAt: new Date(), updatedAt: new Date() };
          items.push(newItem);
          fs.writeFileSync(USERS_FILE, JSON.stringify(items, null, 2));
          return newItem;
        }
        return null;
      }
      const updated = { ...items[index], ...update, updatedAt: new Date() };
      items[index] = updated;
      fs.writeFileSync(USERS_FILE, JSON.stringify(items, null, 2));
      return updated;
    }
  },
  messages: {
    find: async (filter: any = {}) => {
      initFallbackDB();
      const items = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
      return items.filter((item: any) => {
        for (const key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
    },
    create: async (data: any) => {
      initFallbackDB();
      const items = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
      const newItem = { ...data, timestamp: new Date() };
      items.push(newItem);
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(items, null, 2));
      return newItem;
    }
  }
};
