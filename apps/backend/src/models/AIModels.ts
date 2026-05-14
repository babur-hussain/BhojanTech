import mongoose, { Schema, Document } from 'mongoose';

export interface IAIConversation extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  userId: string;
  sessionId: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    tokensUsed?: number;
  }[];
  contextSnapshot?: Record<string, any>;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAIInsight extends Document {
  restaurantId: mongoose.Types.ObjectId;
  date: string;
  insights: {
    type: 'SALES' | 'INVENTORY' | 'STAFF' | 'MENU' | 'GENERAL';
    title: string;
    body: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  generatedAt: Date;
}

const AIConversationSchema = new Schema<IAIConversation>({
  restaurantId: { type: Schema.Types.ObjectId, required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  userId: { type: String, required: true },
  sessionId: { type: String, required: true, index: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tokensUsed: { type: Number },
  }],
  contextSnapshot: { type: Schema.Types.Mixed },
  totalTokens: { type: Number, default: 0 },
}, { timestamps: true });

const AIInsightSchema = new Schema<IAIInsight>({
  restaurantId: { type: Schema.Types.ObjectId, required: true, index: true },
  date: { type: String, required: true },
  insights: [{
    type: { type: String, enum: ['SALES', 'INVENTORY', 'STAFF', 'MENU', 'GENERAL'] },
    title: { type: String, required: true },
    body: { type: String, required: true },
    priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  }],
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

AIInsightSchema.index({ restaurantId: 1, date: 1 }, { unique: true });

AIConversationSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const AIConversation = mongoose.models.AIConversation || mongoose.model<IAIConversation>('AIConversation', AIConversationSchema);
export const AIInsight = mongoose.models.AIInsight || mongoose.model<IAIInsight>('AIInsight', AIInsightSchema);
