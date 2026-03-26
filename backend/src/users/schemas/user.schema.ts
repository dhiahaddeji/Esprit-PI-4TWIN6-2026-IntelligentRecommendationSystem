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

  // ── Onboarding flags ──────────────────────────────────────────────
  /** L'utilisateur doit changer son mot de passe temporaire */
  @Prop({ default: false })
  mustChangePassword: boolean;

  /** Date d'expiration du mot de passe temporaire (24 h) */
  @Prop()
  passwordExpiresAt: Date;

  /** Le profil a été complété (photo, prénom/nom, CV) */
  @Prop({ default: false })
  isProfileComplete: boolean;

  // ── GitHub OAuth ───────────────────────────────────────────────────
  @Prop()
  githubId: string;

  // ── Profil étendu ─────────────────────────────────────────────────
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  photoUrl: string;

  @Prop()
  cvUrl: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
