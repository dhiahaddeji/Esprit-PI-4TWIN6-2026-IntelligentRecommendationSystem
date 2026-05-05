# AI Usage Disclosure

> Project: **Intelligent HR Recommendation System** — Esprit PI 4TWIN6 — 2025/2026
>
> This document transparently describes how Artificial Intelligence (AI) tools were used during the development of this project, in accordance with the academic guidelines of the *Projet d'Intégration*. The aim is not to hide AI usage, but to demonstrate **responsible, critical, and reflective** integration of AI assistants in a modern engineering workflow.

---

## 1. AI Tools Used

| Tool | Provider | LLM / Engine | Plan | Primary Usage Area |
|---|---|---|---|---|
| **ChatGPT** (web + desktop app) | OpenAI | GPT-4, GPT-4o, GPT-5 | Free / Plus | Architecture brainstorming, debugging, documentation |
| **Claude** (web + Claude Code) | Anthropic | Claude 3.5 Sonnet, Claude Sonnet 4, Claude Opus 4 | Free / Pro | Long-context code review, refactoring, ML service design |
| **GitHub Copilot** (VS Code extension) | GitHub / Microsoft / OpenAI | Codex / GPT-4o-based | Student Pack | Inline code completion, boilerplate generation |
| **Cursor IDE** (occasionally) | Cursor | Claude Sonnet, GPT-4o | Free | Multi-file refactors, agentic edits |
| **Google Gemini** (occasional) | Google | Gemini 1.5 / 2.0 Pro | Free | Cross-checking ML formulas, secondary opinion |
| **DeepSeek Chat** (occasional) | DeepSeek | DeepSeek V3 | Free | Quick Python prototype snippets |

> **Agents used:** Claude Code (Anthropic), Cursor Agent, GitHub Copilot Chat / Workspace, ChatGPT Code Interpreter (sandboxed Python).

---

## 2. Tasks Where AI Was Leveraged

AI assistants were used as **collaborators, not authors**. Every AI-generated suggestion was read, understood, tested, and adapted before being committed. The team retains full responsibility for the code, architecture decisions, and final deliverables.

### 2.1 Code Generation
- Scaffolding NestJS modules (controllers, services, DTOs, schemas) following the same pattern as the rest of the codebase.
- Generating Mongoose schemas from feature specifications.
- Writing repetitive React components (forms, tables, modals) and CSS modules.
- Boilerplate for FastAPI endpoints in the Python ML microservice.
- Writing `class-validator` rules for DTOs.

### 2.2 Debugging & Troubleshooting
- Diagnosing JWT/refresh-token issues during authentication flow.
- Tracking down a CORS misconfiguration between the React frontend and NestJS backend.
- Resolving Mongoose `populate` chains returning `null`.
- Fixing scikit-learn `TfidfVectorizer` shape mismatches in the recommender.
- Reading stack traces from Jenkins build logs and proposing fixes.

### 2.3 Documentation
- Drafting and proofreading the main `README.md` (technical sections only — Acknowledgment section was written by the team).
- Generating JSDoc / TSDoc comments for complex services.
- Producing this `AI_USAGE.md` file from team notes.
- Drafting `.env.example`, install instructions, and architecture diagrams (ASCII).

### 2.4 Testing
- Generating Jest unit-test skeletons for NestJS services.
- Suggesting edge cases for input validation tests (empty strings, oversized payloads, invalid ObjectIds).
- Writing sample JSON payloads for manual Postman testing.

### 2.5 Architecture & Design Discussion
- Discussing trade-offs between a heuristic scorer vs. a Gradient Boosting model for the recommendation engine.
- Designing the graceful-degradation fallback when the Python ML service is unreachable.
- Reviewing the exponential smoothing formula `Δ = α × max(0, target − current)` for skill score updates.
- Reviewing role-based access control (RBAC) guard structure.

### 2.6 Refactoring
- Extracting repeated logic into shared utilities.
- Renaming variables and functions for consistency.
- Moving from inline error handling to a centralized exception filter.
- Splitting an oversized `auth.service.ts` into smaller focused services.

### 2.7 What AI Was **NOT** Used For
- The **business logic and core innovation** (skill-matching algorithm, exponential smoothing skill update, ranking weights) was designed by the team. AI was only used to validate or critique the math.
- The **academic report** and oral defense slides were written by the team; AI was used for proofreading only.
- **No proprietary or sensitive data** (real employee records, real CVs, real credentials) was ever shared with any AI provider. All examples and prompts used synthetic/mock data.

---

## 3. Representative Prompts

Below is a non-exhaustive sample of prompts actually used during development. They are reproduced here for transparency. Note that prompts were typically iterated several times — the first answer was rarely the one we kept.

### 3.1 Backend (NestJS)

> "Here is my `auth.service.ts`. I have JWT access + refresh tokens. The refresh-token endpoint sometimes returns `401` even when the token is valid. Help me debug this. Don't rewrite the whole file — point me to the bug."

> "Generate a NestJS DTO for creating an `Activity` with: title (string, required), type (enum: formation | certification | audit | projet | mission), requiredSkills (array of `{ skillId: ObjectId, minLevel: number 0-4 }`), startDate (Date, required), endDate (Date, must be after startDate). Use class-validator."

> "I have a Mongoose schema `Employee` referencing `Department`. When I call `.populate('department')` it returns null even though the ObjectId is valid. What are the most common causes?"

### 3.2 Frontend (React)

> "Build a React component `ActivityRecommendationList` that shows a ranked list of employees. Each row: avatar, name, score (0–1), match badge, accept/reject buttons. Use only the conventions already in `frontend/src/components`. No Tailwind, plain CSS modules."

> "I have an Axios interceptor for refreshing JWT tokens but on 401 it loops infinitely. Walk me through how to detect and break the loop."

### 3.3 Python ML Service

> "I'm using `TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4))` on skill names like 'React.js', 'react', 'reactjs'. They should match each other but cosine similarity is returning low scores. What's wrong with my setup?"

> "Critique this ranking formula: `score = 0.5 * coverage + 0.3 * level_ratio + 0.2 * breadth`. We want the model to prefer employees who already have most of the required skills, but not penalize generalists too harshly. What would you change?"

### 3.4 DevOps

> "Here is my `Jenkinsfile` for the backend. The `npm test` stage passes locally but fails in Jenkins with `Cannot find module '@nestjs/testing'`. The dev dependencies are installed. What could cause this in a Jenkins agent?"

### 3.5 Documentation

> "Read this `README.md` and tell me which sections are unclear or contain inconsistencies between the architecture diagram and the install instructions. Don't rewrite — list the issues."

### 3.6 Testing

> "Given this NestJS service `CompetencesService`, generate a Jest test skeleton with `beforeEach` setting up a mock Mongoose model. Cover: `findById` returning null, `create` validation failure, and the happy path."

---

## 4. LLMs & Agents Specification

### LLMs (Large Language Models)
- **GPT-4 / GPT-4o / GPT-5** — OpenAI, accessed via ChatGPT web UI and ChatGPT desktop application.
- **Claude 3.5 Sonnet / Claude Sonnet 4 / Claude Opus 4** — Anthropic, accessed via claude.ai and via the Claude Code CLI.
- **Gemini 1.5 / 2.0 Pro** — Google, accessed via gemini.google.com.
- **DeepSeek V3** — DeepSeek, accessed via chat.deepseek.com.
- **GitHub Copilot underlying models** (Codex / GPT-4o-class) — accessed through the VS Code extension.

### Agents (Autonomous / Tool-Using AI)
- **Claude Code** (Anthropic) — terminal-based coding agent. Used for multi-file refactors and reading the codebase to answer architectural questions.
- **Cursor Agent** — IDE agent inside the Cursor editor. Used occasionally for batch edits across several files.
- **GitHub Copilot Chat / Copilot Workspace** — used inline in VS Code for completion and for `@workspace` Q&A.
- **ChatGPT Code Interpreter** — sandboxed Python environment used to verify ML formulas and quickly plot toy datasets.

---

## 5. Responsibility, Verification & Critical Review

The team applied the following discipline whenever AI assistance was used:

1. **Read every line.** No AI-generated code was committed without being read and understood.
2. **Run and test.** All AI-suggested code was executed locally; failing or incorrect suggestions were rejected or rewritten.
3. **Verify correctness.** Mathematical formulas (skill-update equation, ranking weights, similarity scores) were manually re-derived on paper before acceptance.
4. **Cross-check sources.** Library APIs and version-specific behavior (NestJS, Mongoose, scikit-learn) were verified against official documentation, not just trusted from the model's answer.
5. **Reject hallucinations.** Several times the models invented non-existent npm packages, wrong NestJS decorators, or outdated scikit-learn signatures. These were caught during testing and discarded.
6. **No secrets shared.** No `.env` content, no real credentials, no real employee data, and no production database URIs were ever pasted into AI tools.
7. **Attribution.** Significant AI-assisted sections are noted in commit messages where relevant.

---

## 6. Reflection

Using AI assistants accelerated repetitive scaffolding (DTOs, CRUD endpoints, simple React forms) and shortened debugging cycles, but it did **not** replace the engineering work:

- **Architecture decisions** (microservice vs. monolith, fallback strategy, RBAC layout) were made by the team after weighing AI suggestions against the project constraints.
- **The ML core** (feature engineering, ranking weights, the exponential smoothing update rule) was designed and validated by the team; AI was a sparring partner, not an author.
- **Debugging** still required reading stack traces and the actual code — AI gave hypotheses, the team confirmed the cause.

The clearest lesson from this project is that AI tools are most valuable when the developer already knows roughly what they want and can evaluate the answer. Used uncritically, they produce plausible-looking but wrong code; used as a sounding board, they meaningfully increase productivity without compromising rigor.

---

*Prepared by Pi5.2 — 4TWIN6, Esprit School of Engineering, 2025/2026.*
