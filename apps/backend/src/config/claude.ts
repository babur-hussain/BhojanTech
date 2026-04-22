import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY || '';

export const anthropic = new Anthropic({
  apiKey,
});

export const DEFAULT_MODEL = 'claude-opus-4-5';
