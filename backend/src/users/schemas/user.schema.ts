import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

@Schema({ timestamps: true })
export class User {

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  matricule: string;

  @Prop()
  telephone: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  date_embauche: Date;

  @Prop()
  departement_id: string;

  @Prop()
  manager_id: string;

  @Prop({ default: 'ACTIVE' })
  status: string;

  @Prop({ default: false })
  en_ligne: boolean;

  @Prop({ required: true, enum: UserRole })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);