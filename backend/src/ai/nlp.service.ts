import { Injectable } from '@nestjs/common';

// ── Semantic aliases: any variant → canonical French label ────────────────────
const ALIASES: Record<string, string> = {
  // JavaScript ecosystem
  'js':                       'JavaScript',
  'javascript':               'JavaScript',
  'ts':                       'TypeScript',
  'typescript':               'TypeScript',
  'node':                     'Node.js',
  'nodejs':                   'Node.js',
  'node.js':                  'Node.js',
  'react':                    'React',
  'reactjs':                  'React',
  'react.js':                 'React',
  'vue':                      'Vue.js',
  'vuejs':                    'Vue.js',
  'angular':                  'Angular',
  'next':                     'Next.js',
  'nextjs':                   'Next.js',
  'nest':                     'NestJS',
  'nestjs':                   'NestJS',
  // Python
  'py':                       'Python',
  'python':                   'Python',
  // Java
  'java':                     'Java',
  'spring':                   'Spring Boot',
  'spring boot':              'Spring Boot',
  'springboot':               'Spring Boot',
  // Data / AI
  'ml':                       'Machine Learning',
  'machine learning':         'Machine Learning',
  'dl':                       'Deep Learning',
  'deep learning':            'Deep Learning',
  'ai':                       'Intelligence Artificielle',
  'ia':                       'Intelligence Artificielle',
  'nlp':                      'NLP',
  'data science':             'Data Science',
  'datascience':              'Data Science',
  'tensorflow':               'TensorFlow',
  'pytorch':                  'PyTorch',
  'scikit':                   'Scikit-learn',
  'sklearn':                  'Scikit-learn',
  'pandas':                   'Pandas',
  'numpy':                    'NumPy',
  // Databases
  'sql':                      'SQL',
  'mongo':                    'MongoDB',
  'mongodb':                  'MongoDB',
  'postgres':                 'PostgreSQL',
  'postgresql':               'PostgreSQL',
  'mysql':                    'MySQL',
  'redis':                    'Redis',
  // DevOps / Cloud
  'docker':                   'Docker',
  'k8s':                      'Kubernetes',
  'kubernetes':               'Kubernetes',
  'aws':                      'AWS',
  'azure':                    'Azure',
  'gcp':                      'Google Cloud Platform',
  'ci cd':                    'CI/CD',
  'cicd':                     'CI/CD',
  'ci/cd':                    'CI/CD',
  'devops':                   'DevOps',
  'git':                      'Git',
  'linux':                    'Linux',
  // Frontend
  'html':                     'HTML/CSS',
  'css':                      'HTML/CSS',
  'html css':                 'HTML/CSS',
  'html/css':                 'HTML/CSS',
  // Other tech
  'c++':                      'C++',
  'cpp':                      'C++',
  'c#':                       'C#',
  'csharp':                   'C#',
  'php':                      'PHP',
  'flutter':                  'Flutter',
  'swift':                    'Swift',
  'kotlin':                   'Kotlin',
  'api':                      'API REST',
  'rest':                     'API REST',
  'rest api':                 'API REST',
  'graphql':                  'GraphQL',
  'excel':                    'Excel',
  'power bi':                 'Power BI',
  'powerbi':                  'Power BI',
  'tableau':                  'Tableau',
  // Business
  'project management':       'Gestion de projet',
  'gestion de projet':        'Gestion de projet',
  'agile':                    'Méthode Agile',
  'scrum':                    'Scrum',
  'audit':                    'Audit',
  'assurance':                'Assurance',
  'finance':                  'Finance',
  'comptabilite':             'Comptabilité',
  'comptabilité':             'Comptabilité',
  'marketing':                'Marketing digital',
  // Soft skills
  'communication':            'Communication',
  'leadership':               'Leadership',
  'team work':                'Travail en équipe',
  'teamwork':                 'Travail en équipe',
  'travail d\'équipe':        'Travail en équipe',
  'autonomie':                'Autonomie',
  'adaptabilite':             'Adaptabilité',
  'adaptabilité':             'Adaptabilité',
  'creativite':               'Créativité',
  'créativité':               'Créativité',
  'rigueur':                  'Rigueur',
  'organisation':             'Organisation',
  'problem solving':          'Résolution de problèmes',
  'résolution de problèmes':  'Résolution de problèmes',
};

// ── Experience year extraction patterns ──────────────────────────────────────
const EXP_PATTERNS: RegExp[] = [
  // "5 ans de Python" / "3 years of JavaScript"
  /(\d+)\s*\+?\s*(?:ans?|années?|years?)\s+(?:d[e']|of|avec|en|sur)\s+([a-z][a-z0-9#\+\.\s]{1,30}?)(?=[,;\n]|$)/gi,
  // "Python: 5 ans" / "Java : 3 years"
  /([a-z][a-z0-9#\+\.\s]{1,20}?)\s*:\s*(\d+)\s*\+?\s*(?:ans?|années?|years?)/gi,
  // "expérience de 5 ans en React"
  /expérience\s+(?:de\s+)?(\d+)\s*\+?\s*(?:ans?|années?|years?)\s+en\s+([a-z][a-z0-9#\+\.\s]{1,30}?)(?=[,;\n]|$)/gi,
];

@Injectable()
export class NlpService {

  // ── Normalize a skill name: resolve aliases, capitalize properly ──────────
  normalize(skill: string): string {
    const trimmed = skill.trim();
    const lower   = trimmed.toLowerCase();

    // Direct alias lookup
    if (ALIASES[lower]) return ALIASES[lower];

    // Prefix alias lookup (e.g. "js developer" → "JavaScript")
    for (const [alias, canonical] of Object.entries(ALIASES)) {
      if (lower.startsWith(alias + ' ') || lower === alias) return canonical;
    }

    // Default: Title Case
    return trimmed.replace(/\b\w/g, c => c.toUpperCase());
  }

  // ── Deduplicate skills by normalized name ─────────────────────────────────
  deduplicate<T extends { intitule: string }>(skills: T[]): T[] {
    const seen = new Map<string, T>();
    for (const s of skills) {
      const canonical = this.normalize(s.intitule);
      const key       = canonical.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { ...s, intitule: canonical } as T);
      }
    }
    return Array.from(seen.values());
  }

  // ── Extract years of experience per skill from raw text ───────────────────
  extractExperience(text: string): Record<string, number> {
    const result: Record<string, number> = {};

    for (const pattern of EXP_PATTERNS) {
      const re = new RegExp(pattern.source, 'gi');
      let match: RegExpExecArray | null;

      while ((match = re.exec(text)) !== null) {
        const raw = match.slice(1);
        // pattern 1 & 3: (years, skill) — pattern 2: (skill, years)
        let yearsStr: string, skillStr: string;
        if (/^\d/.test(raw[0])) {
          [yearsStr, skillStr] = raw;
        } else {
          [skillStr, yearsStr] = raw;
        }

        const years = parseInt(yearsStr, 10);
        if (isNaN(years) || years > 40 || !skillStr) continue;

        const key = this.normalize(skillStr.trim()).toLowerCase();
        if (key.length > 2) result[key] = Math.max(result[key] || 0, years);
      }
    }

    return result;
  }

  // ── Local semantic similarity (trigram + cosine, no external API) ─────────
  semanticSimilarity(a: string, b: string): number {
    const normA = this.normalize(a).toLowerCase();
    const normB = this.normalize(b).toLowerCase();

    if (normA === normB)                                    return 1.0;
    if (normA.includes(normB) || normB.includes(normA))    return 0.88;

    // Character trigram Dice coefficient
    const dice = this.trigramSimilarity(normA, normB);
    if (dice > 0)  return dice;

    // Bag-of-words cosine fallback
    return this.bowCosine(normA, normB);
  }

  // ── Cosine similarity (kept for external callers that pass number[]) ──────
  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot   += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  // ── Character trigram Dice coefficient ───────────────────────────────────
  private trigramSimilarity(a: string, b: string): number {
    const ngrams = (s: string): Set<string> => {
      const set    = new Set<string>();
      const padded = `  ${s}  `;
      for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
      return set;
    };
    const setA = ngrams(a);
    const setB = ngrams(b);
    let inter  = 0;
    for (const g of setA) if (setB.has(g)) inter++;
    return (2 * inter) / (setA.size + setB.size + 1e-10);
  }

  // ── Bag-of-words cosine (token-level) ────────────────────────────────────
  private bowCosine(a: string, b: string): number {
    const tokenize = (s: string) => s.split(/\s+/).filter(t => t.length > 1);
    const tokA = tokenize(a);
    const tokB = tokenize(b);
    const vocab = new Set([...tokA, ...tokB]);
    const vecA  = Array.from(vocab).map(t => tokA.filter(x => x === t).length);
    const vecB  = Array.from(vocab).map(t => tokB.filter(x => x === t).length);
    return this.cosineSimilarity(vecA, vecB);
  }
}
