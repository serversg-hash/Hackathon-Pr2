import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { User } from '../models/user';
import { Asset } from '../models/asset';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ASSETS_FILE = path.join(DATA_DIR, 'assets.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function migrate() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    const assetsData = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));

    await User.deleteMany({});
    await User.insertMany(usersData);
    console.log(`Migrated ${usersData.length} users to MongoDB`);

    await Asset.deleteMany({});
    await Asset.insertMany(assetsData);
    console.log(`Migrated ${assetsData.length} assets to MongoDB`);

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
