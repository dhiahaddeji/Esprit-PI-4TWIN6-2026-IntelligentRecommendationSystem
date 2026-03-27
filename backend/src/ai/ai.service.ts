import { Injectable } from '@nestjs/common';
import { SkillsService } from '../skills/skills.service';

const LEVEL_SCORE: Record<string, number> = {
  LOW: 25, MEDIUM: 50, HIGH: 75, EXPERT: 100,
};

// For upskilling context: prefer LOW/MEDIUM (they need training most)
// For consolidation: prefer MEDIUM/HIGH
// For expertise: prefer HIGH/EXPERT
const CONTEXT_WEIGHTS: Record<string, Record<string, number>> = {
  upskilling:    { LOW: 1.5,  MEDIUM: 1.2, HIGH: 0.8,  EXPERT: 0.5 },
  consolidation: { LOW: 0.8,  MEDIUM: 1.5, HIGH: 1.2,  EXPERT: 0.9 },
  expertise:     { LOW: 0.4,  MEDIUM: 0.8, HIGH: 1.3,  EXPERT: 1.8 },
};

@Injectable()
export class AiService {
  constructor(private readonly skillsService: SkillsService) {}

  async chat(
    message: string,
    context?: { requiredSkills?: string[]; prioritization?: string },
  ): Promise<{ reply: string; employees?: any[] }> {
    const employees = await this.skillsService.getAllEmployeeSkills();

    if (employees.length === 0) {
      return {
        reply:
          "Aucun employé avec des compétences enregistrées. Demandez aux employés de renseigner leurs compétences via la page « Mes compétences ».",
      };
    }

    const msg = message.toLowerCase();
    const topN = this.extractTopN(msg);
    const keywords = this.extractKeywords(msg);
    const prioritization = context?.prioritization || this.detectPrioritization(msg);
    const ctxWeights = CONTEXT_WEIGHTS[prioritization] || CONTEXT_WEIGHTS.expertise;

    const scored = employees.map((emp) => {
      const allSkills = [
        ...(emp.savoir       || []),
        ...(emp.savoir_faire || []),
        ...(emp.savoir_etre  || []),
      ];

      let score = 0;

      // Base: global score from DB
      score += (emp.globalScore || 0) * 0.3;

      // Skill keyword matching (weighted by level)
      for (const sk of allSkills) {
        const skName = (sk.name || '').toLowerCase();
        const levelW = ctxWeights[sk.level] || 1.0;
        const levelS = LEVEL_SCORE[sk.level] || 0;

        if (keywords.length === 0) {
          // No keywords → rank purely by score × context weight
          score += levelS * levelW * 0.5;
        } else {
          for (const kw of keywords) {
            if (skName.includes(kw) || kw.includes(skName)) {
              score += levelS * levelW;
            }
          }
        }
      }

      // Bonus for experience
      score += (emp.yearsExperience || 0) * 2;

      return { ...emp, computedScore: Math.round(score) };
    });

    scored.sort((a, b) => b.computedScore - a.computedScore);
    const top = scored.slice(0, topN);

    return {
      reply: this.buildReply(message, top, keywords, topN, prioritization),
      employees: top.map((e) => ({
        employee_id: e._id,
        name: e.name,
        score: e.computedScore,
        globalScore: e.globalScore,
        savoir:       e.savoir,
        savoir_faire: e.savoir_faire,
        savoir_etre:  e.savoir_etre,
      })),
    };
  }

  // ── Extract skills from activity description (for NLP auto-fill) ─────
  async extractSkillsFromDescription(description: string): Promise<{
    suggested_skills: string[];
    prioritization: string;
    type: string;
  }> {
    const text = description.toLowerCase();

    const SKILL_LIBRARY = [
      'python', 'java', 'javascript', 'sql', 'mongodb', 'react', 'nestjs', 'docker',
      'machine learning', 'deep learning', 'nlp', 'data science', 'cloud', 'aws',
      'comptabilité', 'finance', 'audit', 'assurance', 'actuariat', 'gestion',
      'communication', 'leadership', 'management', 'négociation', 'présentation',
      'agile', 'scrum', 'devops', 'kubernetes', 'git', 'cybersécurité',
      'excel', 'power bi', 'tableau', 'anglais', 'rédaction', 'analyse',
    ];

    const suggested_skills = SKILL_LIBRARY.filter((sk) => text.includes(sk));

    // Detect activity type
    let type = 'formation';
    if (text.includes('certif')) type = 'certification';
    else if (text.includes('audit')) type = 'audit';
    else if (text.includes('projet') || text.includes('project')) type = 'projet';
    else if (text.includes('mission')) type = 'mission';

    // Detect prioritization
    let prioritization = 'expertise';
    if (text.includes('débutant') || text.includes('junior') || text.includes('initiation') || text.includes('upskill')) {
      prioritization = 'upskilling';
    } else if (text.includes('intermédiaire') || text.includes('consolidat') || text.includes('medium')) {
      prioritization = 'consolidation';
    }

    return { suggested_skills, prioritization, type };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private extractTopN(msg: string): number {
    const m = msg.match(/top\s*(\d+)/);
    return m ? Math.min(parseInt(m[1], 10), 20) : 5;
  }

  private detectPrioritization(msg: string): string {
    if (msg.includes('débutant') || msg.includes('junior') || msg.includes('upskill')) return 'upskilling';
    if (msg.includes('intermédiaire') || msg.includes('consolid')) return 'consolidation';
    return 'expertise';
  }

  private extractKeywords(msg: string): string[] {
    const stopWords = new Set([
      'top', 'pour', 'les', 'des', 'de', 'du', 'le', 'la', 'une', 'un', 'en', 'et',
      'ou', 'est', 'qui', 'que', 'formation', 'activite', 'activité', 'meilleur',
      'meilleurs', 'employe', 'employé', 'employees', 'competences', 'selon',
      'choisir', 'trouver', 'recommande', 'liste', 'moi', 'toi', 'nous', 'vous',
      'donne', 'donner', 'avoir', 'faire', 'etre', 'peut', 'sur', 'avec', 'dans',
      'par', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'leur', 'leurs',
    ]);
    return msg
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zàâéèêëîïôùûüç]/gi, '').toLowerCase())
      .filter((w) => w.length > 2 && !stopWords.has(w));
  }

  private buildReply(
    originalMsg: string,
    top: any[],
    keywords: string[],
    topN: number,
    prioritization: string,
  ): string {
    if (top.length === 0) {
      return 'Aucun employé ne correspond à cette requête. Vérifiez que les compétences sont renseignées.';
    }

    const ctxLabel: Record<string, string> = {
      upskilling:    '🟡 Profils à développer (LOW→MEDIUM)',
      consolidation: '🔵 Profils à consolider (MEDIUM→HIGH)',
      expertise:     '🟢 Profils experts (HIGH/EXPERT)',
    };

    const kwDisplay = keywords.length > 0 ? `"${keywords.slice(0, 4).join(', ')}"` : 'compétences générales';
    let reply = `**Top ${Math.min(topN, top.length)} — ${kwDisplay}**\n`;
    reply += `Contexte : ${ctxLabel[prioritization] || prioritization}\n\n`;

    top.forEach((emp, i) => {
      const allSkills = [...(emp.savoir || []), ...(emp.savoir_faire || []), ...(emp.savoir_etre || [])];
      reply += `**${i + 1}. ${emp.name}** (score: ${emp.computedScore})`;
      if (allSkills.length > 0) {
        const preview = allSkills
          .slice(0, 3)
          .map((s: any) => `${s.name} [${s.level}]`)
          .join(', ');
        reply += `\n   → ${preview}`;
        if (allSkills.length > 3) reply += ` +${allSkills.length - 3} autres`;
      } else {
        reply += '\n   → (aucune compétence enregistrée)';
      }
      reply += '\n\n';
    });

    return reply.trim();
  }
}
