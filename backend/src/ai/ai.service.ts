import { Injectable } from '@nestjs/common';
import { CompetencesService } from '../competences/competences.service';
import { EVAL_TO_SCORE } from '../competences/competence.schema';

const CONTEXT_WEIGHTS: Record<string, Record<number, number>> = {
  upskilling:    { 0: 1.5, 1: 1.3, 2: 1.0, 3: 0.7, 4: 0.4 },
  consolidation: { 0: 0.5, 1: 0.9, 2: 1.5, 3: 1.2, 4: 0.8 },
  expertise:     { 0: 0.2, 1: 0.5, 2: 0.8, 3: 1.3, 4: 1.8 },
};

const CTX_LABEL: Record<string, string> = {
  upskilling:    '🟡 Upskilling (profils à développer)',
  consolidation: '🔵 Consolidation (profils intermédiaires)',
  expertise:     '🟢 Expertise (profils avancés)',
};

@Injectable()
export class AiService {
  constructor(private readonly compSvc: CompetencesService) {}

  // ── Chat principal ────────────────────────────────────────────────────

  async chat(
    message: string,
    context?: {
      requiredSkills?: string[];
      prioritization?: string;
      recommendedList?: any[];   // employees already scored by run-ai
      activityTitle?: string;
    },
  ): Promise<{ reply: string; employees: any[] }> {

    const msg  = message.toLowerCase();
    const list = context?.recommendedList;

    // ── Recommendation-aware mode (workflow page mini-chat) ───────────
    if (list?.length) {
      // "Why was [name] selected / scored?"
      const namedEmployee = this.findEmployeeByName(msg, list);
      if (namedEmployee) {
        return { reply: this.buildWhyReply(namedEmployee, context?.activityTitle), employees: [] };
      }

      // "Who is missing [skill]?" / "manque"
      if (msg.includes('manque') || msg.includes('missing') || msg.includes('sans ') || msg.includes('absent')) {
        const keywords = this.extractKeywords(msg);
        return { reply: this.buildMissingReply(list, keywords, context?.activityTitle), employees: [] };
      }

      // "Show backup / réserve"
      if (msg.includes('backup') || msg.includes('réserve') || msg.includes('remplaç')) {
        return { reply: this.buildBackupReply(list, context?.activityTitle), employees: [] };
      }

      // "Show selected / sélectionnés"
      if (msg.includes('sélectionn') || msg.includes('selectionn') || msg.includes('retenus') || msg.includes('liste')) {
        return { reply: this.buildListReply(list, context?.activityTitle), employees: [] };
      }

      // Fallback: show full ranked list
      return { reply: this.buildListReply(list, context?.activityTitle), employees: [] };
    }

    // ── Standard chat mode (no recommendation context) ────────────────
    const allEmployees = await this.compSvc.getAllEmployeesCompetences();

    if (allEmployees.length === 0) {
      return {
        reply:
          '⚠️ Aucun employé avec des compétences validées n\'a été trouvé.\n\n' +
          'Pour utiliser l\'IA :\n' +
          '1. Les employés renseignent leurs compétences (page **Mes compétences**)\n' +
          '2. Ils soumettent leur fiche pour validation\n' +
          '3. Un manager valide les compétences\n\n' +
          'Une fois validées, l\'IA pourra faire des recommandations précises.',
        employees: [],
      };
    }

    const topN           = this.extractTopN(msg);
    const keywords       = this.extractKeywords(msg);
    const prioritization = context?.prioritization || this.detectPrioritization(msg);
    const ctxW           = CONTEXT_WEIGHTS[prioritization] || CONTEXT_WEIGHTS.expertise;

    const scored = (allEmployees as any[]).map(emp => {
      let score = 0;
      const matched: string[] = [];

      for (const comp of emp.competences) {
        const name      = comp.intitule.toLowerCase();
        const evalScore = comp.hierarchie_eval >= 0 ? comp.hierarchie_eval : comp.auto_eval;
        const ctxWeight = ctxW[evalScore] ?? 1;

        if (keywords.length === 0) {
          score += (EVAL_TO_SCORE[evalScore] ?? 0) * ctxWeight * 0.5;
        } else {
          for (const kw of keywords) {
            if (name.includes(kw) || kw.includes(name) || this.partialMatch(name, kw)) {
              score += (EVAL_TO_SCORE[evalScore] ?? 25) * ctxWeight;
              matched.push(comp.intitule);
              break;
            }
          }
        }
      }

      return { ...emp, computedScore: Math.round(score), matched };
    });

    scored.sort((a, b) => b.computedScore - a.computedScore);
    const top    = scored.slice(0, topN);
    const reply  = this.buildReply(top, keywords, topN, prioritization);

    return {
      reply,
      employees: top.map(e => ({
        employee_id: e.employee_id,
        name:        e.employee_name,
        score:       e.computedScore,
        matched:     e.matched,
        competences: e.competences,
      })),
    };
  }

  // ── Match activity vs employees ───────────────────────────────────────

  async matchActivity(activityId: string, competencesRequises: any[], prioritization: string) {
    const allEmployees = await this.compSvc.getAllEmployeesCompetences();
    const ctxW         = CONTEXT_WEIGHTS[prioritization] || CONTEXT_WEIGHTS.expertise;
    const maxScore     = competencesRequises.length * 4 * 1.8;

    const scored = (allEmployees as any[]).map(emp => {
      let score = 0;
      const details: any[] = [];

      for (const req of competencesRequises) {
        const reqName = req.intitule.toLowerCase();
        const match   = emp.competences.find(c =>
          c.intitule.toLowerCase().includes(reqName) ||
          reqName.includes(c.intitule.toLowerCase()),
        );

        if (match) {
          const evalScore = match.hierarchie_eval >= 0 ? match.hierarchie_eval : match.auto_eval;
          const ctxWeight = ctxW[evalScore] ?? 1;
          const pts       = evalScore * ctxWeight;
          score          += pts;
          details.push({
            intitule:       req.intitule,
            employee_level: evalScore,
            required_level: req.niveau_min ?? 2,
            meets_minimum:  evalScore >= (req.niveau_min ?? 2),
            score:          pts,
          });
        } else {
          details.push({
            intitule:       req.intitule,
            employee_level: -1,
            required_level: req.niveau_min ?? 2,
            meets_minimum:  false,
            score:          0,
          });
        }
      }

      const pct = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
      return { ...emp, score: pct, rank_score: score, details };
    });

    scored.sort((a, b) => b.rank_score - a.rank_score);
    return scored;
  }

  // ── NLP: extract skills from description ─────────────────────────────

  extractSkillsFromDescription(description: string): {
    suggested_skills: { intitule: string; type: string; niveau_min: number }[];
    prioritization: string;
    type: string;
  } {
    const text = description.toLowerCase();

    const CATALOG: { kw: string; intitule: string; type: string }[] = [
      { kw: 'python',             intitule: 'Python',                type: 'savoir' },
      { kw: 'java',               intitule: 'Java',                  type: 'savoir' },
      { kw: 'javascript',         intitule: 'JavaScript',            type: 'savoir' },
      { kw: 'sql',                intitule: 'SQL',                   type: 'savoir' },
      { kw: 'machine learning',   intitule: 'Machine Learning',      type: 'savoir' },
      { kw: 'deep learning',      intitule: 'Deep Learning',         type: 'savoir' },
      { kw: 'nlp',                intitule: 'NLP',                   type: 'savoir' },
      { kw: 'data science',       intitule: 'Data Science',          type: 'savoir' },
      { kw: 'cloud',              intitule: 'Cloud Computing',       type: 'savoir' },
      { kw: 'docker',             intitule: 'Docker',                type: 'savoir' },
      { kw: 'devops',             intitule: 'DevOps',                type: 'savoir' },
      { kw: 'react',              intitule: 'React',                 type: 'savoir' },
      { kw: 'agile',              intitule: 'Agile',                 type: 'savoir' },
      { kw: 'comptabilité',       intitule: 'Comptabilité',          type: 'savoir' },
      { kw: 'finance',            intitule: 'Finance',               type: 'savoir' },
      { kw: 'audit',              intitule: 'Audit',                 type: 'savoir' },
      { kw: 'assurance',          intitule: 'Assurance',             type: 'savoir' },
      { kw: 'excel',              intitule: 'Excel',                 type: 'savoir' },
      { kw: 'power bi',           intitule: 'Power BI',              type: 'savoir' },
      { kw: 'gestion de projet',  intitule: 'Gestion de projet',     type: 'savoir_faire' },
      { kw: 'développement',      intitule: 'Développement logiciel',type: 'savoir_faire' },
      { kw: 'analyse',            intitule: 'Analyse',               type: 'savoir_faire' },
      { kw: 'présentation',       intitule: 'Présentation',          type: 'savoir_faire' },
      { kw: 'négociation',        intitule: 'Négociation',           type: 'savoir_faire' },
      { kw: 'rédaction',          intitule: 'Rédaction',             type: 'savoir_faire' },
      { kw: 'communication',      intitule: 'Communication',         type: 'savoir_etre' },
      { kw: 'leadership',         intitule: 'Leadership',            type: 'savoir_etre' },
      { kw: 'travail d\'équipe',  intitule: 'Travail d\'équipe',     type: 'savoir_etre' },
      { kw: 'adaptabilité',       intitule: 'Adaptabilité',          type: 'savoir_etre' },
      { kw: 'autonomie',          intitule: 'Autonomie',             type: 'savoir_etre' },
      { kw: 'créativité',         intitule: 'Créativité',            type: 'savoir_etre' },
    ];

    const detected = CATALOG.filter(c => text.includes(c.kw));

    let niveau_min = 2;
    if (text.includes('expert') || text.includes('avancé'))                                      niveau_min = 4;
    else if (text.includes('maîtrise') || text.includes('confirmé'))                             niveau_min = 3;
    else if (text.includes('débutant') || text.includes('junior') || text.includes('initiation')) niveau_min = 1;

    let prioritization = 'expertise';
    if (text.includes('upskill') || text.includes('formation') || text.includes('débutant'))     prioritization = 'upskilling';
    else if (text.includes('consolid') || text.includes('intermédiaire'))                        prioritization = 'consolidation';

    let type = 'formation';
    if (text.includes('certif'))                             type = 'certification';
    else if (text.includes('audit'))                        type = 'audit';
    else if (text.includes('projet') || text.includes('project')) type = 'projet';
    else if (text.includes('mission'))                      type = 'mission';

    return {
      suggested_skills: detected.map(d => ({ ...d, niveau_min })),
      prioritization,
      type,
    };
  }

  // ── Recommendation-context reply builders ────────────────────────────

  private buildWhyReply(emp: any, activityTitle?: string): string {
    const ctx = activityTitle ? ` pour "${activityTitle}"` : '';
    let reply = `**Pourquoi ${emp.employeeName} a été sélectionné${ctx} :**\n\n`;
    reply += `📊 **Score global : ${emp.score}%** (rang #${emp.rank})\n`;
    reply += `🏷️ **Statut : ${emp.status === 'Selected' ? '✅ Sélectionné' : '🔄 Backup'}**\n\n`;
    reply += `💬 _${emp.explanation}_\n\n`;

    if (emp.matchedSkills?.length) {
      reply += `✅ **Compétences couvertes (${emp.matchedSkills.length}) :**\n`;
      emp.matchedSkills.forEach(s => { reply += `  • ${s}\n`; });
    }
    if (emp.missingSkills?.length) {
      reply += `\n❌ **Compétences manquantes (${emp.missingSkills.length}) :**\n`;
      emp.missingSkills.forEach(s => { reply += `  • ${s}\n`; });
    }
    if (emp.details?.length) {
      reply += `\n📋 **Détail par compétence :**\n`;
      emp.details.forEach(d => {
        const ok = d.meets_minimum ? '✅' : '⚠️';
        const empLbl = d.emp_label || (d.employee_level >= 0 ? `Niveau ${d.employee_level}` : 'Non renseigné');
        const reqLbl = d.req_label || `Niveau ${d.required_level}`;
        reply += `  ${ok} ${d.intitule} — ${empLbl} (requis : ${reqLbl})\n`;
      });
    }
    reply += `\n📚 ${emp.totalCompetences} compétence${emp.totalCompetences !== 1 ? 's' : ''} validée${emp.totalCompetences !== 1 ? 's' : ''} au total dans son profil.`;
    return reply;
  }

  private buildMissingReply(list: any[], keywords: string[], activityTitle?: string): string {
    const ctx = activityTitle ? ` pour "${activityTitle}"` : '';
    let reply = `**Compétences manquantes${ctx} :**\n\n`;

    const withMissing = list.filter(e => e.missingSkills?.length > 0);
    if (withMissing.length === 0) {
      return `Tous les candidats couvrent l'ensemble des compétences requises${ctx}.`;
    }

    // If keywords specified, filter to those skills
    const relevant = keywords.length > 0
      ? withMissing.filter(e =>
          e.missingSkills.some(s => keywords.some(kw => s.toLowerCase().includes(kw)))
        )
      : withMissing;

    if (relevant.length === 0) {
      return `Aucun candidat ne manque les compétences recherchées.`;
    }

    relevant.forEach(e => {
      const missing = keywords.length > 0
        ? e.missingSkills.filter(s => keywords.some(kw => s.toLowerCase().includes(kw)))
        : e.missingSkills;
      reply += `**${e.employeeName}** (score ${e.score}%)\n`;
      missing.forEach(s => { reply += `  ❌ ${s}\n`; });
      reply += '\n';
    });

    return reply.trim();
  }

  private buildBackupReply(list: any[], activityTitle?: string): string {
    const backups = list.filter(e => e.status === 'Backup');
    const ctx     = activityTitle ? ` pour "${activityTitle}"` : '';
    if (backups.length === 0) {
      return `Aucun candidat backup dans la liste${ctx}.`;
    }
    let reply = `**Candidats backup${ctx} (${backups.length}) :**\n\n`;
    backups.forEach(e => {
      reply += `**${e.rank}. ${e.employeeName}** — ${e.score}%\n`;
      reply += `   _${e.explanation}_\n\n`;
    });
    return reply.trim();
  }

  private buildListReply(list: any[], activityTitle?: string): string {
    const ctx = activityTitle ? ` — ${activityTitle}` : '';
    let reply = `**Liste des candidats recommandés${ctx} :**\n\n`;
    list.forEach(e => {
      const badge = e.status === 'Selected' ? '✅ Sélectionné' : '🔄 Backup';
      reply += `**#${e.rank} ${e.employeeName}** · ${e.score}% · ${badge}\n`;
      reply += `   _${e.explanation}_\n\n`;
    });
    return reply.trim();
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private findEmployeeByName(msg: string, list: any[]): any | null {
    return list.find(e => {
      const name = (e.employeeName || '').toLowerCase();
      if (!name) return false;
      // Check if any word in the name appears in the message
      return name.split(/\s+/).some(part => part.length > 2 && msg.includes(part));
    }) ?? null;
  }

  private extractTopN(msg: string): number {
    const m = msg.match(/top\s*(\d+)/);
    return m ? Math.min(parseInt(m[1], 10), 20) : 5;
  }

  private detectPrioritization(msg: string): string {
    if (msg.includes('débutant') || msg.includes('junior') || msg.includes('upskill')) return 'upskilling';
    if (msg.includes('intermédiaire') || msg.includes('consolid'))                      return 'consolidation';
    return 'expertise';
  }

  private extractKeywords(msg: string): string[] {
    const stop = new Set([
      'top','pour','les','des','de','du','le','la','une','un','en','et','ou','est','qui',
      'que','formation','activite','activité','meilleur','meilleurs','employe','employé',
      'employees','competences','selon','choisir','trouver','recommande','liste','moi',
      'toi','nous','vous','donne','donner','avoir','faire','etre','peut','sur','avec',
      'dans','par','mon','ma','mes','son','sa','ses','leur','leurs','une','des',
      'pourquoi','comment','qui','quels','quelles','manque','missing','absent','backup',
      'sélectionné','selectionne','retenu','choisi',
    ]);
    return msg
      .split(/\s+/)
      .map(w => w.replace(/[^a-zàâéèêëîïôùûüç]/gi, '').toLowerCase())
      .filter(w => w.length > 2 && !stop.has(w));
  }

  private partialMatch(name: string, kw: string): boolean {
    const nameParts = name.split(/\s+/);
    const kwParts   = kw.split(/\s+/);
    return nameParts.some(np => kwParts.some(kp => np.includes(kp) && kp.length > 3));
  }

  private buildReply(top: any[], keywords: string[], topN: number, prioritization: string): string {
    if (top.length === 0) {
      return 'Aucun employé avec des compétences validées ne correspond à cette requête.';
    }
    const kwDisplay = keywords.length > 0 ? `"${keywords.slice(0, 4).join(', ')}"` : 'toutes compétences';
    let reply = `**Top ${Math.min(topN, top.length)} — ${kwDisplay}**\n`;
    reply += `Contexte : ${CTX_LABEL[prioritization] || prioritization}\n\n`;

    top.forEach((emp, i) => {
      const total    = emp.competences.length;
      const topComps = emp.competences
        .sort((a: any, b: any) =>
          (b.hierarchie_eval >= 0 ? b.hierarchie_eval : b.auto_eval) -
          (a.hierarchie_eval >= 0 ? a.hierarchie_eval : a.auto_eval)
        )
        .slice(0, 3)
        .map((c: any) => c.intitule);

      reply += `**${i + 1}. ${emp.employee_name}** (score IA: ${emp.computedScore})`;
      if (emp.matched?.length > 0) reply += ` ✓ *${emp.matched.slice(0, 2).join(', ')}*`;
      reply += `\n   ${total} compétence${total > 1 ? 's' : ''} validée${total > 1 ? 's' : ''} — Top: ${topComps.join(', ')}\n`;
    });

    reply += `\n*Score basé sur niveau des compétences (hiérarchique) × contexte ${prioritization}.*`;
    return reply;
  }
}
