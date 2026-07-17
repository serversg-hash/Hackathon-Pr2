import { getIsUsingFallbackDB, fallbackStore } from '../config/db.js';
import { Asset } from '../models/asset.js';
import { Issue } from '../models/issue.js';
import { History } from '../models/history.js';
import { User } from '../models/user.js';
import { Message } from '../models/message.js';

export const dbService = {
  assets: {
    find: async (filter: any = {}) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.assets.find(filter);
      }
      return await Asset.find(filter).lean();
    },
    findOne: async (filter: any) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.assets.findOne(filter);
      }
      return await Asset.findOne(filter).lean();
    },
    create: async (data: any) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.assets.create(data);
      }
      const newAsset = new Asset(data);
      return await newAsset.save();
    },
    findOneAndUpdate: async (filter: any, update: any) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.assets.findOneAndUpdate(filter, update);
      }
      return await (Asset as any).findOneAndUpdate(filter, update, { new: true }).lean();
    },
    deleteOne: async (filter: any) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.assets.deleteOne(filter);
      }
      return await Asset.deleteOne(filter);
    }
  },

  issues: {
    find: async (filter: any = {}) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.issues.find(filter);
      }
      return await Issue.find(filter).lean();
    },
    findOne: async (filter: any) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.issues.findOne(filter);
      }
      return await Issue.findOne(filter).lean();
    },
    create: async (data: any) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.issues.create(data);
      }
      // Populate relational asset reference
      const assetDoc = await (Asset as any).findOne({ code: data.assetCode });
      const count = await Issue.countDocuments();
      const issueNumber = `REQ-${1001 + count}`;
      const newIssue = new Issue({
        ...data,
        asset: assetDoc ? assetDoc._id : undefined,
        issueNumber
      });
      return await newIssue.save();
    },
    findOneAndUpdate: async (filter: any, update: any) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.issues.findOneAndUpdate(filter, update);
      }
      return await (Issue as any).findOneAndUpdate(filter, update, { new: true }).lean();
    }
  },

  history: {
    find: async (filter: any = {}) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.history.find(filter);
      }
      return await History.find(filter).sort({ timestamp: -1 }).lean();
    },
    create: async (data: any) => {
      if (getIsUsingFallbackDB()) {
        return await fallbackStore.history.create(data);
      }
      // Populate relational asset reference
      const assetDoc = await (Asset as any).findOne({ code: data.assetCode });
      const newHistory = new History({
        ...data,
        asset: assetDoc ? assetDoc._id : undefined
      });
      return await newHistory.save();
    }
  },
  users: {
    find: async (filter: any = {}) => {
      if (getIsUsingFallbackDB()) {
        return await (fallbackStore as any).users.find(filter);
      }
      return await User.find(filter).lean();
    },
    findOne: async (filter: any) => {
      if (getIsUsingFallbackDB()) {
        return await (fallbackStore as any).users.findOne(filter);
      }
      return await User.findOne(filter).lean();
    },
    create: async (data: any) => {
      if (getIsUsingFallbackDB()) {
        return await (fallbackStore as any).users.create(data);
      }
      const newUser = new User(data);
      return await newUser.save();
    },
    findOneAndUpdate: async (filter: any, update: any) => {
      if (getIsUsingFallbackDB()) {
        return await (fallbackStore as any).users.findOneAndUpdate(filter, update);
      }
      return await (User as any).findOneAndUpdate(filter, update, { new: true, upsert: true }).lean();
    }
  },
  messages: {
    find: async (filter: any = {}) => {
      if (getIsUsingFallbackDB()) {
        return await (fallbackStore as any).messages.find(filter);
      }
      return await Message.find(filter).sort({ timestamp: 1 }).lean();
    },
    create: async (data: any) => {
      if (getIsUsingFallbackDB()) {
        return await (fallbackStore as any).messages.create(data);
      }
      const newMessage = new Message(data);
      return await newMessage.save();
    }
  }
};
