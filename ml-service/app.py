"""
app.py — FastAPI ML service for employee recommendation.

Endpoints
─────────
POST /recommend          → rank employees for an activity
POST /update-scores      → compute skill score updates after activity completion
POST /feedback           → record HR/manager validation for model retraining
POST /train              → retrain the GradientBoosting model
GET  /health             → liveness probe

Run locally:
  pip install -r requirements.txt
  uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from recommender import (
    Recommender,
    EmployeeInput,
    ActivityInput,
    CompetenceItem,
    RequiredSkill as RecommenderRequiredSkill,
)
from updater import (
    compute_updates,
    SkillState,
    RequiredSkill as UpdaterRequiredSkill,
    SkillMatcher,
)
from trainer import add_feedback, train, load_feedback, MIN_SAMPLES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Singleton recommender (model loaded once at startup) ───────────────────────
_recommender = Recommender()

app = FastAPI(
    title="PI Recommendation ML Service",
    version="1.0.0",
    description="Machine-learning powered employee–activity recommendation engine",
)


# ══════════════════════════════════════════════════════════════════════════════
#  REQUEST / RESPONSE MODELS
# ══════════════════════════════════════════════════════════════════════════════

class CompetenceIn(BaseModel):
    intitule: str
    type: str = "savoir"
    auto_eval: int = Field(0, ge=0, le=4)
    hierarchie_eval: int = Field(-1, ge=-1, le=4)


class RequiredSkillIn(BaseModel):
    intitule: str
    type: str = "savoir"
    niveau_min: int = Field(2, ge=0, le=4)


class EmployeeIn(BaseModel):
    employee_id: str
    employee_name: str
    competences: list[CompetenceIn] = Field(default_factory=list)
    years_experience: float = 0.0


class ActivityIn(BaseModel):
    activity_id: str
    activity_type: str = "formation"
    prioritization: str = "expertise"
    competences_requises: list[RequiredSkillIn] = Field(default_factory=list)
    seats: int = Field(5, ge=1)


class RecommendRequest(BaseModel):
    employees: list[EmployeeIn]
    activity: ActivityIn


class SkillDetailOut(BaseModel):
    intitule: str
    employee_level: int
    required_level: int
    meets_minimum: bool
    level_ratio: float
    similarity: float
    emp_label: str
    req_label: str


class EmployeeScoreOut(BaseModel):
    employee_id: str
    employee_name: str
    score: float
    rank: int
    status: str                        # Selected | Backup
    details: list[SkillDetailOut]
    matched_skills: list[str]
    missing_skills: list[str]
    total_competences: int
    meets_all: bool
    meets_count: int
    explanation: str


class RecommendResponse(BaseModel):
    activity_id: str
    results: list[EmployeeScoreOut]
    model_used: str                    # "heuristic" | "heuristic+ml"


# ── Score update models ────────────────────────────────────────────────────────

class SkillStateIn(BaseModel):
    intitule: str
    type: str = "savoir"
    auto_eval: int = Field(0, ge=0, le=4)
    hierarchie_eval: int = Field(-1, ge=-1, le=4)


class UpdateScoresRequest(BaseModel):
    employee_id: str
    employee_skills: list[SkillStateIn]
    required_skills: list[RequiredSkillIn]
    activity_type: str = "formation"
    feedback_multiplier: float = Field(1.0, ge=0.0, le=1.0)


class SkillUpdateOut(BaseModel):
    intitule: str
    skill_type: str
    old_level: int
    new_level: int
    delta: float
    source: str                        # "existing" | "new_skill"
    label_before: str
    label_after: str


class UpdateScoresResponse(BaseModel):
    employee_id: str
    activity_type: str
    updates: list[SkillUpdateOut]       # changes to existing skills
    new_skills: list[SkillUpdateOut]    # newly acquired skills


# ── Feedback / training models ─────────────────────────────────────────────────

class FeedbackItem(BaseModel):
    features: list[float] = Field(..., min_length=12, max_length=12)
    label: int = Field(..., ge=0, le=1)
    activity_id: str
    employee_id: str


class FeedbackRequest(BaseModel):
    items: list[FeedbackItem]


class TrainResponse(BaseModel):
    status: str
    n_samples: int
    n_positive: Optional[int] = None
    n_negative: Optional[int] = None
    cv_roc_auc: Optional[float] = None
    train_accuracy: Optional[float] = None
    feature_importances: Optional[dict] = None
    reason: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    n_feedback = len(load_feedback())
    return {
        "status":       "ok",
        "model_ready":  _recommender._model_ready,
        "n_feedback":   n_feedback,
        "min_for_train": MIN_SAMPLES,
    }


@app.post("/recommend", response_model=RecommendResponse)
def recommend(body: RecommendRequest):
    if not body.employees:
        raise HTTPException(status_code=400, detail="No employees provided")

    # ── Convert Pydantic → domain objects ─────────────────────────────────
    employees = [
        EmployeeInput(
            employee_id=e.employee_id,
            employee_name=e.employee_name,
            years_experience=e.years_experience,
            competences=[
                CompetenceItem(
                    intitule=c.intitule,
                    type=c.type,
                    auto_eval=c.auto_eval,
                    hierarchie_eval=c.hierarchie_eval,
                )
                for c in e.competences
            ],
        )
        for e in body.employees
    ]

    activity = ActivityInput(
        activity_id=body.activity.activity_id,
        activity_type=body.activity.activity_type,
        prioritization=body.activity.prioritization,
        seats=body.activity.seats,
        competences_requises=[
            RecommenderRequiredSkill(
                intitule=r.intitule,
                type=r.type,
                niveau_min=r.niveau_min,
            )
            for r in body.activity.competences_requises
        ],
    )

    results = _recommender.recommend(employees, activity)

    return RecommendResponse(
        activity_id=body.activity.activity_id,
        model_used="heuristic+ml" if _recommender._model_ready else "heuristic",
        results=[
            EmployeeScoreOut(
                employee_id=r.employee_id,
                employee_name=r.employee_name,
                score=r.score,
                rank=r.rank,
                status=r.status,
                matched_skills=r.matched_skills,
                missing_skills=r.missing_skills,
                total_competences=r.total_competences,
                meets_all=r.meets_all,
                meets_count=r.meets_count,
                explanation=r.explanation,
                details=[
                    SkillDetailOut(
                        intitule=d.intitule,
                        employee_level=d.employee_level,
                        required_level=d.required_level,
                        meets_minimum=d.meets_minimum,
                        level_ratio=d.level_ratio,
                        similarity=d.similarity,
                        emp_label=d.emp_label,
                        req_label=d.req_label,
                    )
                    for d in r.details
                ],
            )
            for r in results
        ],
    )


@app.post("/update-scores", response_model=UpdateScoresResponse)
def update_scores(body: UpdateScoresRequest):
    # Build shared matcher from all skill names in this request
    matcher = SkillMatcher()
    corpus = [s.intitule for s in body.employee_skills] + [r.intitule for r in body.required_skills]
    matcher.fit(corpus)

    employee_skills = [
        SkillState(
            intitule=s.intitule,
            type=s.type,
            auto_eval=s.auto_eval,
            hierarchie_eval=s.hierarchie_eval,
        )
        for s in body.employee_skills
    ]

    required_skills = [
        UpdaterRequiredSkill(
            intitule=r.intitule,
            type=r.type,
            niveau_min=r.niveau_min,
        )
        for r in body.required_skills
    ]

    result = compute_updates(
        employee_id=body.employee_id,
        employee_skills=employee_skills,
        required_skills=required_skills,
        activity_type=body.activity_type,
        feedback_multiplier=body.feedback_multiplier,
        matcher=matcher,
    )

    return UpdateScoresResponse(
        employee_id=result.employee_id,
        activity_type=result.activity_type,
        updates=[
            SkillUpdateOut(
                intitule=u.intitule,
                skill_type=u.skill_type,
                old_level=u.old_level,
                new_level=u.new_level,
                delta=round(u.delta, 4),
                source=u.source,
                label_before=u.label_before,
                label_after=u.label_after,
            )
            for u in result.updates
        ],
        new_skills=[
            SkillUpdateOut(
                intitule=u.intitule,
                skill_type=u.skill_type,
                old_level=u.old_level,
                new_level=u.new_level,
                delta=round(u.delta, 4),
                source=u.source,
                label_before=u.label_before,
                label_after=u.label_after,
            )
            for u in result.new_skills
        ],
    )


@app.post("/feedback")
def feedback(body: FeedbackRequest):
    """
    Record HR/manager validation decisions for retraining.
    Call this after HR validates (label=1) or manager refuses (label=0) employees.
    """
    total = 0
    for item in body.items:
        total = add_feedback(
            features=item.features,
            label=item.label,
            activity_id=item.activity_id,
            employee_id=item.employee_id,
        )
    return {
        "recorded": len(body.items),
        "total_feedback": total,
        "ready_to_train": total >= MIN_SAMPLES,
    }


@app.post("/train", response_model=TrainResponse)
def retrain():
    """
    Retrain the GradientBoosting model on all stored feedback.
    Requires at least MIN_SAMPLES feedback rows.
    """
    result = train(_recommender)
    return TrainResponse(**result)
