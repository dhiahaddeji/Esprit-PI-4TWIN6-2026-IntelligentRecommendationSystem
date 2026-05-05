"""
Shared pytest fixtures for the ML service test suite.
"""
import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure ml-service root is on the import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app


@pytest.fixture(scope="module")
def client():
    """Synchronous FastAPI test client shared across a test module."""
    with TestClient(app) as c:
        yield c


# ── Reusable payload factories ──────────────────────────────────────────────

@pytest.fixture
def single_employee():
    return {
        "employee_id": "emp-001",
        "employee_name": "Alice Martin",
        "competences": [
            {"intitule": "Python", "type": "savoir", "auto_eval": 3, "hierarchie_eval": 3},
            {"intitule": "Machine Learning", "type": "savoir", "auto_eval": 2, "hierarchie_eval": 2},
        ],
        "years_experience": 5.0,
    }


@pytest.fixture
def single_activity():
    return {
        "activity_id": "act-001",
        "activity_type": "formation",
        "prioritization": "upskilling",
        "competences_requises": [
            {"intitule": "Python", "type": "savoir", "niveau_min": 2},
            {"intitule": "Deep Learning", "type": "savoir", "niveau_min": 2},
        ],
    }


@pytest.fixture
def recommend_payload(single_employee, single_activity):
    return {
        "activity": single_activity,
        "employees": [single_employee],
    }


@pytest.fixture
def update_scores_payload():
    return {
        "employee_skills": [
            {
                "intitule": "Python",
                "type": "savoir",
                "auto_eval": 2,
                "hierarchie_eval": 2,
            }
        ],
        "required_skills": [
            {"intitule": "Python", "type": "savoir", "niveau_min": 2}
        ],
        "participation_status": "completed",
    }


@pytest.fixture
def feedback_payload():
    return {
        "activity_id": "act-001",
        "employee_id": "emp-001",
        "employee_name": "Alice Martin",
        "activity_type": "formation",
        "prioritization": "upskilling",
        "competences": [
            {"intitule": "Python", "type": "savoir", "auto_eval": 3, "hierarchie_eval": 3}
        ],
        "required_skills": [
            {"intitule": "Python", "type": "savoir", "niveau_min": 2}
        ],
        "years_experience": 5.0,
        "validated": True,
        "heuristic_score": 75.0,
    }
