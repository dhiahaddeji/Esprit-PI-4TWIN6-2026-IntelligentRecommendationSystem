"""
recommender.py — ML-powered employee recommendation engine.

Architecture
────────────
Cold start (no training data):
  Pure heuristic scoring — deterministic, interpretable.

Warm start (feedback data available):
  GradientBoostingClassifier trained on HR/manager validation history.
  Score = 0.70 × heuristic + 0.30 × (model_confidence × 100)

Feature vector (12 dims) per (employee, activity) pair:
  [0]  coverage_ratio      — fraction of required skills matched
  [1]  avg_level_ratio     — mean(emp_level / req_level) for matched
  [2]  avg_similarity      — mean TF-IDF cosine for matched skills
  [3]  meets_ratio         — fraction meeting minimum level
  [4]  avg_level_gap_norm  — mean(emp_level - req_level) / 4
  [5]  profile_breadth     — min(1, n_skills / 20)
  [6]  ctx_weight_norm     — context weight normalised to [0,1]
  [7]  heuristic_score     — base heuristic / 100
  [8]  experience_norm     — min(1, years / 20)
  [9]  match_ratio         — same as coverage (kept as explicit feature)
  [10] raw_level_gap       — mean(emp_level - req_level), signed
  [11] is_certification    — 1.0 for certification activities

Heuristic formula (fit mode — non-certification):
  score = coverage*50 + avg_level_ratio*30 + breadth_bonus*10 + meets_bonus*10

Heuristic formula (gap mode — certification):
  score = skill_gap*55 + level_gap*35 + active_emp*10
  (certifications rank those who NEED it most — fill the knowledge gap)
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import MinMaxScaler
import joblib

from similarity import SkillMatcher, THRESHOLD

logger = logging.getLogger(__name__)

# ── Context weights ────────────────────────────────────────────────────────────
CONTEXT_WEIGHTS: dict[str, list[float]] = {
    "upskilling":    [1.5, 1.3, 1.0, 0.7, 0.4],   # favor those who need to learn
    "consolidation": [0.5, 0.9, 1.5, 1.2, 0.8],   # favor intermediate level
    "expertise":     [0.2, 0.5, 0.8, 1.3, 1.8],   # favor experts
}

EVAL_LABELS = ["Pas de compétence", "Notions", "Pratique", "Maîtrise", "Expert"]

MODEL_PATH   = Path(__file__).parent / "data" / "model.joblib"
SCALER_PATH  = Path(__file__).parent / "data" / "scaler.joblib"
MIN_SAMPLES  = 20   # minimum feedback rows before enabling ML blend

# ── Data classes ───────────────────────────────────────────────────────────────
@dataclass
class CompetenceItem:
    intitule: str
    type: str
    auto_eval: int
    hierarchie_eval: int = -1

    @property
    def level(self) -> int:
        return self.hierarchie_eval if self.hierarchie_eval >= 0 else self.auto_eval


@dataclass
class RequiredSkill:
    intitule: str
    type: str
    niveau_min: int


@dataclass
class EmployeeInput:
    employee_id: str
    employee_name: str
    competences: list[CompetenceItem]
    years_experience: float = 0.0


@dataclass
class ActivityInput:
    activity_id: str
    activity_type: str           # formation | certification | mission | projet | audit
    prioritization: str          # upskilling | consolidation | expertise
    competences_requises: list[RequiredSkill]
    seats: int = 5


@dataclass
class SkillDetail:
    intitule: str
    employee_level: int
    required_level: int
    meets_minimum: bool
    level_ratio: float
    similarity: float
    emp_label: str
    req_label: str


@dataclass
class EmployeeScore:
    employee_id: str
    employee_name: str
    score: float                  # 0-100, shown to HR
    rank_score: float             # raw score used for sorting
    status: str                   # 'Selected' | 'Backup'
    rank: int
    details: list[SkillDetail]
    matched_skills: list[str]
    missing_skills: list[str]
    total_competences: int
    meets_all: bool
    meets_count: int
    explanation: str
    features: list[float]         # 12-dim vector (stored for retraining)


# ── Core recommender ───────────────────────────────────────────────────────────
class Recommender:
    def __init__(self) -> None:
        self.matcher   = SkillMatcher()
        self._model: GradientBoostingClassifier | None = None
        self._scaler: MinMaxScaler | None = None
        self._model_ready = False
        self._load_model()

    # ── Public ─────────────────────────────────────────────────────────────────

    def recommend(
        self,
        employees: list[EmployeeInput],
        activity: ActivityInput,
    ) -> list[EmployeeScore]:
        """
        Score all employees for the given activity and return a ranked list.
        The list is trimmed to (seats + 2) entries: top-seats are 'Selected',
        the rest are 'Backup'.
        """
        # Re-fit matcher on all skill names in this batch
        corpus: list[str] = []
        for emp in employees:
            corpus.extend(c.intitule for c in emp.competences)
        for req in activity.competences_requises:
            corpus.append(req.intitule)
        self.matcher.fit(corpus)

        scored: list[EmployeeScore] = []
        for emp in employees:
            scored.append(self._score_employee(emp, activity))

        # Sort DESC by rank_score
        scored.sort(key=lambda x: x.rank_score, reverse=True)

        # Trim and assign rank / status
        limit = min(len(scored), activity.seats + 2)
        result: list[EmployeeScore] = []
        for idx, entry in enumerate(scored[:limit]):
            entry.rank   = idx + 1
            entry.status = "Selected" if idx < activity.seats else "Backup"
            result.append(entry)

        return result

    # ── Heuristic scoring ─────────────────────────────────────────────────────

    def _score_employee(
        self,
        emp: EmployeeInput,
        activity: ActivityInput,
    ) -> EmployeeScore:
        reqs       = activity.competences_requises
        n_req      = len(reqs)
        ctx_table  = CONTEXT_WEIGHTS.get(activity.prioritization, CONTEXT_WEIGHTS["expertise"])
        is_cert    = activity.activity_type == "certification"

        details: list[SkillDetail] = []
        matched_skills: list[str] = []
        missing_skills: list[str] = []

        level_ratio_sum = 0.0
        level_gap_sum   = 0.0
        sim_sum         = 0.0
        matched_count   = 0
        meets_count     = 0

        skill_dicts = [
            {"intitule": c.intitule, "_emp_idx": i}
            for i, c in enumerate(emp.competences)
        ]

        for req in reqs:
            best, sim = self.matcher.best_match(req.intitule, skill_dicts)

            if best is not None:
                c       = emp.competences[best["_emp_idx"]]
                e_lvl   = c.level
                r_lvl   = max(1, req.niveau_min)
                l_ratio = min(1.0, e_lvl / r_lvl)
                l_gap   = e_lvl - req.niveau_min
                meets   = e_lvl >= req.niveau_min

                level_ratio_sum += l_ratio
                level_gap_sum   += l_gap
                sim_sum         += sim
                matched_count   += 1
                if meets:
                    meets_count += 1
                matched_skills.append(req.intitule)

                details.append(SkillDetail(
                    intitule=req.intitule,
                    employee_level=e_lvl,
                    required_level=req.niveau_min,
                    meets_minimum=meets,
                    level_ratio=round(l_ratio, 3),
                    similarity=round(sim, 3),
                    emp_label=EVAL_LABELS[e_lvl],
                    req_label=EVAL_LABELS[req.niveau_min],
                ))
            else:
                missing_skills.append(req.intitule)
                details.append(SkillDetail(
                    intitule=req.intitule,
                    employee_level=-1,
                    required_level=req.niveau_min,
                    meets_minimum=False,
                    level_ratio=0.0,
                    similarity=0.0,
                    emp_label="Non renseigné",
                    req_label=EVAL_LABELS[req.niveau_min],
                ))

        meets_all      = n_req > 0 and meets_count == n_req
        avg_level_ratio = level_ratio_sum / matched_count if matched_count else 0.0
        avg_sim         = sim_sum / matched_count if matched_count else 0.0
        avg_level_gap   = level_gap_sum / matched_count if matched_count else 0.0
        coverage        = matched_count / n_req if n_req else 1.0
        breadth         = min(1.0, len(emp.competences) / 20)

        # ── Average employee level for context weight ──────────────────────
        avg_emp_lvl = (
            np.mean([c.level for c in emp.competences]).item()
            if emp.competences else 0.0
        )
        ctx_idx = min(4, int(round(avg_emp_lvl)))
        ctx_w   = ctx_table[ctx_idx]

        # ── Base heuristic score (0-100) ───────────────────────────────────
        if is_cert:
            # GAP mode: rank highest-need employees first
            skill_gap  = (1.0 - coverage) * 55
            level_gap_ = (1.0 - avg_level_ratio) * 35 if matched_count else 35.0
            active_emp = breadth * 10
            heuristic  = skill_gap + level_gap_ + active_emp
            # Penalty for employees who already meet everything
            if meets_all:
                heuristic *= 0.4
        else:
            # FIT mode: rank best-matching employees first
            skill_match = coverage * 50
            level_match = avg_level_ratio * 30
            exp_bonus   = breadth * 10
            meets_bonus = (meets_count / n_req * 10) if n_req else 10.0
            heuristic   = skill_match + level_match + exp_bonus + meets_bonus
            # Apply context modifier (±20%)
            ctx_norm = ctx_w / 1.5        # normalise around 1.0
            heuristic = heuristic * (0.8 + 0.2 * ctx_norm)

        heuristic = min(100.0, max(0.0, heuristic))

        # ── Feature vector for ML ──────────────────────────────────────────
        features = [
            coverage,                              # 0
            avg_level_ratio,                       # 1
            avg_sim,                               # 2
            meets_count / n_req if n_req else 1.0, # 3  meets_ratio
            avg_level_gap / 4.0,                   # 4  normalised gap
            breadth,                               # 5  profile breadth
            ctx_w / 2.0,                           # 6  context weight norm
            heuristic / 100.0,                     # 7  heuristic score
            min(1.0, emp.years_experience / 20),   # 8  experience
            matched_count / n_req if n_req else 1.0, # 9 explicit match ratio
            avg_level_gap,                         # 10 raw signed gap
            1.0 if is_cert else 0.0,               # 11 is_certification
        ]

        # ── ML blend (if model is trained and ready) ───────────────────────
        final_score = heuristic
        if self._model_ready and self._model is not None:
            try:
                X = np.array([features])
                if self._scaler:
                    X = self._scaler.transform(X)
                ml_conf = float(self._model.predict_proba(X)[0, 1])  # P(selected)
                final_score = 0.70 * heuristic + 0.30 * (ml_conf * 100)
            except Exception as e:
                logger.warning("ML blend failed, using heuristic only: %s", e)

        final_score = min(100.0, max(0.0, final_score))

        return EmployeeScore(
            employee_id=emp.employee_id,
            employee_name=emp.employee_name,
            score=round(final_score, 1),
            rank_score=final_score,
            status="",           # filled after sort
            rank=0,
            details=details,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            total_competences=len(emp.competences),
            meets_all=meets_all,
            meets_count=meets_count,
            explanation=self._explain(
                is_cert, matched_skills, missing_skills,
                meets_count, n_req, len(emp.competences),
                avg_level_ratio,
            ),
            features=features,
        )

    # ── Explanation builder ────────────────────────────────────────────────────

    @staticmethod
    def _explain(
        is_cert: bool,
        matched: list[str],
        missing: list[str],
        meets_count: int,
        total_reqs: int,
        total_competences: int,
        avg_level_ratio: float,
    ) -> str:
        if total_reqs == 0:
            return (
                f"{total_competences} compétence(s) validée(s) — "
                "aucun critère spécifique requis."
            )

        if is_cert:
            if len(missing) == total_reqs:
                top = ", ".join(missing[:2])
                return (
                    f"Prioritaire — aucune des {total_reqs} compétences requises "
                    f"({top}). Certification très recommandée."
                )
            if meets_count == total_reqs:
                return "Compétences déjà maîtrisées — moins prioritaire pour cette certification."
            gap_pct = round((1 - avg_level_ratio) * 100)
            top = ", ".join(missing[:2])
            return (
                f"{total_reqs - meets_count}/{total_reqs} compétence(s) "
                f"en dessous du niveau requis (écart moyen : {gap_pct}%)"
                + (f" — lacunes : {top}" if top else "") + "."
            )

        # Fit mode
        if not matched:
            return "Aucune des compétences requises trouvée dans le profil."
        if meets_count == total_reqs:
            top = ", ".join(matched[:2])
            return f"Profil excellent — toutes les {total_reqs} compétences atteintes. Points forts : {top}."
        top  = ", ".join(matched[:2])
        miss = ", ".join(missing[:2])
        return (
            f"{len(matched)}/{total_reqs} compétences couvertes"
            + (f" ({top})" if top else "")
            + (f". Manque : {miss}" if miss else "")
            + "."
        )

    # ── Model persistence ──────────────────────────────────────────────────────

    def _load_model(self) -> None:
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            try:
                self._model  = joblib.load(MODEL_PATH)
                self._scaler = joblib.load(SCALER_PATH)
                self._model_ready = True
                logger.info("ML model loaded from %s", MODEL_PATH)
            except Exception as e:
                logger.warning("Could not load ML model: %s", e)

    def save_model(
        self,
        model: GradientBoostingClassifier,
        scaler: MinMaxScaler,
    ) -> None:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model,  MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        self._model  = model
        self._scaler = scaler
        self._model_ready = True
        logger.info("ML model saved to %s", MODEL_PATH)
