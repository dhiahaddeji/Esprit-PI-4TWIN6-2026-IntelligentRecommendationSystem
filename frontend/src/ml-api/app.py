from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re

app = FastAPI(title="AssurReco ML API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ─────────────────────────────────────────────────────────────

class EmployeeSkills(BaseModel):
    employee_id: str
    name: str
    department: Optional[str] = ""
    savoir: List[str] = []
    savoir_faire: List[str] = []
    savoir_etre: List[str] = []

class ChatRequest(BaseModel):
    message: str
    employees: List[EmployeeSkills] = []

class ChatResponse(BaseModel):
    reply: str
    employees: List[dict] = []

class ExtractRequest(BaseModel):
    cv_text: str

class ExtractResponse(BaseModel):
    savoir: List[str]
    savoir_faire: List[str]
    savoir_etre: List[str]

# Ancien modèle de recommendation (compatibilité)
class EmployeeFeatures(BaseModel):
    employee_id: str
    name: str
    department: str
    skills: List[str] = []
    level_avg: float = 0.0
    history_participation: int = 0

class RecommendRequest(BaseModel):
    activity_id: str
    activity_title: str
    required_skills: List[str] = []
    employees: List[EmployeeFeatures]

class RecommendItem(BaseModel):
    employee_id: str
    name: str
    department: str
    score: float

class RecommendResponse(BaseModel):
    activity_id: str
    recommendations: List[RecommendItem]

# ── NLP Helpers ─────────────────────────────────────────────────────────

STOP_WORDS = {
    "top", "pour", "les", "des", "de", "du", "le", "la", "une", "un",
    "en", "et", "ou", "est", "qui", "que", "je", "tu", "il", "nous",
    "vous", "ils", "moi", "toi", "mon", "ma", "mes", "ses", "son", "sa",
    "sur", "avec", "dans", "par", "formation", "activite", "activité",
    "recommande", "recommandez", "meilleur", "meilleurs", "employé",
    "employee", "employees", "competences", "compétences", "selon",
    "base", "basé", "liste", "meilleures", "choisir", "selectionner",
    "trouver", "quels", "quelles", "avoir", "faire", "etre", "été",
    "avoir", "donne", "donner", "moi", "qui", "peut",
}

def extract_keywords(msg: str) -> List[str]:
    clean = re.sub(r"[^a-zA-ZÀ-ÿ\s]", " ", msg.lower())
    words = clean.split()
    return [w for w in words if len(w) > 2 and w not in STOP_WORDS]

def extract_top_n(msg: str) -> int:
    m = re.search(r"top\s*(\d+)", msg.lower())
    return int(m.group(1)) if m else 5

def score_employee(keywords: List[str], emp: EmployeeSkills) -> float:
    all_skills = [s.lower() for s in emp.savoir + emp.savoir_faire + emp.savoir_etre]
    if not keywords:
        return float(len(all_skills) * 10)
    score = 0.0
    for kw in keywords:
        for sk in all_skills:
            if kw in sk or sk in kw:
                score += 20
            elif any(part in sk for part in kw.split() if len(part) > 3):
                score += 10
    return score

# ── SAVOIR keywords (knowledge domains) ────────────────────────────────
SAVOIR_KEYWORDS = [
    "python", "java", "javascript", "typescript", "sql", "nosql", "mongodb",
    "react", "angular", "vue", "node", "nestjs", "django", "spring",
    "machine learning", "deep learning", "nlp", "data science", "statistiques",
    "comptabilité", "finance", "droit", "gestion", "marketing", "rh",
    "assurance", "actuariat", "mathématiques", "économie", "audit",
    "cybersécurité", "réseau", "linux", "cloud", "aws", "azure", "docker",
    "kubernetes", "devops", "agile", "scrum", "git", "excel", "power bi",
    "tableau", "arabic", "français", "anglais", "espagnol", "communication",
]

SAVOIR_FAIRE_KEYWORDS = [
    "développement", "programmation", "codage", "test", "debug", "débogage",
    "analyse", "conception", "modélisation", "intégration", "déploiement",
    "gestion de projet", "reporting", "présentation", "négociation",
    "recrutement", "formation", "coaching", "audit", "contrôle qualité",
    "rédaction", "traduction", "veille", "recherche", "conseil",
    "vente", "service client", "support", "maintenance", "configuration",
]

SAVOIR_ETRE_KEYWORDS = [
    "communication", "leadership", "travail d'équipe", "team work",
    "adaptabilité", "flexibilité", "créativité", "innovation",
    "organisation", "rigueur", "autonomie", "proactivité",
    "empathie", "écoute", "patience", "persévérance",
    "esprit critique", "prise de décision", "gestion du stress",
    "ponctualité", "fiabilité", "intégrité", "curiosité",
]


def classify_skill(skill: str) -> str:
    s = skill.lower()
    if any(k in s for k in SAVOIR_ETRE_KEYWORDS):
        return "savoir_etre"
    if any(k in s for k in SAVOIR_FAIRE_KEYWORDS):
        return "savoir_faire"
    return "savoir"


def extract_skills_from_text(text: str) -> dict:
    """Simple rule-based skill extraction from CV text."""
    text_lower = text.lower()
    savoir, savoir_faire, savoir_etre = [], [], []

    all_keywords = SAVOIR_KEYWORDS + SAVOIR_FAIRE_KEYWORDS + SAVOIR_ETRE_KEYWORDS
    found = set()

    for kw in all_keywords:
        if kw in text_lower and kw not in found:
            found.add(kw)
            cat = classify_skill(kw)
            if cat == "savoir_etre":
                savoir_etre.append(kw.title())
            elif cat == "savoir_faire":
                savoir_faire.append(kw.title())
            else:
                savoir.append(kw.title())

    # Also find capitalized single-word skills (like PYTHON, Java, etc.)
    tokens = re.findall(r'\b[A-Z][a-zA-Z]{2,}\b', text)
    for token in tokens:
        t = token.lower()
        if t in SAVOIR_KEYWORDS and t not in found:
            found.add(t)
            savoir.append(token)

    return {"savoir": savoir[:15], "savoir_faire": savoir_faire[:10], "savoir_etre": savoir_etre[:10]}


# ── Endpoints ──────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    msg = req.message
    keywords = extract_keywords(msg)
    top_n = extract_top_n(msg)

    if not req.employees:
        return ChatResponse(
            reply="Aucun employé avec des compétences n'a été fourni. Veuillez d'abord enregistrer les compétences.",
            employees=[],
        )

    scored = []
    for emp in req.employees:
        s = score_employee(keywords, emp)
        scored.append({"emp": emp, "score": s})

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:top_n]

    kw_display = ", ".join(keywords) if keywords else "compétences générales"
    reply = f"Voici le **Top {min(top_n, len(top))}** recommandé pour **{kw_display}** :\n\n"

    result_employees = []
    for i, item in enumerate(top):
        emp = item["emp"]
        all_skills = emp.savoir + emp.savoir_faire + emp.savoir_etre
        reply += f"**{i+1}. {emp.name}**"
        if all_skills:
            display = all_skills[:4]
            reply += f" — {', '.join(display)}"
            if len(all_skills) > 4:
                reply += f" (+{len(all_skills)-4} autres)"
        else:
            reply += " — (aucune compétence enregistrée)"
        reply += "\n"
        result_employees.append({
            "employee_id": emp.employee_id,
            "name": emp.name,
            "score": round(item["score"], 1),
            "savoir": emp.savoir,
            "savoir_faire": emp.savoir_faire,
            "savoir_etre": emp.savoir_etre,
        })

    reply += "\n*Recommandations basées sur la correspondance des compétences.*"
    return ChatResponse(reply=reply, employees=result_employees)


@app.post("/extract-skills", response_model=ExtractResponse)
def extract_skills(req: ExtractRequest):
    result = extract_skills_from_text(req.cv_text)
    return ExtractResponse(**result)


@app.post("/recommendations", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    """Legacy endpoint for activity-based recommendations."""
    recos = []
    for emp in req.employees:
        all_skills = [s.lower() for s in emp.skills]
        required = [s.lower() for s in req.required_skills]
        overlap = len(set(required).intersection(set(all_skills)))
        score = min(100.0, overlap * 20 + emp.level_avg * 10 + min(emp.history_participation, 10) * 2)
        recos.append(RecommendItem(
            employee_id=emp.employee_id,
            name=emp.name,
            department=emp.department,
            score=round(score, 2),
        ))
    recos.sort(key=lambda r: r.score, reverse=True)
    return RecommendResponse(activity_id=req.activity_id, recommendations=recos)


@app.get("/health")
def health():
    return {"ok": True, "version": "2.0.0"}
