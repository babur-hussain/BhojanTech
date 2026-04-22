import mongoose, { Document, Schema } from 'mongoose';

export interface IAIChatLog extends Document {
  userMessage: string;
  aiResponse: string;
  contextUsed: string[];
  tokensUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: Date;
}

const AIChatLogSchema: Schema = new Schema({
  userMessage: { type: String, required: true },
  aiResponse: { type: String, required: true },
  contextUsed: [{ type: String }],
  tokensUsage: {
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
  },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<IAIChatLog>('AIChatLog', AIChatLogSchema);
