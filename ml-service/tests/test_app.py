"""
Integration tests for the FastAPI ML service endpoints.
Uses the synchronous TestClient so no async infrastructure is required.
"""
import pytest


# ── /health ────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_body_contains_status_ok(self, client):
        response = client.get("/health")
        body = response.json()
        assert body.get("status") == "ok"


# ── /recommend ─────────────────────────────────────────────────────────────────

class TestRecommend:
    def test_recommend_returns_200(self, client, recommend_payload):
        response = client.post("/recommend", json=recommend_payload)
        assert response.status_code == 200

    def test_recommend_response_is_list(self, client, recommend_payload):
        response = client.post("/recommend", json=recommend_payload)
        body = response.json()
        assert isinstance(body, list)

    def test_recommend_contains_employee_id(self, client, recommend_payload):
        response = client.post("/recommend", json=recommend_payload)
        body = response.json()
        assert len(body) > 0
        assert "employee_id" in body[0]

    def test_recommend_contains_score(self, client, recommend_payload):
        response = client.post("/recommend", json=recommend_payload)
        body = response.json()
        assert "score" in body[0]
        assert isinstance(body[0]["score"], (int, float))

    def test_recommend_score_in_valid_range(self, client, recommend_payload):
        response = client.post("/recommend", json=recommend_payload)
        body = response.json()
        for item in body:
            assert 0 <= item["score"] <= 100

    def test_recommend_sorted_by_score_descending(self, client):
        payload = {
            "activity": {
                "activity_id": "act-sort",
                "activity_type": "formation",
                "prioritization": "expertise",
                "competences_requises": [
                    {"intitule": "Python", "type": "savoir", "niveau_min": 2}
                ],
            },
            "employees": [
                {
                    "employee_id": "emp-low",
                    "employee_name": "Bob",
                    "competences": [
                        {"intitule": "Python", "type": "savoir", "auto_eval": 1, "hierarchie_eval": 1}
                    ],
                    "years_experience": 1.0,
                },
                {
                    "employee_id": "emp-high",
                    "employee_name": "Alice",
                    "competences": [
                        {"intitule": "Python", "type": "savoir", "auto_eval": 4, "hierarchie_eval": 4}
                    ],
                    "years_experience": 10.0,
                },
            ],
        }
        response = client.post("/recommend", json=payload)
        assert response.status_code == 200
        body = response.json()
        scores = [item["score"] for item in body]
        assert scores == sorted(scores, reverse=True)

    def test_recommend_empty_employee_list(self, client, single_activity):
        payload = {"activity": single_activity, "employees": []}
        response = client.post("/recommend", json=payload)
        assert response.status_code == 200
        assert response.json() == []

    def test_recommend_employee_with_no_competences(self, client, single_activity):
        payload = {
            "activity": single_activity,
            "employees": [
                {
                    "employee_id": "emp-empty",
                    "employee_name": "No Skills",
                    "competences": [],
                    "years_experience": 0.0,
                }
            ],
        }
        response = client.post("/recommend", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["score"] == pytest.approx(0.0, abs=10)

    def test_recommend_certification_activity(self, client, single_employee):
        payload = {
            "activity": {
                "activity_id": "cert-act",
                "activity_type": "certification",
                "prioritization": "upskilling",
                "competences_requises": [
                    {"intitule": "Python", "type": "savoir", "niveau_min": 2}
                ],
            },
            "employees": [single_employee],
        }
        response = client.post("/recommend", json=payload)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_recommend_missing_activity_returns_422(self, client):
        response = client.post("/recommend", json={"employees": []})
        assert response.status_code == 422

    def test_recommend_missing_employees_returns_422(self, client, single_activity):
        response = client.post("/recommend", json={"activity": single_activity})
        assert response.status_code == 422


# ── /update-scores ─────────────────────────────────────────────────────────────

class TestUpdateScores:
    def test_update_scores_returns_200(self, client, update_scores_payload):
        response = client.post("/update-scores", json=update_scores_payload)
        assert response.status_code == 200

    def test_update_scores_returns_list(self, client, update_scores_payload):
        response = client.post("/update-scores", json=update_scores_payload)
        assert isinstance(response.json(), list)

    def test_update_scores_has_intitule(self, client, update_scores_payload):
        response = client.post("/update-scores", json=update_scores_payload)
        body = response.json()
        if body:
            assert "intitule" in body[0]

    def test_update_scores_empty_skills(self, client):
        payload = {
            "employee_skills": [],
            "required_skills": [],
            "participation_status": "completed",
        }
        response = client.post("/update-scores", json=payload)
        assert response.status_code == 200
        assert response.json() == []

    def test_update_scores_not_completed(self, client):
        payload = {
            "employee_skills": [
                {"intitule": "Python", "type": "savoir", "auto_eval": 2, "hierarchie_eval": 2}
            ],
            "required_skills": [
                {"intitule": "Python", "type": "savoir", "niveau_min": 2}
            ],
            "participation_status": "declined",
        }
        response = client.post("/update-scores", json=payload)
        assert response.status_code == 200


# ── /feedback ──────────────────────────────────────────────────────────────────

class TestFeedback:
    def test_feedback_returns_200(self, client, feedback_payload):
        response = client.post("/feedback", json=feedback_payload)
        assert response.status_code == 200

    def test_feedback_body_has_recorded_key(self, client, feedback_payload):
        response = client.post("/feedback", json=feedback_payload)
        body = response.json()
        assert "recorded" in body or "total_samples" in body or "message" in body

    def test_feedback_negative_validation(self, client, feedback_payload):
        feedback_payload["validated"] = False
        response = client.post("/feedback", json=feedback_payload)
        assert response.status_code == 200

    def test_feedback_missing_required_field_returns_422(self, client):
        response = client.post("/feedback", json={"activity_id": "act-1"})
        assert response.status_code == 422


# ── /train ─────────────────────────────────────────────────────────────────────

class TestTrain:
    def test_train_returns_200(self, client):
        response = client.post("/train")
        assert response.status_code == 200

    def test_train_returns_status_field(self, client):
        body = client.post("/train").json()
        assert "status" in body or "message" in body or "trained" in body or "skipped" in body
