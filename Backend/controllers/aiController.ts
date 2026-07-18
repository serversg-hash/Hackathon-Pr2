import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function improveWriting(req: Request, res: Response) {
  const { text, context } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const prompt = `You are "Gen Ai", a professional technical writing assistant for a maintenance and asset management platform.
Your goal is to improve the following text to make it more professional, clear, and descriptive for a maintenance issue report.

Original Text: "${text}"
Context: ${context || 'Maintenance issue report'}

Please provide a polished version of the text. Keep it concise but professional.
Only return the improved text, nothing else.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const improvedText = response.text;

    return res.json({ improvedText });
  } catch (error: any) {
    console.error('AI Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to improve writing' });
  }
}
