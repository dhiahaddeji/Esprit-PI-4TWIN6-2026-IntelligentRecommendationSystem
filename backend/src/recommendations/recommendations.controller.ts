import { Body, Controller, Get, Logger, Param, Patch, Post, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RecommendationsService } from './recommendations.service';
import { ActivitiesService } from '../activity/activity.service';
import { CompetencesService } from '../competences/competences.service';
import { InvitationsService } from '../invitations/invitations.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MlService } from './ml.service';

// Context weights by prioritization strategy
const CONTEXT_WEIGHTS: Record<string, Record<number, number>> = {
  upskilling:    { 0: 1.5, 1: 1.3, 2: 1.0, 3: 0.7, 4: 0.4 },
  consolidation: { 0: 0.5, 1: 0.9, 2: 1.5, 3: 1.2, 4: 0.8 },
  expertise:     { 0: 0.2, 1: 0.5, 2: 0.8, 3: 1.3, 4: 1.8 },
};

const EVAL_LABELS = ['Pas de compétence', 'Notions', 'Pratique', 'Maîtrise', 'Expert'];

@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationsController {
  private readonly logger = new Logger(RecommendationsController.name);

  constructor(
    private readonly recService: RecommendationsService,
    private readonly activitiesService: ActivitiesService,
    private readonly compSvc: CompetencesService,
    private readonly invService: InvitationsService,
    private readonly usersService: UsersService,
    private readonly notifService: NotificationsService,
    private readonly mlService: MlService,
  ) {}

  // ── GET recommendation for an activity ──────────────────────────────
  @Roles('HR', 'MANAGER', 'SUPERADMIN')
  @Get(':activityId')
  get(@Param('activityId') activityId: string) {
    return this.recService.getByActivity(activityId);
  }

  // ── ML matching: calls Python service, falls back to heuristic ──────────
  @Roles('HR', 'SUPERADMIN')
  @Post(':activityId/run-ai')
  async runAI(@Param('activityId') activityId: string) {
    const activity = await this.activitiesService.findById(activityId);
    if (!activity) throw new NotFoundException('Activité introuvable');

    const existingRec  = await this.recService.getByActivity(activityId);
    const refusedIds: string[] = (existingRec as any)?.refusedEmployees || [];

    let allEmployees = await this.compSvc.getAllEmployeesCompetences() as any[];
    if (refusedIds.length > 0) {
      allEmployees = allEmployees.filter((e: any) => !refusedIds.includes(e.employee_id));
    }
    if (allEmployees.length === 0) {
      throw new BadRequestException(
        'Aucun employé éligible avec des compétences validées (certains ont été exclus par le manager).',
      );
    }

    const availabilityMap = await this.buildAvailabilityMap(activity, allEmployees);
    const seats: number   = (activity as any).seats || 5;

    // ── 1. Try Python ML service ──────────────────────────────────────────
    let list: any[] | null = null;
    const mlResults = await this.mlService.recommend(allEmployees, activity);

    if (mlResults && mlResults.length > 0) {
      this.logger.log(`ML service used for activity ${activityId} (${mlResults.length} results)`);
      list = mlResults.map((r: any, idx: number) => ({
        employeeId:       r.employee_id,
        employeeName:     r.employee_name,
        score:            r.score,
        rank:             idx + 1,
        status:           r.status,
        availability:     availabilityMap.get(r.employee_id) ?? { status: 'AVAILABLE', reason: null, assignmentCount: 0, conflictActivityIds: [] },
        details:          r.details ?? [],
        matchedSkills:    r.matched_skills ?? [],
        missingSkills:    r.missing_skills ?? [],
        totalCompetences: r.total_competences ?? 0,
        meetsAll:         r.meets_all        ?? false,
        meetsCount:       r.meets_count      ?? 0,
        explanation:      r.explanation      ?? '',
      }));
    } else {
      // ── 2. Fallback: built-in heuristic ────────────────────────────────
      this.logger.warn(`ML service unavailable — using heuristic for activity ${activityId}`);
      list = this.runHeuristic(allEmployees, activity, availabilityMap, seats, refusedIds);
    }

    await this.activitiesService.update(activityId, { status: 'AI_SUGGESTED' });
    return this.recService.upsert(activityId, list, false, refusedIds);
  }

  // ── Heuristic scoring (fallback when ML service is down) ─────────────────
  private runHeuristic(
    allEmployees: any[],
    activity: any,
    availabilityMap: Map<string, any>,
    seats: number,
    _refusedIds: string[],
  ): any[] {
    const reqs: any[]     = activity.competences_requises || [];
    const prioritization  = activity.prioritization || 'expertise';
    const activityType    = activity.type || 'formation';
    const isCertification = activityType === 'certification';
    const ctxW            = CONTEXT_WEIGHTS[prioritization] || CONTEXT_WEIGHTS.expertise;
    const totalReqs       = reqs.length;

    const scored = allEmployees.map(emp => {
      const details: any[]          = [];
      const matchedSkills: string[] = [];
      const missingSkills: string[] = [];
      let levelRatioSum = 0;
      let matchedCount  = 0;

      const availability = availabilityMap.get(emp.employee_id);

      for (const req of reqs) {
        const reqName = req.intitule.toLowerCase();
        const match   = emp.competences.find((c: any) =>
          c.intitule.toLowerCase().includes(reqName) ||
          reqName.includes(c.intitule.toLowerCase()) ||
          this.partialMatch(c.intitule.toLowerCase(), reqName),
        );

        if (match) {
          const evalScore  = match.hierarchie_eval >= 0 ? match.hierarchie_eval : match.auto_eval;
          const reqLevel   = req.niveau_min ?? 2;
          const levelRatio = reqLevel > 0 ? Math.min(1, evalScore / reqLevel) : (evalScore > 0 ? 1 : 0);
          const ctxWeight  = ctxW[evalScore] ?? 1;
          levelRatioSum += levelRatio;
          matchedCount++;
          matchedSkills.push(req.intitule);
          details.push({
            intitule: req.intitule, employee_level: evalScore, required_level: reqLevel,
            meets_minimum: evalScore >= reqLevel, level_ratio: Math.round(levelRatio * 100) / 100,
            ctx_score: Math.round(evalScore * ctxWeight * 10) / 10,
            emp_label: EVAL_LABELS[evalScore] ?? '—', req_label: EVAL_LABELS[reqLevel] ?? '—',
          });
        } else {
          missingSkills.push(req.intitule);
          details.push({
            intitule: req.intitule, employee_level: -1, required_level: req.niveau_min ?? 2,
            meets_minimum: false, level_ratio: 0, ctx_score: 0,
            emp_label: 'Non renseigné', req_label: EVAL_LABELS[req.niveau_min ?? 2] ?? '—',
          });
        }
      }

      const meetsCount    = details.filter(d => d.meets_minimum).length;
      const meetsAll      = totalReqs > 0 && meetsCount === totalReqs;
      const avgLevelRatio = matchedCount > 0 ? levelRatioSum / matchedCount : 0;

      let rawScore: number;
      if (isCertification) {
        const skillGap  = totalReqs > 0 ? ((totalReqs - matchedCount) / totalReqs) * 55 : 0;
        const levelGap  = matchedCount > 0 ? (1 - avgLevelRatio) * 35 : 35;
        const activeEmp = Math.min(1, emp.competences.length / 10) * 10;
        rawScore = skillGap + levelGap + activeEmp;
      } else {
        rawScore =
          (totalReqs > 0 ? (matchedCount / totalReqs) * 50 : 50) +
          (matchedCount > 0 ? avgLevelRatio * 30 : 0) +
          Math.min(1, emp.competences.length / 15) * 10 +
          (totalReqs > 0 ? (meetsCount / totalReqs) * 10 : 10);
      }

      const explanation = isCertification
        ? this.buildCertExplanation(missingSkills, meetsCount, totalReqs, matchedCount, avgLevelRatio)
        : this.buildExplanation([], matchedSkills, missingSkills, meetsCount, totalReqs, emp.competences.length);

      return {
        employeeId: emp.employee_id, employeeName: emp.employee_name,
        score: Math.min(100, Math.round(rawScore)), rank_score: rawScore,
        availability, details, matchedSkills, missingSkills,
        totalCompetences: emp.competences.length, meetsAll, meetsCount, explanation,
      };
    });

    scored.sort((a, b) => b.rank_score - a.rank_score);
    const limit = Math.min(scored.length, seats + 2);
    return scored.slice(0, limit).map((e, idx) => ({
      employeeId: e.employeeId, employeeName: e.employeeName,
      score: e.score, rank: idx + 1,
      status: idx < seats ? 'Selected' : 'Backup',
      availability: e.availability, details: e.details,
      matchedSkills: e.matchedSkills, missingSkills: e.missingSkills,
      totalCompetences: e.totalCompetences, meetsAll: e.meetsAll,
      meetsCount: e.meetsCount, explanation: e.explanation,
    }));
  }

  // ── HR: update the selection (add/remove employees) ──────────────────
  @Roles('HR', 'SUPERADMIN')
  @Patch(':activityId')
  updateList(
    @Param('activityId') activityId: string,
    @Body() body: { list: any[] },
  ) {
    return this.recService.upsert(activityId, body.list || [], false);
  }

  // ── HR: validate list → send to manager for review (NOT to employees) ─
  @Roles('HR', 'SUPERADMIN')
  @Patch(':activityId/validate')
  async validate(@Param('activityId') activityId: string) {
    const rec = await this.recService.getByActivity(activityId);
    if (!rec?.list?.length) {
      throw new BadRequestException('Aucun employé sélectionné. Lancez l\'IA et sélectionnez des employés.');
    }

    const activity = await this.activitiesService.findById(activityId);
    if (!activity) throw new NotFoundException('Activité introuvable');

    const stubEmployees = (rec.list as any[]).map((item: any) => ({
      employee_id: item.employeeId,
    }));
    const availabilityMap = await this.buildAvailabilityMap(activity, stubEmployees);
    const busyEmployees = (rec.list as any[]).filter((item: any) => {
      const availability = availabilityMap.get(item.employeeId);
      return availability?.status === 'BUSY';
    });

    if (busyEmployees.length) {
      const names = busyEmployees
        .map((c: any) => c.employeeName || c.employeeId)
        .join(', ');
      throw new BadRequestException(
        `Employés déjà occupés sur la même période: ${names}`,
      );
    }

    const employeeIds = (rec.list as any[]).map((item: any) => item.employeeId);

    // Set participants list + send to manager for review
    await this.activitiesService.update(activityId, {
      status: 'SENT_TO_MANAGER',
      participants: employeeIds,
    });

    // Notify the assigned manager
    if ((activity as any).managerId) {
      await this.notifService.create({
        userId:  (activity as any).managerId,
        type:    'activity_invitation',
        title:   'Activité à valider',
        message: `L'activité "${(activity as any).title}" vous a été envoyée pour validation.`,
        link:    `/manager/activities/${activityId}`,
        meta:    { activityId, activityTitle: (activity as any).title },
      });
    }

    return this.recService.upsert(activityId, rec.list, true, (rec as any).refusedEmployees || []);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Explains WHY an employee is recommended for a certification (gap-based) */
  private buildCertExplanation(
    missingSkills: string[],
    meetsCount: number,
    totalReqs: number,
    matchedCount: number,
    avgLevelRatio: number,
  ): string {
    if (totalReqs === 0) return 'Aucun critère spécifique — certification générale.';

    if (missingSkills.length === totalReqs) {
      const top = missingSkills.slice(0, 2).join(', ');
      return `Profil prioritaire — ne possède aucune des ${totalReqs} compétences requises (${top}). Certification très recommandée.`;
    }
    if (meetsCount === totalReqs) {
      return `Compétences déjà maîtrisées — employé moins prioritaire pour cette certification.`;
    }
    const gapCount = totalReqs - meetsCount;
    const pct      = Math.round((1 - avgLevelRatio) * 100);
    const top      = missingSkills.slice(0, 2).join(', ');
    return `${gapCount}/${totalReqs} compétence${gapCount > 1 ? 's' : ''} en dessous du niveau requis (écart moyen : ${pct}%)${top ? ` — lacunes : ${top}` : ''}. Bénéficierait de cette certification.`;
  }

  private buildExplanation(
    _reqs: any[],
    matchedSkills: string[],
    missingSkills: string[],
    meetsCount: number,
    totalReqs: number,
    totalCompetences: number,
  ): string {
    if (totalReqs === 0) {
      return `${totalCompetences} compétence${totalCompetences !== 1 ? 's' : ''} validée${totalCompetences !== 1 ? 's' : ''} — aucun critère spécifique requis.`;
    }
    if (matchedSkills.length === 0) {
      return 'Aucune des compétences requises trouvée dans le profil.';
    }
    if (meetsCount === totalReqs) {
      const top = matchedSkills.slice(0, 2).join(', ');
      return `Excellent profil — toutes les ${totalReqs} compétences requises atteintes au niveau demandé. Points forts : ${top}.`;
    }
    if (matchedSkills.length === totalReqs) {
      const top = matchedSkills.slice(0, 2).join(', ');
      return `Toutes les compétences couvertes (${meetsCount}/${totalReqs} au niveau requis). Points forts : ${top}.`;
    }
    const top  = matchedSkills.slice(0, 2).join(', ');
    const miss = missingSkills.slice(0, 2).join(', ');
    return `${matchedSkills.length}/${totalReqs} compétences couvertes${top ? ` (${top})` : ''}. Manque : ${miss}.`;
  }

  private partialMatch(name: string, kw: string): boolean {
    const nameParts = name.split(/\s+/);
    const kwParts   = kw.split(/\s+/);
    return nameParts.some(np => kwParts.some(kp => np.includes(kp) && kp.length > 3));
  }

  private async buildAvailabilityMap(activity: any, employees: any[]) {
    const employeeIds = employees
      .map(e => e.employee_id)
      .filter(Boolean);
    const users = await this.usersService.findByIds(employeeIds);
    const userMap = new Map(users.map(u => [String((u as any)._id), u]));

    const targetRange = this.getActivityRange(activity);
    const canCheck = Boolean(targetRange.start && targetRange.end);

    const activities = await this.activitiesService.findAll();
    const activityRanges = new Map<string, { start: Date | null; end: Date | null; participants: string[] }>();
    for (const act of activities as any[]) {
      const range = this.getActivityRange(act);
      activityRanges.set(String(act._id), {
        start: range.start,
        end: range.end,
        participants: (act.participants || []) as string[],
      });
    }

    const assignmentSets = new Map<string, Set<string>>();
    const addAssignment = (empId: string, actId: string) => {
      if (!assignmentSets.has(empId)) assignmentSets.set(empId, new Set());
      assignmentSets.get(empId)!.add(actId);
    };

    if (canCheck) {
      for (const act of activities as any[]) {
        const actId = String(act._id);
        if (actId === String(activity._id)) continue;
        const range = activityRanges.get(actId);
        if (!range?.start || !range?.end || !range.participants?.length) continue;
        if (!this.rangesOverlap(range.start, range.end, targetRange.start!, targetRange.end!)) continue;
        for (const empId of range.participants) {
          addAssignment(String(empId), actId);
        }
      }
    }

    const availability = new Map<string, any>();
    for (const emp of employees) {
      const assignmentCount = (assignmentSets.get(emp.employee_id)?.size || 0)
        + 0;

      const status = assignmentCount > 0 ? 'BUSY' : 'AVAILABLE';
      const reason = assignmentCount > 0 ? 'ASSIGNED' : null;

      availability.set(emp.employee_id, {
        status,
        reason,
        assignmentCount,
        maxCapacity: null,
        onLeave: false,
        conflictActivityIds: Array.from(assignmentSets.get(emp.employee_id) || []),
      });
    }

    return availability;
  }

  private getActivityRange(activity: any) {
    const startRaw = activity?.startDate || activity?.date;
    const endRaw = activity?.endDate || activity?.startDate || activity?.date;
    const start = this.parseDate(startRaw, false);
    const end = this.parseDate(endRaw, true);
    return { start, end };
  }

  private parseDate(value: any, endOfDay: boolean): Date | null {
    if (!value) return null;
    let v = value;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      v = `${value}T00:00:00`;
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    if (endOfDay) d.setHours(23, 59, 59, 999);
    return d;
  }

  private rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart <= bEnd && aEnd >= bStart;
  }
}
