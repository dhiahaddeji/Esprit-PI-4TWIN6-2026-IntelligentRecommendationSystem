/**
 * ml.service.ts — HTTP client for the Python ML recommendation service.
 *
 * Falls back gracefully to null if the service is unavailable so the
 * NestJS controller can use its own heuristic instead.
 *
 * Python service must be running at ML_SERVICE_URL (default http://localhost:8000).
 */
import { Injectable, Logger } from '@nestjs/common';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
const TIMEOUT_MS     = 8000;  // abort after 8 s

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);

  // ── Recommendation ──────────────────────────────────────────────────────────
  /**
   * Ask the Python ML service to rank employees for an activity.
   *
   * @returns ranked list or null (if service is down → caller uses heuristic)
   */
  async recommend(
    employees: any[],
    activity:  any,
  ): Promise<any[] | null> {
    const body = {
      employees: employees.map(emp => ({
        employee_id:      emp.employee_id,
        employee_name:    emp.employee_name,
        years_experience: emp.years_experience ?? 0,
        competences: (emp.competences ?? []).map((c: any) => ({
          intitule:        c.intitule,
          type:            c.type ?? 'savoir',
          auto_eval:       c.auto_eval       ?? 0,
          hierarchie_eval: c.hierarchie_eval ?? -1,
        })),
      })),
      activity: {
        activity_id:         String(activity._id),
        activity_type:       activity.type          ?? 'formation',
        prioritization:      activity.prioritization ?? 'expertise',
        seats:               activity.seats          ?? 5,
        competences_requises: (activity.competences_requises ?? []).map((r: any) => ({
          intitule:  r.intitule,
          type:      r.type      ?? 'savoir',
          niveau_min: r.niveau_min ?? 2,
        })),
      },
    };

    try {
      const res = await this._fetch('/recommend', body);
      if (!res || !Array.isArray(res.results)) return null;
      return res.results;
    } catch (err) {
      this.logger.warn(`ML service unreachable (recommend): ${(err as Error).message}`);
      return null;
    }
  }

  // ── Score update after activity completion ──────────────────────────────────
  /**
   * Compute skill score updates for one employee after completing an activity.
   *
   * @returns update result or null if ML service is down
   */
  async updateScores(
    employeeId:    string,
    employeeSkills: any[],
    requiredSkills: any[],
    activityType:  string,
    feedbackMultiplier = 1.0,
  ): Promise<{ updates: any[]; new_skills: any[] } | null> {
    const body = {
      employee_id: employeeId,
      activity_type: activityType,
      feedback_multiplier: feedbackMultiplier,
      employee_skills: employeeSkills.map((s: any) => ({
        intitule:        s.intitule,
        type:            s.type            ?? 'savoir',
        auto_eval:       s.auto_eval       ?? 0,
        hierarchie_eval: s.hierarchie_eval ?? -1,
      })),
      required_skills: requiredSkills.map((r: any) => ({
        intitule:   r.intitule,
        type:       r.type      ?? 'savoir',
        niveau_min: r.niveau_min ?? 2,
      })),
    };

    try {
      const res = await this._fetch('/update-scores', body);
      return res ?? null;
    } catch (err) {
      this.logger.warn(`ML service unreachable (update-scores): ${(err as Error).message}`);
      return null;
    }
  }

  // ── Feedback recording ──────────────────────────────────────────────────────
  /**
   * Send HR/manager validation decisions to the ML service for future retraining.
   * Fires-and-forgets — failures are logged but never thrown.
   */
  async sendFeedback(items: { features: number[]; label: 0 | 1; activity_id: string; employee_id: string }[]): Promise<void> {
    if (!items.length) return;
    try {
      await this._fetch('/feedback', { items });
    } catch (err) {
      this.logger.warn(`ML feedback send failed: ${(err as Error).message}`);
    }
  }

  // ── Health probe ────────────────────────────────────────────────────────────
  async isAvailable(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(`${ML_SERVICE_URL}/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────
  private async _fetch(path: string, body: unknown): Promise<any> {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${ML_SERVICE_URL}${path}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  ctrl.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}
