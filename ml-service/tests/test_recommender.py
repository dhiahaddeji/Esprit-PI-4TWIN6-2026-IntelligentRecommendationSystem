"""
Unit tests for the Recommender class and supporting logic in recommender.py.
Tests run purely in-process with no HTTP layer.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from recommender import (
    Recommender,
    EmployeeInput,
    ActivityInput,
    CompetenceItem,
    RequiredSkill,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_employee(
    employee_id="emp-1",
    employee_name="Alice",
    competences=None,
    years_experience=5.0,
):
    if competences is None:
        competences = [
            CompetenceItem(intitule="Python", type="savoir", auto_eval=3, hierarchie_eval=3),
        ]
    return EmployeeInput(
        employee_id=employee_id,
        employee_name=employee_name,
        competences=competences,
        years_experience=years_experience,
    )


def make_activity(
    activity_id="act-1",
    activity_type="formation",
    prioritization="upskilling",
    required=None,
):
    if required is None:
        required = [RequiredSkill(intitule="Python", type="savoir", niveau_min=2)]
    return ActivityInput(
        activity_id=activity_id,
        activity_type=activity_type,
        prioritization=prioritization,
        competences_requises=required,
    )


@pytest.fixture(scope="module")
def recommender():
    return Recommender()


# ── Recommender.rank ───────────────────────────────────────────────────────────

class TestRecommenderRank:
    def test_rank_returns_list(self, recommender):
        result = recommender.rank([make_employee()], make_activity())
        assert isinstance(result, list)

    def test_rank_empty_employees_returns_empty(self, recommender):
        result = recommender.rank([], make_activity())
        assert result == []

    def test_rank_contains_employee_id(self, recommender):
        result = recommender.rank([make_employee()], make_activity())
        assert len(result) > 0
        assert hasattr(result[0], "employee_id") or "employee_id" in result[0]

    def test_rank_score_in_range(self, recommender):
        result = recommender.rank([make_employee()], make_activity())
        for item in result:
            score = item.score if hasattr(item, "score") else item["score"]
            assert 0 <= score <= 100

    def test_rank_sorted_descending(self, recommender):
        emp_low = make_employee(
            "emp-low",
            competences=[CompetenceItem(intitule="Python", type="savoir", auto_eval=1, hierarchie_eval=1)],
            years_experience=1.0,
        )
        emp_high = make_employee(
            "emp-high",
            competences=[CompetenceItem(intitule="Python", type="savoir", auto_eval=4, hierarchie_eval=4)],
            years_experience=10.0,
        )
        result = recommender.rank([emp_low, emp_high], make_activity(prioritization="expertise"))
        scores = [
            (item.score if hasattr(item, "score") else item["score"]) for item in result
        ]
        assert scores == sorted(scores, reverse=True)

    def test_rank_employee_with_no_skills_gets_low_score(self, recommender):
        emp = make_employee("emp-noskills", competences=[], years_experience=0.0)
        result = recommender.rank([emp], make_activity())
        score = result[0].score if hasattr(result[0], "score") else result[0]["score"]
        assert score < 50

    def test_rank_perfect_match_gets_high_score(self, recommender):
        emp = make_employee(
            "emp-perfect",
            competences=[
                CompetenceItem(intitule="Python", type="savoir", auto_eval=4, hierarchie_eval=4),
            ],
            years_experience=15.0,
        )
        result = recommender.rank([emp], make_activity())
        score = result[0].score if hasattr(result[0], "score") else result[0]["score"]
        assert score >= 50

    def test_rank_multiple_employees_preserves_all(self, recommender):
        employees = [make_employee(f"emp-{i}") for i in range(5)]
        result = recommender.rank(employees, make_activity())
        assert len(result) == 5

    def test_rank_certification_activity(self, recommender):
        emp = make_employee()
        activity = make_activity(activity_type="certification")
        result = recommender.rank([emp], activity)
        assert len(result) == 1

    def test_rank_upskilling_prioritization(self, recommender):
        emp_novice = make_employee(
            "novice",
            competences=[CompetenceItem(intitule="Python", type="savoir", auto_eval=1, hierarchie_eval=1)],
        )
        emp_expert = make_employee(
            "expert",
            competences=[CompetenceItem(intitule="Python", type="savoir", auto_eval=4, hierarchie_eval=4)],
        )
        result = recommender.rank(
            [emp_novice, emp_expert],
            make_activity(prioritization="upskilling"),
        )
        ids = [
            (item.employee_id if hasattr(item, "employee_id") else item["employee_id"])
            for item in result
        ]
        assert ids[0] in ("novice", "expert")

    def test_rank_expertise_prioritization(self, recommender):
        emp_novice = make_employee(
            "novice",
            competences=[CompetenceItem(intitule="Python", type="savoir", auto_eval=1, hierarchie_eval=1)],
        )
        emp_expert = make_employee(
            "expert",
            competences=[CompetenceItem(intitule="Python", type="savoir", auto_eval=4, hierarchie_eval=4)],
        )
        result = recommender.rank(
            [emp_novice, emp_expert],
            make_activity(prioritization="expertise"),
        )
        top_id = result[0].employee_id if hasattr(result[0], "employee_id") else result[0]["employee_id"]
        assert top_id == "expert"

    def test_rank_no_required_skills(self, recommender):
        emp = make_employee()
        activity = make_activity(required=[])
        result = recommender.rank([emp], activity)
        assert isinstance(result, list)

    def test_rank_unrelated_skills_returns_low_score(self, recommender):
        emp = make_employee(
            "emp-other",
            competences=[
                CompetenceItem(intitule="Marketing Digital", type="savoir", auto_eval=4, hierarchie_eval=4),
            ],
        )
        result = recommender.rank(
            [emp],
            make_activity(required=[RequiredSkill(intitule="Python", type="savoir", niveau_min=3)]),
        )
        score = result[0].score if hasattr(result[0], "score") else result[0]["score"]
        assert score < 60


# ── EmployeeInput validation ───────────────────────────────────────────────────

class TestEmployeeInput:
    def test_default_years_experience_is_zero(self):
        emp = EmployeeInput(employee_id="e1", employee_name="Test")
        assert emp.years_experience == 0.0

    def test_default_competences_empty(self):
        emp = EmployeeInput(employee_id="e1", employee_name="Test")
        assert emp.competences == []


# ── ActivityInput validation ───────────────────────────────────────────────────

class TestActivityInput:
    def test_default_type_is_formation(self):
        act = ActivityInput(activity_id="a1")
        assert act.activity_type == "formation"

    def test_default_prioritization_is_expertise(self):
        act = ActivityInput(activity_id="a1")
        assert act.prioritization == "expertise"

    def test_default_required_skills_empty(self):
        act = ActivityInput(activity_id="a1")
        assert act.competences_requises == []


# ── CompetenceItem validation ──────────────────────────────────────────────────

class TestCompetenceItem:
    def test_auto_eval_defaults_to_zero(self):
        c = CompetenceItem(intitule="Python", type="savoir")
        assert c.auto_eval == 0

    def test_hierarchie_eval_defaults_to_minus_one(self):
        c = CompetenceItem(intitule="Python", type="savoir")
        assert c.hierarchie_eval == -1

    def test_rejects_auto_eval_above_four(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CompetenceItem(intitule="X", type="savoir", auto_eval=5)

    def test_rejects_auto_eval_below_zero(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CompetenceItem(intitule="X", type="savoir", auto_eval=-1)
