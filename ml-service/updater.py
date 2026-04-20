"""
updater.py — Post-activity skill score update engine.

Formula (exponential smoothing / gap-based learning):
─────────────────────────────────────────────────────
  target  = min(4,  required_level + 0.5)   # activity trains slightly above requirement
  gap     = max(0,  target - current_level)  # only positive gap (never decrease)
  alpha   = BASE_LR * IMPACT[activity_type]  # learning rate modulated by activity type
  delta   = alpha * gap
  new_lvl = min(4,  current_level + delta)
  new_lvl = round(new_lvl)                   # keep discrete 0-4 integer scale

Why these numbers?
  • BASE_LR = 0.35 → moderate learning per activity, not giant leaps
  • Certification impact = 1.0  → highest; formal credential earns the most
  • Mission / projet        → real-world use, second-tier gain
  • Formation               → structured training, solid gain
  • Audit                   → observation-heavy, lowest gain
  • Experts (level 4) earn zero delta (already at ceiling)
  • Completely missing skill → added at level 1 if activity required >= 1
"""
from __future__ import annotations

from dataclasses import dataclass, field
from similarity import SkillMatcher, THRESHOLD

# ── Constants ──────────────────────────────────────────────────────────────────
BASE_LR: float = 0.35

IMPACT: dict[str, float] = {
    "formation":     0.60,
    "certification": 1.00,
    "mission":       0.80,
    "projet":        0.70,
    "audit":         0.45,
}

EVAL_LABELS = ["Pas de compétence", "Notions", "Pratique", "Maîtrise", "Expert"]


# ── Data classes ───────────────────────────────────────────────────────────────
@dataclass
class SkillState:
    intitule: str
    type: str                      # savoir | savoir_faire | savoir_etre
    auto_eval: int                 # 0-4
    hierarchie_eval: int = -1      # 0-4 or -1 (not yet evaluated)

    @property
    def effective_level(self) -> int:
        return self.hierarchie_eval if self.hierarchie_eval >= 0 else self.auto_eval


@dataclass
class RequiredSkill:
    intitule: str
    type: str
    niveau_min: int   # 0-4


@dataclass
class SkillUpdate:
    intitule: str
    skill_type: str
    old_level: int
    new_level: int                 # rounded 0-4
    new_level_float: float         # precise float before rounding
    delta: float
    source: str                    # "existing" | "new_skill"
    label_before: str
    label_after: str


@dataclass
class EmployeeUpdateResult:
    employee_id: str
    activity_type: str
    updates: list[SkillUpdate] = field(default_factory=list)
    new_skills: list[SkillUpdate] = field(default_factory=list)


# ── Core formula ───────────────────────────────────────────────────────────────
def _compute_new_level(
    current: int,
    required_level: int,
    activity_type: str,
    feedback_multiplier: float = 1.0,
) -> tuple[float, float]:
    """
    Returns (new_level_float, delta).
    new_level_float is in [current, 4].
    """
    alpha = BASE_LR * IMPACT.get(activity_type, 0.6) * max(0.1, feedback_multiplier)
    target = min(4.0, required_level + 0.5)
    gap = max(0.0, target - current)      # never negative (only improve)
    delta = alpha * gap
    new_f = min(4.0, current + delta)
    return new_f, delta


# ── Public API ─────────────────────────────────────────────────────────────────
def compute_updates(
    employee_id: str,
    employee_skills: list[SkillState],
    required_skills: list[RequiredSkill],
    activity_type: str,
    feedback_multiplier: float = 1.0,
    matcher: SkillMatcher | None = None,
) -> EmployeeUpdateResult:
    """
    Compute skill level updates for one employee after activity completion.

    Parameters
    ----------
    employee_id        : MongoDB _id string of the employee
    employee_skills    : current skill profile (list of SkillState)
    required_skills    : activity's competences_requises
    activity_type      : 'formation'|'certification'|'mission'|'projet'|'audit'
    feedback_multiplier: 0-1 scale from manager feedback (1.0 = full credit)
    matcher            : shared SkillMatcher (re-fitted if None)

    Returns
    -------
    EmployeeUpdateResult with .updates (existing skills) and .new_skills (new skills)
    """
    if matcher is None:
        matcher = SkillMatcher()
        corpus = [s.intitule for s in employee_skills] + [r.intitule for r in required_skills]
        matcher.fit(corpus)

    result = EmployeeUpdateResult(
        employee_id=employee_id,
        activity_type=activity_type,
    )

    for req in required_skills:
        # ── Try to find this required skill in the employee profile ────────
        skill_dicts = [
            {"intitule": s.intitule, "_idx": i}
            for i, s in enumerate(employee_skills)
        ]
        best, sim = matcher.best_match(req.intitule, skill_dicts)

        if best is not None and sim >= THRESHOLD:
            # ── Existing skill: apply update ───────────────────────────────
            idx = best["_idx"]
            s = employee_skills[idx]
            current = s.effective_level
            new_f, delta = _compute_new_level(
                current, req.niveau_min, activity_type, feedback_multiplier
            )
            new_int = round(new_f)

            if new_int != current:  # only record actual changes
                result.updates.append(
                    SkillUpdate(
                        intitule=s.intitule,
                        skill_type=s.type,
                        old_level=current,
                        new_level=new_int,
                        new_level_float=new_f,
                        delta=delta,
                        source="existing",
                        label_before=EVAL_LABELS[current],
                        label_after=EVAL_LABELS[new_int],
                    )
                )
        else:
            # ── Skill not in profile: add at level 1 if required >= 1 ─────
            if req.niveau_min >= 1:
                result.new_skills.append(
                    SkillUpdate(
                        intitule=req.intitule,
                        skill_type=req.type,
                        old_level=0,
                        new_level=1,
                        new_level_float=1.0,
                        delta=1.0,
                        source="new_skill",
                        label_before=EVAL_LABELS[0],
                        label_after=EVAL_LABELS[1],
                    )
                )

    return result
