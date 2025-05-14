import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key. Please set OPENAI_API_KEY environment variable.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}); 