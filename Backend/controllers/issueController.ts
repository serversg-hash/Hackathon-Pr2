import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { dbService } from '../services/dbService.js';
import { GoogleGenAI, Type } from '@google/genai';
import { sanitizeInput } from './assetController.js';

// Lazily initialize Gemini AI to prevent server crashes if the API key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// PUBLIC & PRIVATE ROUTE - Report an issue against an asset
export async function reportIssue(req: AuthRequest, res: Response) {
  try {
    const { assetCode, title, description, priority, category, reporterName, reporterEmail, isAISuggested, isUserEdited, budget } = req.body;

    if (!assetCode || !title || !description || !priority || !category || !reporterName || !reporterEmail) {
      return res.status(400).json({ error: 'Missing required issue report fields' });
    }

    // Input Validation: Alphanumeric asset code validation (allowing dashes and underscores)
    const assetCodeRegex = /^[A-Za-z0-9_-]+$/;
    if (!assetCodeRegex.test(assetCode)) {
      return res.status(400).json({ error: 'Asset code must be alphanumeric (hyphens and underscores allowed).' });
    }

    // Input Validation: Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reporterEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Input Sanitization (script filtering)
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedCategory = sanitizeInput(category);
    const sanitizedReporterName = sanitizeInput(reporterName);
    const sanitizedReporterEmail = reporterEmail.toLowerCase().trim();

    // Verify asset exists
    const asset = await dbService.assets.findOne({ code: assetCode.toUpperCase() });
    if (!asset) {
      return res.status(404).json({ error: `Asset with code "${assetCode}" not found.` });
    }

    // Prevent submitting issues for Retired assets
    if (asset.status === 'Retired') {
      return res.status(400).json({ error: 'Cannot report an issue for a retired asset.' });
    }

    // Create the issue
    const newIssue = await dbService.issues.create({
      assetCode: asset.code,
      title: sanitizedTitle,
      description: sanitizedDescription,
      priority,
      category: sanitizedCategory,
      status: 'Reported',
      reporterName: sanitizedReporterName,
      reporterEmail: sanitizedReporterEmail,
      isAISuggested: !!isAISuggested,
      isUserEdited: !!isUserEdited,
      budget: budget ? Number(budget) : 0,
    });

    // Automatically update the asset's status to "Issue Reported"
    await dbService.assets.findOneAndUpdate({ code: asset.code }, {
      status: 'Issue Reported'
    });

    // Create a history record
    await dbService.history.create({
      action: 'Issue Reported',
      actor: sanitizedReporterName || 'Public User',
      assetCode: asset.code,
      issueNumber: newIssue.issueNumber,
      details: `New issue ${newIssue.issueNumber} reported: "${sanitizedTitle}". Asset status set to "Issue Reported".`,
    });

    return res.status(201).json({
      message: 'Issue reported successfully',
      issue: newIssue,
    });
  } catch (err: any) {
    console.error('Error reporting issue:', err);
    return res.status(500).json({ error: err.message || 'Failed to report issue' });
  }
}

// PRIVATE ROUTE - AI-assisted issue description suggestion
export async function suggestIssueDescription(req: AuthRequest, res: Response) {
  try {
    const { title, assetCode } = req.body;
    if (!title || !assetCode) {
      return res.status(400).json({ error: 'Missing title or assetCode for suggestion' });
    }

    const ai = getGeminiClient();
    const prompt = `Suggest a detailed, professional maintenance issue description for an asset with code "${assetCode}" and issue title "${title}". Keep it concise but helpful for a technician.`;
    
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    
    const suggestion = result.text;
    return res.json({ suggestion });
  } catch (err: any) {
    console.error('Error suggesting issue description:', err);
    // Handle rate limiting
    if (err.status === 429 || err.message?.includes('429')) {
       return res.status(429).json({ error: 'AI service is currently busy. Please try again in a few seconds.' });
    }
    return res.status(500).json({ error: 'Failed to generate suggestion' });
  }
}

// PRIVATE ROUTE - Get all issues (Admin, Technician and standard Users)
export async function getAllIssues(req: AuthRequest, res: Response) {
  try {
    let filter = {};
    // If user is a standard User, restrict them to their own reported issues
    if (req.user?.role === 'User') {
      filter = { reporterEmail: req.user.email.toLowerCase() };
    } else if (req.user?.role === 'Technician') {
      // Technicians only see problems assigned to them
      filter = { assignedTechnician: req.user.name };
    }
    const issues = await dbService.issues.find(filter);
    return res.json({ issues });
  } catch (err: any) {
    console.error('Error fetching issues:', err);
    return res.status(500).json({ error: 'Failed to fetch issues' });
  }
}

// PRIVATE ROUTE - Get issue by issue number (Admin, Technician and standard Users)
export async function getIssueByNumber(req: AuthRequest, res: Response) {
  try {
    const { issueNumber } = req.params;
    const issue = await dbService.issues.findOne({ issueNumber });
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Secure it: standard 'User' role is restricted to their own issues
    if (req.user?.role === 'User' && issue.reporterEmail !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this issue.' });
    }

    // Role Rule: Technicians only see problems assigned to them
    if (req.user?.role === 'Technician' && issue.assignedTechnician !== req.user.name) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this issue.' });
    }

    const asset = await dbService.assets.findOne({ code: issue.assetCode });
    return res.json({ issue, asset });
  } catch (err: any) {
    console.error('Error fetching single issue:', err);
    return res.status(500).json({ error: 'Failed to fetch issue details' });
  }
}

// PRIVATE ROUTE - Update an issue (status workflow, technician notes, parts, cost)
export async function updateIssue(req: AuthRequest, res: Response) {
  try {
    const { issueNumber } = req.params;
    const { status, assignedTechnician, maintenanceNotes, partsReplaced, maintenanceCost, nextServiceDate } = req.body;

    const issue = await dbService.issues.findOne({ issueNumber });
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Role Rule: A technician may update only an issue assigned to them, unless they are Admin
    if (req.user?.role === 'Technician' && issue.assignedTechnician && issue.assignedTechnician !== req.user.name) {
      return res.status(403).json({ error: 'Forbidden: You can only update issues assigned to you.' });
    }

    // Closed rule: A closed issue may not be edited until reopened
    if (issue.status === 'Closed' && status !== 'Reopened' && status !== 'Closed') {
      return res.status(400).json({ error: 'Cannot modify a closed issue. Please reopen it first.' });
    }

    // Validation: Maintenance cost cannot be negative
    if (maintenanceCost !== undefined && maintenanceCost < 0) {
      return res.status(400).json({ error: 'Maintenance cost cannot be negative.' });
    }

    // Validation: An issue should not be resolved without a maintenance note
    if (status === 'Resolved' && (!maintenanceNotes || maintenanceNotes.trim() === '')) {
      return res.status(400).json({ error: 'An issue cannot be marked as "Resolved" without technician maintenance notes.' });
    }

    // Validation: Next service date validation against completion date
    if (status === 'Resolved' && nextServiceDate) {
      const parsedNextService = new Date(nextServiceDate);
      const today = new Date();
      if (parsedNextService < today) {
        return res.status(400).json({ error: 'Next service date cannot be before today/completion date.' });
      }
    }

    // Input Sanitization
    const sanitizedTechnician = assignedTechnician !== undefined ? sanitizeInput(assignedTechnician) : issue.assignedTechnician;
    const sanitizedNotes = maintenanceNotes !== undefined ? sanitizeInput(maintenanceNotes) : issue.maintenanceNotes;
    const sanitizedParts = partsReplaced !== undefined ? sanitizeInput(partsReplaced) : issue.partsReplaced;

    // Compile update fields
    const updateFields: any = {};
    if (status) updateFields.status = status;
    if (assignedTechnician !== undefined) updateFields.assignedTechnician = sanitizedTechnician;
    if (maintenanceNotes !== undefined) updateFields.maintenanceNotes = sanitizedNotes;
    if (partsReplaced !== undefined) updateFields.partsReplaced = sanitizedParts;
    if (maintenanceCost !== undefined) updateFields.maintenanceCost = maintenanceCost;

    const updatedIssue = await dbService.issues.findOneAndUpdate({ issueNumber }, updateFields);

    // Business Rules for Asset Status transitions based on Issue events:
    // New issue submitted -> "Issue Reported" (Handled in reportIssue)
    // Technician begins inspection -> "Under Inspection"
    // Repair work begins -> "Under Maintenance"
    // Maintenance successfully completed (Resolved) -> "Operational"
    // Critical safety issue identified -> "Out of Service"
    // Asset permanently removed -> "Retired"
    let newAssetStatus = '';
    if (status === 'Inspection Started') {
      newAssetStatus = 'Under Inspection';
    } else if (status === 'Maintenance In Progress') {
      newAssetStatus = 'Under Maintenance';
    } else if (status === 'Resolved') {
      newAssetStatus = 'Operational';
    } else if (issue.priority === 'Critical' && status === 'Reported') {
      newAssetStatus = 'Out of Service'; // Critical safety issue identified
    }

    // If Admin explicitly retires the asset or closes issue with retirement, update accordingly
    const asset = await dbService.assets.findOne({ code: issue.assetCode });
    
    // Perform updates to Asset Status if triggered
    const assetUpdates: any = {};
    if (newAssetStatus) {
      assetUpdates.status = newAssetStatus;
    }

    // If marked resolved, update asset dates
    if (status === 'Resolved') {
      assetUpdates.lastServiceDate = new Date();
      if (nextServiceDate) {
        assetUpdates.nextServiceDate = new Date(nextServiceDate);
      } else {
        // Default next service is 6 months from now
        const sixMonthsNow = new Date();
        sixMonthsNow.setMonth(sixMonthsNow.getMonth() + 6);
        assetUpdates.nextServiceDate = sixMonthsNow;
      }
    }

    if (Object.keys(assetUpdates).length > 0) {
      await dbService.assets.findOneAndUpdate({ code: issue.assetCode }, assetUpdates);
    }

    // Create history records
    let detailsStr = `Issue ${issueNumber} status updated to "${status}".`;
    if (assignedTechnician) detailsStr += ` Assigned to ${assignedTechnician}.`;
    if (status === 'Resolved') {
      detailsStr += ` Maintenance completed by ${req.user?.name || 'Technician'}. Cost: $${maintenanceCost || 0}.`;
    }

    await dbService.history.create({
      action: status === 'Resolved' ? 'Maintenance Completed' : 'Issue Updated',
      actor: req.user?.name || 'System Admin',
      assetCode: issue.assetCode,
      issueNumber,
      details: detailsStr,
    });

    return res.json({
      message: 'Issue updated successfully',
      issue: updatedIssue,
    });
  } catch (err: any) {
    console.error('Error updating issue:', err);
    return res.status(500).json({ error: err.message || 'Failed to update issue' });
  }
}

// PUBLIC & PRIVATE ROUTE - Gemini-powered AI Issue Triage
export async function triageIssueAI(req: AuthRequest, res: Response) {
  try {
    const { complaint, assetName, assetCategory, assetCondition, assetLocation } = req.body;

    if (!complaint) {
      return res.status(400).json({ error: 'Complaint description is required' });
    }

    // Check if Gemini is configured/available.
    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      console.warn("Gemini is not configured. Falling back to structured rule-based triage.");
      const mockResult = getRuleBasedTriage(complaint, assetCategory);
      return res.json(mockResult);
    }

    const systemPrompt = `You are an expert AI Triage Assistant for a professional asset maintenance system named "MaintainIQ".
Analyze the user's natural language complaint along with the asset information and generate structured, helpful troubleshooting and classification fields.
You must return a JSON response matching the requested schema.

Guidelines:
- Categorize the issue based on description and asset fields.
- Determine priority: "Low", "Medium", "High", or "Critical". Critical should only be assigned if there is a severe safety hazard (e.g. fire hazard, live wire, structural risk, complete water flood) or direct risk of total damage.
- Provide clear possible causes.
- Provide safe, actionable initial checks. Do NOT provide unsafe instructions for electrical, mechanical, fire, medical, or industrial hazards. Always recommend turning off power sources or calling certified experts if hazard is present.
- Analyze if there is a potential recurring pattern or if the issue sounds critical.`;

    const contents = `Asset Details:
Name: ${assetName || 'Unknown Asset'}
Category: ${assetCategory || 'General'}
Location: ${assetLocation || 'Facility'}
Current Condition: ${assetCondition || 'Fair'}

User's Complaint:
"${complaint}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'A brief, highly professional title summarizing the issue (e.g., "Water leakage and reduced cooling").'
            },
            category: {
              type: Type.STRING,
              description: 'Appropriate classification (e.g., "HVAC / Cooling", "Electrical", "Plumbing", "IT", "Mechanical", "Structural").'
            },
            priority: {
              type: Type.STRING,
              description: 'Must be one of: "Low", "Medium", "High", "Critical".'
            },
            possibleCauses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of 2-3 likely technical causes for this failure.'
            },
            initialChecks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of safe initial diagnostic checks. Recommend qualified technicians for critical/safety-related issues.'
            },
            recurringPatternWarning: {
              type: Type.STRING,
              description: 'A short warning if this pattern indicates repeated failure or safety/preventive action.'
            }
          },
          required: ['title', 'category', 'priority', 'possibleCauses', 'initialChecks']
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text received from Gemini.");
    }

    const structuredResponse = JSON.parse(response.text.trim());
    return res.json({
      success: true,
      data: {
        ...structuredResponse,
        suggestedByAI: true
      }
    });

  } catch (err: any) {
    console.error('AI Triage API error:', err);
    // Graceful fallback to rule-based classification so the product works under all circumstances
    const fallbackResult = getRuleBasedTriage(req.body.complaint || '', req.body.assetCategory || 'General');
    return res.json({
      success: true,
      data: {
        ...fallbackResult,
        suggestedByAI: false,
        warning: 'Using rule-based triage fallback because AI model service is busy or key is missing.'
      }
    });
  }
}

// Simple rule-based triage fallback
function getRuleBasedTriage(complaint: string, assetCategory: string) {
  const lc = complaint.toLowerCase();
  let title = "Reported Maintenance Issue";
  let category = assetCategory || "General";
  let priority = "Medium";
  let possibleCauses = ["General wear and tear", "Needs inspection"];
  let initialChecks = ["Verify if power is connected", "Take photos of the issue for evidence"];

  if (lc.includes("leak") || lc.includes("water") || lc.includes("drip")) {
    title = "Fluid Leakage / Water Drip";
    category = "Plumbing";
    priority = "High";
    possibleCauses = ["Blocked drain pipe", "Damaged seal or valve", "Worn washer"];
    initialChecks = ["Shut off local water supply valve", "Inspect drainage channels for blockages", "Clear surrounding electrical hazards"];
  } else if (lc.includes("noise") || lc.includes("grind") || lc.includes("vibrat")) {
    title = "Abnormal Noise and Vibration";
    category = "Mechanical";
    priority = "Medium";
    possibleCauses = ["Misaligned drive shafts", "Worn bearings", "Loose housing brackets"];
    initialChecks = ["Safely isolate equipment from power", "Inspect for visible loose components", "Do not operate if gears are scraping"];
  } else if (lc.includes("power") || lc.includes("wire") || lc.includes("spark") || lc.includes("electric")) {
    title = "Electrical Failure / Sparking";
    category = "Electrical";
    priority = "Critical";
    possibleCauses = ["Short circuit in starter coil", "Exposed wiring contact", "Overloaded circuit breaker"];
    initialChecks = ["DO NOT TOUCH with bare hands", "Turn off main circuit breaker immediately", "Call a certified electrician for safety"];
  } else if (lc.includes("screen") || lc.includes("display") || lc.includes("flicker") || lc.includes("hdmi") || lc.includes("wifi")) {
    title = "Signal Interference / Display Issue";
    category = "IT / AV";
    priority = "Low";
    possibleCauses = ["Loose cable connection", "Faulty adapter or input port", "Resolution mismatch"];
    initialChecks = ["Unplug and securely reconnect cables", "Test with a different source device", "Verify output resolution settings"];
  } else if (lc.includes("cool") || lc.includes("heat") || lc.includes("ac ") || lc.includes("temperature")) {
    title = "Thermal Performance Degradation";
    category = "HVAC";
    priority = "High";
    possibleCauses = ["Dirty air filter restricting flow", "Low refrigerant levels", "Frozen evaporator coil"];
    initialChecks = ["Verify thermostat is set correctly", "Check air filter cleanliness", "Ensure external exhaust is unobstructed"];
  }

  return {
    title,
    category,
    priority,
    possibleCauses,
    initialChecks,
    recurringPatternWarning: "This is a potential pattern of thermal/mechanical strain. Ensure routine preventative maintenance is scheduled."
  };
}

// PRIVATE ROUTE - Get messages for a specific issue group chat
export async function getIssueMessages(req: AuthRequest, res: Response) {
  try {
    const { issueNumber } = req.params;
    const issue = await dbService.issues.findOne({ issueNumber });
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Customers can only see chats of their own reported issues
    if (req.user?.role === 'User' && issue.reporterEmail !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this chat.' });
    }

    // Role Rule: Technicians only see chats for issues assigned to them
    if (req.user?.role === 'Technician' && issue.assignedTechnician !== req.user.name) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this chat.' });
    }

    const messages = await dbService.messages.find({ issueNumber });
    return res.json({ messages });
  } catch (err: any) {
    console.error('Error fetching issue messages:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
}

// PRIVATE ROUTE - Send a message to the group chat
export async function sendIssueMessage(req: AuthRequest, res: Response) {
  try {
    const { issueNumber } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const issue = await dbService.issues.findOne({ issueNumber });
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Customers can only chat on their own reported issues
    if (req.user?.role === 'User' && issue.reporterEmail !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to chat in this channel.' });
    }

    // Role Rule: Technicians can only chat on issues assigned to them
    if (req.user?.role === 'Technician' && issue.assignedTechnician !== req.user.name) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to chat in this channel.' });
    }

    const sanitizedMessage = sanitizeInput(message);

    const newMessage = await dbService.messages.create({
      issueNumber,
      senderName: req.user?.name || req.user?.email?.split('@')[0] || 'User',
      senderEmail: req.user?.email || 'unknown@maintainiq.com',
      role: req.user?.role || 'User',
      message: sanitizedMessage,
    });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (err: any) {
    console.error('Error sending message:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
}
