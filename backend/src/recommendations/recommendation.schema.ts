import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RecommendationDocument = HydratedDocument<Recommendation>;

@Schema({ timestamps: true })
export class RecommendationItem {
  @Prop({ required: true }) employeeId: string;
  @Prop({ required: true }) score: number;
  @Prop({ required: true }) rank: number;
}

@Schema({ timestamps: true })
export class Recommendation {
  @Prop({ required: true, index: true }) activityId: string;

  @Prop({ type: [RecommendationItem], default: [] })
  list: RecommendationItem[];

  @Prop({ default: false }) hrValidated: boolean;
}

export const RecommendationSchema =
  SchemaFactory.createForClass(Recommendation);
