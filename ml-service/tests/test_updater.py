"""
Unit tests for the updater.py module.
Tests skill score update logic after activity completion.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from updater import (
    SkillState,
    RequiredSkill,
    SkillUpdate,
    EmployeeUpdateResult,
    compute_updates,
    _compute_new_level,
    BASE_LR,
    IMPACT,
    EVAL_LABELS,
)
from similarity import SkillMatcher


# ── Test SkillState dataclass ─────────────────────────────────────────────────

class TestSkillState:
    def test_skill_state_creation(self):
        skill = SkillState(intitule="Python", type="savoir", auto_eval=3)
        assert skill.intitule == "Python"
        assert skill.type == "savoir"
        assert skill.auto_eval == 3

    def test_skill_state_default_hierarchie_eval(self):
        skill = SkillState(intitule="Python", type="savoir", auto_eval=2)
        assert skill.hierarchie_eval == -1

    def test_effective_level_uses_hierarchie_when_set(self):
        skill = SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=3)
        assert skill.effective_level == 3

    def test_effective_level_uses_auto_eval_when_hierarchie_not_set(self):
        skill = SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=-1)
        assert skill.effective_level == 2

    def test_effective_level_with_zero_hierarchie(self):
        skill = SkillState(intitule="Python", type="savoir", auto_eval=3, hierarchie_eval=0)
        assert skill.effective_level == 0


# ── Test RequiredSkill dataclass ──────────────────────────────────────────────

class TestRequiredSkill:
    def test_required_skill_creation(self):
        req = RequiredSkill(intitule="Python", type="savoir", niveau_min=2)
        assert req.intitule == "Python"
        assert req.type == "savoir"
        assert req.niveau_min == 2


# ── Test SkillUpdate dataclass ────────────────────────────────────────────────

class TestSkillUpdate:
    def test_skill_update_creation(self):
        update = SkillUpdate(
            intitule="Python",
            skill_type="savoir",
            old_level=2,
            new_level=3,
            new_level_float=2.8,
            delta=0.8,
            source="existing",
            label_before="Pratique",
            label_after="Maîtrise",
        )
        assert update.intitule == "Python"
        assert update.old_level == 2
        assert update.new_level == 3


# ── Test EmployeeUpdateResult dataclass ───────────────────────────────────────

class TestEmployeeUpdateResult:
    def test_employee_update_result_creation(self):
        result = EmployeeUpdateResult(
            employee_id="emp-1",
            activity_type="formation",
        )
        assert result.employee_id == "emp-1"
        assert result.activity_type == "formation"
        assert result.updates == []
        assert result.new_skills == []

    def test_employee_update_result_with_updates(self):
        update = SkillUpdate(
            intitule="Python",
            skill_type="savoir",
            old_level=2,
            new_level=3,
            new_level_float=2.8,
            delta=0.8,
            source="existing",
            label_before="Pratique",
            label_after="Maîtrise",
        )
        result = EmployeeUpdateResult(
            employee_id="emp-1",
            activity_type="formation",
            updates=[update],
        )
        assert len(result.updates) == 1


# ── Test _compute_new_level function ──────────────────────────────────────────

class TestComputeNewLevel:
    def test_compute_new_level_basic(self):
        new_level, delta = _compute_new_level(
            current=2,
            required_level=3,
            activity_type="formation",
        )
        assert new_level > 2
        assert new_level <= 4
        assert delta > 0

    def test_compute_new_level_never_decreases(self):
        new_level, delta = _compute_new_level(
            current=4,
            required_level=2,
            activity_type="formation",
        )
        assert new_level == 4
        assert delta == 0

    def test_compute_new_level_caps_at_four(self):
        new_level, delta = _compute_new_level(
            current=3,
            required_level=4,
            activity_type="certification",
            feedback_multiplier=2.0,
        )
        assert new_level <= 4

    def test_compute_new_level_certification_highest_impact(self):
        new_cert, _ = _compute_new_level(2, 3, "certification")
        new_form, _ = _compute_new_level(2, 3, "formation")
        assert new_cert > new_form

    def test_compute_new_level_audit_lowest_impact(self):
        new_audit, _ = _compute_new_level(2, 3, "audit")
        new_form, _ = _compute_new_level(2, 3, "formation")
        assert new_audit < new_form

    def test_compute_new_level_feedback_multiplier_effect(self):
        new_full, _ = _compute_new_level(2, 3, "formation", feedback_multiplier=1.0)
        new_half, _ = _compute_new_level(2, 3, "formation", feedback_multiplier=0.5)
        assert new_full > new_half

    def test_compute_new_level_zero_gap(self):
        new_level, delta = _compute_new_level(3, 3, "formation")
        assert delta >= 0
        assert new_level >= 3

    def test_compute_new_level_large_gap(self):
        new_level, delta = _compute_new_level(0, 4, "certification")
        assert new_level > 0
        assert delta > 0

    def test_compute_new_level_expert_stays_expert(self):
        new_level, delta = _compute_new_level(4, 2, "formation")
        assert new_level == 4
        assert delta == 0


# ── Test compute_updates function ─────────────────────────────────────────────

class TestComputeUpdates:
    @pytest.fixture
    def matcher(self):
        m = SkillMatcher()
        m.fit(["Python", "JavaScript", "Machine Learning", "Docker"])
        return m

    def test_compute_updates_existing_skill(self, matcher):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=3),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            matcher=matcher,
        )
        
        assert result.employee_id == "emp-1"
        assert result.activity_type == "formation"
        assert len(result.updates) > 0

    def test_compute_updates_new_skill(self, matcher):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        required_skills = [
            RequiredSkill(intitule="Machine Learning", type="savoir", niveau_min=2),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            matcher=matcher,
        )
        
        assert len(result.new_skills) > 0
        assert result.new_skills[0].new_level == 1

    def test_compute_updates_no_change_when_already_expert(self, matcher):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=4, hierarchie_eval=4),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=2),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            matcher=matcher,
        )
        
        assert len(result.updates) == 0

    def test_compute_updates_empty_required_skills(self, matcher):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=[],
            activity_type="formation",
            matcher=matcher,
        )
        
        assert len(result.updates) == 0
        assert len(result.new_skills) == 0

    def test_compute_updates_empty_employee_skills(self, matcher):
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=2),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=[],
            required_skills=required_skills,
            activity_type="formation",
            matcher=matcher,
        )
        
        assert len(result.new_skills) > 0

    def test_compute_updates_multiple_skills(self, matcher):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
            SkillState(intitule="JavaScript", type="savoir", auto_eval=1, hierarchie_eval=1),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=3),
            RequiredSkill(intitule="JavaScript", type="savoir", niveau_min=2),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            matcher=matcher,
        )
        
        assert len(result.updates) == 2

    def test_compute_updates_certification_activity(self, matcher):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=3),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="certification",
            matcher=matcher,
        )
        
        # Certification should have higher impact
        assert len(result.updates) > 0
        update = result.updates[0]
        assert update.new_level > update.old_level

    def test_compute_updates_feedback_multiplier(self, matcher):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=3),
        ]
        
        result_full = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            feedback_multiplier=1.0,
            matcher=matcher,
        )
        
        result_half = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            feedback_multiplier=0.5,
            matcher=matcher,
        )
        
        if result_full.updates and result_half.updates:
            assert result_full.updates[0].delta > result_half.updates[0].delta

    def test_compute_updates_without_matcher(self):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=3),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            matcher=None,  # Should create its own matcher
        )
        
        assert result is not None
        assert isinstance(result, EmployeeUpdateResult)

    def test_compute_updates_skill_labels(self, matcher):
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=3),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            matcher=matcher,
        )
        
        if result.updates:
            update = result.updates[0]
            assert update.label_before in EVAL_LABELS
            assert update.label_after in EVAL_LABELS

    def test_compute_updates_new_skill_not_added_if_niveau_min_zero(self, matcher):
        employee_skills = []
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=0),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            matcher=matcher,
        )
        
        assert len(result.new_skills) == 0

    def test_compute_updates_similar_skill_names(self, matcher):
        employee_skills = [
            SkillState(intitule="Python Programming", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=3),
        ]
        
        result = compute_updates(
            employee_id="emp-1",
            employee_skills=employee_skills,
            required_skills=required_skills,
            activity_type="formation",
            matcher=matcher,
        )
        
        # Should match "Python Programming" with "Python"
        assert len(result.updates) > 0


# ── Test constants ────────────────────────────────────────────────────────────

class TestConstants:
    def test_base_lr_is_reasonable(self):
        assert 0.0 < BASE_LR < 1.0
        assert BASE_LR == 0.35

    def test_impact_dict_has_all_activity_types(self):
        assert "formation" in IMPACT
        assert "certification" in IMPACT
        assert "mission" in IMPACT
        assert "projet" in IMPACT
        assert "audit" in IMPACT

    def test_impact_values_are_reasonable(self):
        for activity_type, impact in IMPACT.items():
            assert 0.0 < impact <= 1.0

    def test_certification_has_highest_impact(self):
        assert IMPACT["certification"] == 1.0
        assert all(IMPACT[k] <= 1.0 for k in IMPACT)

    def test_audit_has_lowest_impact(self):
        assert IMPACT["audit"] == min(IMPACT.values())

    def test_eval_labels_has_five_levels(self):
        assert len(EVAL_LABELS) == 5

    def test_eval_labels_correct_order(self):
        assert EVAL_LABELS[0] == "Pas de compétence"
        assert EVAL_LABELS[4] == "Expert"


# ── Integration tests ─────────────────────────────────────────────────────────

class TestUpdaterIntegration:
    def test_realistic_skill_progression(self):
        matcher = SkillMatcher()
        matcher.fit(["Python", "JavaScript", "Docker", "Kubernetes"])
        
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=1, hierarchie_eval=1),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=2),
        ]
        
        # Simulate multiple activities
        for _ in range(3):
            result = compute_updates(
                employee_id="emp-1",
                employee_skills=employee_skills,
                required_skills=required_skills,
                activity_type="formation",
                matcher=matcher,
            )
            
            # Apply updates
            if result.updates:
                for update in result.updates:
                    for skill in employee_skills:
                        if skill.intitule == update.intitule:
                            skill.auto_eval = update.new_level
                            skill.hierarchie_eval = update.new_level
        
        # After 3 formations, skill should have improved
        assert employee_skills[0].effective_level > 1

    def test_mixed_activity_types_progression(self):
        matcher = SkillMatcher()
        matcher.fit(["Python"])
        
        employee_skills = [
            SkillState(intitule="Python", type="savoir", auto_eval=2, hierarchie_eval=2),
        ]
        required_skills = [
            RequiredSkill(intitule="Python", type="savoir", niveau_min=3),
        ]
        
        # Formation
        result1 = compute_updates(
            "emp-1", employee_skills, required_skills, "formation", matcher=matcher
        )
        
        # Certification (higher impact)
        result2 = compute_updates(
            "emp-1", employee_skills, required_skills, "certification", matcher=matcher
        )
        
        # Audit (lower impact)
        result3 = compute_updates(
            "emp-1", employee_skills, required_skills, "audit", matcher=matcher
        )
        
        if result1.updates and result2.updates and result3.updates:
            assert result2.updates[0].delta > result1.updates[0].delta
            assert result1.updates[0].delta > result3.updates[0].delta
