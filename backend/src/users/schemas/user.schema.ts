import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Skill level enum
export enum SkillLevel {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
  EXPERT = 'EXPERT',
}

// Numeric score by level (for dynamic scoring)
export const LEVEL_SCORE: Record<string, number> = {
  LOW: 25, MEDIUM: 50, HIGH: 75, EXPERT: 100,
};

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

  // ── Compétences approuvées (avec niveaux) ───────────────────────────
  // Each item: { name: string, level: LOW|MEDIUM|HIGH|EXPERT, score: number }
  @Prop({ type: [{ name: String, level: String, score: Number }], default: [] })
  savoir: { name: string; level: string; score: number }[];

  @Prop({ type: [{ name: String, level: String, score: Number }], default: [] })
  savoir_faire: { name: string; level: string; score: number }[];

  @Prop({ type: [{ name: String, level: String, score: Number }], default: [] })
  savoir_etre: { name: string; level: string; score: number }[];

  // ── Score global dynamique (calculé) ─────────────────────────────
  @Prop({ default: 0 })
  globalScore: number;

  // ── Poste / expérience ────────────────────────────────────────────
  @Prop()
  poste: string;

  @Prop({ default: 0 })
  yearsExperience: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
