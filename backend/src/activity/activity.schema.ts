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
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
