"""
similarity.py — Local TF-IDF character n-gram skill matcher.

No external API calls.  Works offline.
Algorithm:
  1. Exact match          → 1.00
  2. Substring / alias    → 0.88
  3. TF-IDF cosine (char 2-4 grams) fitted on the full skill corpus
  4. Trigram fallback     → plain character bigram Jaccard
"""
from __future__ import annotations

import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# ── Normalisation aliases ──────────────────────────────────────────────────────
_ALIASES: dict[str, str] = {
    r"\bjs\b":          "javascript",
    r"\bts\b":          "typescript",
    r"\bpy\b":          "python",
    r"\bml\b":          "machine learning",
    r"\bai\b":          "artificial intelligence",
    r"\bdb\b":          "database",
    r"\bci\b":          "continuous integration",
    r"\bcd\b":          "continuous deployment",
    r"\bcicd\b":        "continuous integration continuous deployment",
    r"\bci/cd\b":       "continuous integration continuous deployment",
    r"\bdevops\b":      "devops",
    r"\bdev ops\b":     "devops",
    r"\bk8s\b":         "kubernetes",
    r"\bkube\b":        "kubernetes",
    r"\baws\b":         "amazon web services",
    r"\bgcp\b":         "google cloud platform",
    r"\bazure\b":       "microsoft azure",
    r"\bsql\b":         "sql database",
    r"\bnosql\b":       "nosql database",
    r"\boop\b":         "object oriented programming",
    r"\bpoo\b":         "programmation orientée objet",
    r"\bapi\b":         "application programming interface",
    r"\brest\b":        "rest api",
    r"\bgit\b":         "git version control",
    r"\bdocker\b":      "docker container",
    r"\bspring\b":      "spring framework",
    r"\bnestjs\b":      "nestjs framework",
    r"\breact\b":       "react javascript",
    r"\bvue\b":         "vue javascript",
    r"\bangular\b":     "angular javascript",
    r"\bnode\b":        "nodejs javascript",
    r"\bnlp\b":         "natural language processing",
    r"\bcv\b":          "computer vision",
    r"\bdl\b":          "deep learning",
    r"\bnn\b":          "neural network",
    r"\brnn\b":         "recurrent neural network",
    r"\bcnn\b":         "convolutional neural network",
    r"\blstm\b":        "long short term memory",
    r"\btf\b":          "tensorflow",
    r"\bpytorch\b":     "pytorch deep learning",
    r"\bscrum\b":       "scrum agile",
    r"\bkanban\b":      "kanban agile",
    r"\bpm\b":          "project management",
}

# Minimum cosine similarity to count as a match
THRESHOLD: float = 0.62


def _normalize(text: str) -> str:
    """Lowercase, remove punctuation, expand aliases."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s/]", " ", s)
    for pattern, replacement in _ALIASES.items():
        s = re.sub(pattern, replacement, s)
    return s.strip()


def _trigram_jaccard(a: str, b: str, n: int = 3) -> float:
    """Character n-gram Jaccard similarity (fallback)."""
    def ngrams(s: str) -> set[str]:
        return {s[i : i + n] for i in range(len(s) - n + 1)}

    a_g, b_g = ngrams(a), ngrams(b)
    if not a_g or not b_g:
        return 0.0
    return len(a_g & b_g) / len(a_g | b_g)


class SkillMatcher:
    """
    Fits a TF-IDF vectorizer over a corpus of skill names.
    Provides pairwise cosine similarity between any two skill strings.
    """

    def __init__(self) -> None:
        self._vectorizer: TfidfVectorizer | None = None
        self._corpus: list[str] = []

    # ── Public API ─────────────────────────────────────────────────────────────

    def fit(self, corpus: list[str]) -> None:
        """
        Fit the vectorizer on a deduplicated corpus.
        Call once at startup with all known skill names.
        """
        normed = list({_normalize(t) for t in corpus if t.strip()})
        self._corpus = normed
        self._vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            min_df=1,
            sublinear_tf=True,
        )
        self._vectorizer.fit(normed)

    def similarity(self, a: str, b: str) -> float:
        """
        Return similarity score in [0, 1] between skill names a and b.
        """
        a_n = _normalize(a)
        b_n = _normalize(b)

        # ── 1. Exact match ──────────────────────────────────────────────────
        if a_n == b_n:
            return 1.0

        # ── 2. Substring or alias match ─────────────────────────────────────
        if a_n in b_n or b_n in a_n:
            return 0.88

        # ── 3. TF-IDF cosine ────────────────────────────────────────────────
        if self._vectorizer is not None:
            try:
                vecs = self._vectorizer.transform([a_n, b_n])
                score = float(cosine_similarity(vecs[0:1], vecs[1:2])[0, 0])
                return score
            except Exception:
                pass  # fall through to trigram

        # ── 4. Trigram Jaccard fallback ─────────────────────────────────────
        return _trigram_jaccard(a_n, b_n)

    def best_match(
        self,
        query: str,
        candidates: list[dict],
        key: str = "intitule",
    ) -> tuple[dict | None, float]:
        """
        Find the best matching candidate from a list of skill dicts.

        Returns (best_candidate, similarity_score).
        Returns (None, 0.0) if no candidate exceeds THRESHOLD.
        """
        best_item: dict | None = None
        best_score: float = 0.0

        for cand in candidates:
            s = self.similarity(query, cand.get(key, ""))
            if s > best_score:
                best_score = s
                best_item = cand

        if best_score < THRESHOLD:
            return None, 0.0
        return best_item, best_score
