"""
Unit tests for the trainer.py module.
Tests feedback storage, loading, and model training logic.
"""
import sys
import os
import json
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from trainer import (
    load_feedback,
    save_feedback,
    add_feedback,
    train,
    FEEDBACK_PATH,
    MIN_SAMPLES,
)


# ── Test load_feedback ────────────────────────────────────────────────────────

class TestLoadFeedback:
    def test_load_feedback_returns_empty_when_file_missing(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "nonexistent.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        result = load_feedback()
        assert result == []

    def test_load_feedback_returns_list(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        fake_path.write_text("[]", encoding="utf-8")
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        result = load_feedback()
        assert isinstance(result, list)

    def test_load_feedback_parses_json(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        data = [
            {
                "features": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
                "label": 1,
                "activity_id": "act-1",
                "employee_id": "emp-1",
            }
        ]
        fake_path.write_text(json.dumps(data), encoding="utf-8")
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        result = load_feedback()
        assert len(result) == 1
        assert result[0]["label"] == 1

    def test_load_feedback_handles_corrupted_json(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        fake_path.write_text("invalid json", encoding="utf-8")
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        result = load_feedback()
        assert result == []


# ── Test save_feedback ────────────────────────────────────────────────────────

class TestSaveFeedback:
    def test_save_feedback_creates_file(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        data = [{"features": [0.5] * 12, "label": 1}]
        save_feedback(data)
        assert fake_path.exists()

    def test_save_feedback_writes_json(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        data = [{"features": [0.5] * 12, "label": 1, "activity_id": "act-1"}]
        save_feedback(data)
        content = json.loads(fake_path.read_text(encoding="utf-8"))
        assert len(content) == 1
        assert content[0]["label"] == 1

    def test_save_feedback_creates_parent_directory(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "nested" / "dir" / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        save_feedback([])
        assert fake_path.parent.exists()

    def test_save_feedback_overwrites_existing(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        save_feedback([{"label": 0}])
        save_feedback([{"label": 1}])
        content = json.loads(fake_path.read_text(encoding="utf-8"))
        assert len(content) == 1
        assert content[0]["label"] == 1


# ── Test add_feedback ─────────────────────────────────────────────────────────

class TestAddFeedback:
    def test_add_feedback_returns_count(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        count = add_feedback([0.5] * 12, 1, "act-1", "emp-1")
        assert count == 1

    def test_add_feedback_appends_record(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        add_feedback([0.5] * 12, 1, "act-1", "emp-1")
        add_feedback([0.6] * 12, 0, "act-2", "emp-2")
        records = load_feedback()
        assert len(records) == 2

    def test_add_feedback_deduplicates_by_activity_employee(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        add_feedback([0.5] * 12, 1, "act-1", "emp-1")
        add_feedback([0.6] * 12, 0, "act-1", "emp-1")  # same activity + employee
        records = load_feedback()
        assert len(records) == 1
        assert records[0]["label"] == 0  # latest wins

    def test_add_feedback_preserves_other_records(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        add_feedback([0.5] * 12, 1, "act-1", "emp-1")
        add_feedback([0.6] * 12, 0, "act-2", "emp-2")
        add_feedback([0.7] * 12, 1, "act-1", "emp-1")  # update first
        records = load_feedback()
        assert len(records) == 2
        # Check that emp-2 record is preserved
        emp2_records = [r for r in records if r["employee_id"] == "emp-2"]
        assert len(emp2_records) == 1

    def test_add_feedback_stores_all_fields(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        features = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.11, 0.12]
        add_feedback(features, 1, "act-test", "emp-test")
        records = load_feedback()
        assert records[0]["features"] == features
        assert records[0]["label"] == 1
        assert records[0]["activity_id"] == "act-test"
        assert records[0]["employee_id"] == "emp-test"


# ── Test train function ───────────────────────────────────────────────────────

class TestTrain:
    @pytest.fixture
    def mock_recommender(self):
        recommender = Mock()
        recommender.save_model = Mock()
        return recommender

    def test_train_skips_when_insufficient_samples(self, tmp_path, monkeypatch, mock_recommender):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        # Add only a few samples (less than MIN_SAMPLES)
        for i in range(5):
            add_feedback([0.5] * 12, i % 2, f"act-{i}", f"emp-{i}")
        
        result = train(mock_recommender)
        assert result["status"] == "skipped"
        assert "Not enough feedback" in result["reason"]

    def test_train_skips_when_insufficient_positive_samples(self, tmp_path, monkeypatch, mock_recommender):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        # Add enough samples but all negative
        for i in range(MIN_SAMPLES):
            add_feedback([0.5] * 12, 0, f"act-{i}", f"emp-{i}")
        
        result = train(mock_recommender)
        assert result["status"] == "skipped"
        assert "at least 2 positive" in result["reason"]

    def test_train_skips_when_insufficient_negative_samples(self, tmp_path, monkeypatch, mock_recommender):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        # Add enough samples but all positive
        for i in range(MIN_SAMPLES):
            add_feedback([0.5] * 12, 1, f"act-{i}", f"emp-{i}")
        
        result = train(mock_recommender)
        assert result["status"] == "skipped"
        assert "at least 2 positive" in result["reason"]

    def test_train_succeeds_with_sufficient_balanced_data(self, tmp_path, monkeypatch, mock_recommender):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        # Add balanced samples
        for i in range(MIN_SAMPLES):
            label = 1 if i < MIN_SAMPLES // 2 else 0
            add_feedback([0.5 + i * 0.01] * 12, label, f"act-{i}", f"emp-{i}")
        
        result = train(mock_recommender)
        assert result["status"] == "trained"
        assert result["n_samples"] == MIN_SAMPLES
        assert mock_recommender.save_model.called

    def test_train_returns_metrics(self, tmp_path, monkeypatch, mock_recommender):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        for i in range(MIN_SAMPLES):
            label = 1 if i < MIN_SAMPLES // 2 else 0
            add_feedback([0.5 + i * 0.01] * 12, label, f"act-{i}", f"emp-{i}")
        
        result = train(mock_recommender)
        assert "n_positive" in result
        assert "n_negative" in result
        assert "train_accuracy" in result
        assert "feature_importances" in result

    def test_train_includes_feature_importances(self, tmp_path, monkeypatch, mock_recommender):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        for i in range(MIN_SAMPLES):
            label = 1 if i < MIN_SAMPLES // 2 else 0
            add_feedback([0.5 + i * 0.01] * 12, label, f"act-{i}", f"emp-{i}")
        
        result = train(mock_recommender)
        importances = result.get("feature_importances", {})
        assert "coverage_ratio" in importances
        assert "avg_similarity" in importances

    def test_train_calls_save_model(self, tmp_path, monkeypatch, mock_recommender):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        for i in range(MIN_SAMPLES):
            label = 1 if i < MIN_SAMPLES // 2 else 0
            add_feedback([0.5 + i * 0.01] * 12, label, f"act-{i}", f"emp-{i}")
        
        train(mock_recommender)
        assert mock_recommender.save_model.call_count == 1

    def test_train_with_large_dataset_includes_cv_scores(self, tmp_path, monkeypatch, mock_recommender):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        # Add 30+ samples to trigger cross-validation
        for i in range(40):
            label = 1 if i < 20 else 0
            add_feedback([0.5 + i * 0.01] * 12, label, f"act-{i}", f"emp-{i}")
        
        result = train(mock_recommender)
        assert "cv_roc_auc" in result
        if result["cv_roc_auc"] is not None:
            assert 0.0 <= result["cv_roc_auc"] <= 1.0


# ── Test MIN_SAMPLES constant ─────────────────────────────────────────────────

class TestConstants:
    def test_min_samples_is_reasonable(self):
        assert MIN_SAMPLES > 0
        assert MIN_SAMPLES == 20

    def test_feedback_path_is_pathlib(self):
        assert isinstance(FEEDBACK_PATH, Path)


# ── Integration tests ─────────────────────────────────────────────────────────

class TestTrainerIntegration:
    def test_full_feedback_cycle(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        
        # Add feedback
        count1 = add_feedback([0.5] * 12, 1, "act-1", "emp-1")
        assert count1 == 1
        
        # Add more feedback
        count2 = add_feedback([0.6] * 12, 0, "act-2", "emp-2")
        assert count2 == 2
        
        # Load and verify
        records = load_feedback()
        assert len(records) == 2
        
        # Update existing
        count3 = add_feedback([0.7] * 12, 1, "act-1", "emp-1")
        assert count3 == 2  # still 2 records, one updated
        
        records = load_feedback()
        emp1_record = [r for r in records if r["employee_id"] == "emp-1"][0]
        assert emp1_record["features"][0] == 0.7

    def test_train_with_realistic_data(self, tmp_path, monkeypatch):
        fake_path = tmp_path / "feedback.json"
        monkeypatch.setattr("trainer.FEEDBACK_PATH", fake_path)
        
        # Simulate realistic feedback data
        import random
        random.seed(42)
        
        for i in range(MIN_SAMPLES):
            # Generate realistic features
            features = [
                random.uniform(0.3, 1.0),  # coverage_ratio
                random.uniform(0.5, 1.0),  # avg_level_ratio
                random.uniform(0.6, 1.0),  # avg_similarity
                random.uniform(0.4, 1.0),  # meets_ratio
                random.uniform(0.0, 0.5),  # avg_level_gap_norm
                random.uniform(0.3, 0.9),  # profile_breadth
                random.uniform(0.5, 1.0),  # ctx_weight_norm
                random.uniform(50, 90),    # heuristic_score
                random.uniform(0.0, 1.0),  # experience_norm
                random.uniform(0.5, 1.0),  # match_ratio
                random.uniform(0.0, 2.0),  # raw_level_gap
                random.choice([0, 1]),     # is_certification
            ]
            label = 1 if i < MIN_SAMPLES // 2 else 0
            add_feedback(features, label, f"act-{i}", f"emp-{i}")
        
        mock_recommender = Mock()
        mock_recommender.save_model = Mock()
        
        result = train(mock_recommender)
        assert result["status"] == "trained"
        assert result["train_accuracy"] > 0.0
