"""
Unit tests for the similarity.py module.
Tests the SkillMatcher class and its TF-IDF-based skill matching logic.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from similarity import SkillMatcher, _normalize, _trigram_jaccard, THRESHOLD


# ── Test _normalize function ──────────────────────────────────────────────────

class TestNormalize:
    def test_normalize_lowercase(self):
        assert _normalize("Python") == "python"
        assert _normalize("JAVASCRIPT") == "javascript"

    def test_normalize_removes_punctuation(self):
        assert _normalize("C++") == "c"
        assert _normalize("Node.js") == "nodejs"

    def test_normalize_expands_js_alias(self):
        result = _normalize("js")
        assert "javascript" in result

    def test_normalize_expands_ts_alias(self):
        result = _normalize("ts")
        assert "typescript" in result

    def test_normalize_expands_py_alias(self):
        result = _normalize("py")
        assert "python" in result

    def test_normalize_expands_ml_alias(self):
        result = _normalize("ml")
        assert "machine learning" in result

    def test_normalize_expands_ai_alias(self):
        result = _normalize("ai")
        assert "artificial intelligence" in result

    def test_normalize_expands_k8s_alias(self):
        result = _normalize("k8s")
        assert "kubernetes" in result

    def test_normalize_expands_aws_alias(self):
        result = _normalize("aws")
        assert "amazon web services" in result

    def test_normalize_expands_cicd_alias(self):
        result = _normalize("cicd")
        assert "continuous integration" in result

    def test_normalize_strips_whitespace(self):
        assert _normalize("  Python  ") == "python"

    def test_normalize_handles_empty_string(self):
        assert _normalize("") == ""

    def test_normalize_handles_multiple_aliases(self):
        result = _normalize("js and ts")
        assert "javascript" in result
        assert "typescript" in result


# ── Test _trigram_jaccard function ────────────────────────────────────────────

class TestTrigramJaccard:
    def test_identical_strings_return_one(self):
        assert _trigram_jaccard("python", "python") == 1.0

    def test_completely_different_strings_return_low_score(self):
        score = _trigram_jaccard("python", "marketing")
        assert score < 0.3

    def test_similar_strings_return_high_score(self):
        score = _trigram_jaccard("python", "pythonic")
        assert score > 0.5

    def test_empty_strings_return_zero(self):
        assert _trigram_jaccard("", "") == 0.0
        assert _trigram_jaccard("python", "") == 0.0
        assert _trigram_jaccard("", "python") == 0.0

    def test_short_strings_handled(self):
        score = _trigram_jaccard("ab", "abc")
        assert 0.0 <= score <= 1.0

    def test_custom_ngram_size(self):
        score = _trigram_jaccard("python", "pythonic", n=2)
        assert 0.0 <= score <= 1.0


# ── Test SkillMatcher class ───────────────────────────────────────────────────

class TestSkillMatcher:
    @pytest.fixture
    def matcher(self):
        m = SkillMatcher()
        corpus = [
            "Python",
            "JavaScript",
            "Machine Learning",
            "Deep Learning",
            "React",
            "Angular",
            "Docker",
            "Kubernetes",
        ]
        m.fit(corpus)
        return m

    def test_fit_creates_vectorizer(self, matcher):
        assert matcher._vectorizer is not None

    def test_fit_stores_corpus(self, matcher):
        assert len(matcher._corpus) > 0

    def test_similarity_exact_match_returns_one(self, matcher):
        score = matcher.similarity("Python", "Python")
        assert score == 1.0

    def test_similarity_case_insensitive(self, matcher):
        score = matcher.similarity("python", "PYTHON")
        assert score == 1.0

    def test_similarity_substring_match_high_score(self, matcher):
        score = matcher.similarity("Python", "Python Programming")
        assert score >= 0.88

    def test_similarity_alias_expansion(self, matcher):
        score = matcher.similarity("js", "javascript")
        assert score >= 0.88

    def test_similarity_related_skills_moderate_score(self, matcher):
        score = matcher.similarity("Machine Learning", "Deep Learning")
        assert 0.5 < score < 1.0

    def test_similarity_unrelated_skills_low_score(self, matcher):
        score = matcher.similarity("Python", "Marketing")
        assert score < 0.5

    def test_similarity_without_fit_uses_fallback(self):
        m = SkillMatcher()
        score = m.similarity("Python", "Pythonic")
        assert 0.0 <= score <= 1.0

    def test_best_match_finds_exact_match(self, matcher):
        candidates = [
            {"intitule": "Python", "id": 1},
            {"intitule": "JavaScript", "id": 2},
        ]
        best, score = matcher.best_match("Python", candidates)
        assert best is not None
        assert best["intitule"] == "Python"
        assert score == 1.0

    def test_best_match_finds_close_match(self, matcher):
        candidates = [
            {"intitule": "Python Programming", "id": 1},
            {"intitule": "Marketing", "id": 2},
        ]
        best, score = matcher.best_match("Python", candidates)
        assert best is not None
        assert best["intitule"] == "Python Programming"
        assert score >= THRESHOLD

    def test_best_match_returns_none_below_threshold(self, matcher):
        candidates = [
            {"intitule": "Marketing", "id": 1},
            {"intitule": "Sales", "id": 2},
        ]
        best, score = matcher.best_match("Python", candidates)
        assert best is None
        assert score == 0.0

    def test_best_match_empty_candidates(self, matcher):
        best, score = matcher.best_match("Python", [])
        assert best is None
        assert score == 0.0

    def test_best_match_custom_key(self, matcher):
        candidates = [
            {"name": "Python", "id": 1},
            {"name": "JavaScript", "id": 2},
        ]
        best, score = matcher.best_match("Python", candidates, key="name")
        assert best is not None
        assert best["name"] == "Python"

    def test_best_match_selects_highest_score(self, matcher):
        candidates = [
            {"intitule": "Python Basics", "id": 1},
            {"intitule": "Python", "id": 2},
            {"intitule": "Python Advanced", "id": 3},
        ]
        best, score = matcher.best_match("Python", candidates)
        assert best["intitule"] == "Python"
        assert score == 1.0

    def test_fit_deduplicates_corpus(self):
        m = SkillMatcher()
        m.fit(["Python", "python", "PYTHON", "JavaScript"])
        assert len(m._corpus) == 2

    def test_fit_filters_empty_strings(self):
        m = SkillMatcher()
        m.fit(["Python", "", "  ", "JavaScript"])
        assert len(m._corpus) == 2

    def test_similarity_handles_special_characters(self, matcher):
        score = matcher.similarity("C++", "C#")
        assert 0.0 <= score <= 1.0

    def test_similarity_handles_numbers(self, matcher):
        score = matcher.similarity("Python 3", "Python 2")
        assert score > 0.5


# ── Test THRESHOLD constant ───────────────────────────────────────────────────

class TestThreshold:
    def test_threshold_is_reasonable(self):
        assert 0.0 < THRESHOLD < 1.0
        assert THRESHOLD == 0.62


# ── Integration tests ─────────────────────────────────────────────────────────

class TestSkillMatcherIntegration:
    def test_real_world_skill_matching(self):
        m = SkillMatcher()
        corpus = [
            "Python",
            "Java",
            "JavaScript",
            "TypeScript",
            "React",
            "Angular",
            "Vue.js",
            "Node.js",
            "Docker",
            "Kubernetes",
            "AWS",
            "Azure",
            "Machine Learning",
            "Deep Learning",
            "Natural Language Processing",
        ]
        m.fit(corpus)

        # Test various real-world scenarios
        assert m.similarity("Python", "Python") == 1.0
        assert m.similarity("js", "JavaScript") >= 0.88
        assert m.similarity("k8s", "Kubernetes") >= 0.88
        assert m.similarity("ML", "Machine Learning") >= 0.88

    def test_french_skills(self):
        m = SkillMatcher()
        corpus = [
            "Programmation Python",
            "Développement Web",
            "Base de données",
            "Intelligence Artificielle",
        ]
        m.fit(corpus)

        score = m.similarity("Python", "Programmation Python")
        assert score >= THRESHOLD

    def test_multilingual_matching(self):
        m = SkillMatcher()
        corpus = [
            "Python Programming",
            "Programmation Python",
            "JavaScript Development",
            "Développement JavaScript",
        ]
        m.fit(corpus)

        score = m.similarity("Python", "Programmation Python")
        assert score >= THRESHOLD
