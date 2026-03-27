import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityDocument = HydratedDocument<Activity>;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true }) title: string;
  @Prop() description?: string;
  @Prop() date?: string; // ISO string ou "YYYY-MM-DD"
  @Prop() location?: string;

  @Prop({ default: 0 }) seats: number;

  // Type: formation, certification, projet, mission, audit
  @Prop({ default: 'formation' })
  type: string;

  // Prioritization context: upskilling (develop LOW), consolidation (MEDIUM→HIGH), expertise (expert)
  @Prop({ default: 'upskilling' })
  prioritization: string; // 'upskilling' | 'consolidation' | 'expertise'

  @Prop({ required: true }) managerId: string; // userId
  @Prop({ required: true }) createdBy: string; // HR userId

  @Prop({ default: 'DRAFT' })
  status:
    | 'DRAFT'
    | 'AI_SUGGESTED'
    | 'HR_VALIDATED'
    | 'SENT_TO_MANAGER'
    | 'MANAGER_CONFIRMED'
    | 'NOTIFIED';

  @Prop({ type: [String], default: [] })
  participants: string[]; // employeeIds (final list)

  @Prop({ type: [String], default: [] })
  required_skills: string[]; // compétences requises pour l'IA
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
