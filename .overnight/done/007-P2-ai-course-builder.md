---
id: 7
title: "AI course builder — 'create a 5-module course on X' natural language course creation"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/courseRoutes.js
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: parallel
context_group: ai_builders
group_reason: "AI course builder and AI funnel builder share the Claude API prompt pattern"
---

# AI course builder — natural language course creation

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md (Phase 2 — Course Platform)
**Location:** `marketplace/backend/routes/courseRoutes.js`, new `marketplace/backend/services/aiCourseBuilderService.js`

## Problem

The course platform backend is fully implemented (`courseRoutes.js` with full CRUD + enrollment + progress API, mounted at `/api/courses`). However, creating a course currently requires manually inputting module titles, lesson content, and descriptions.

The AI Store Builder demonstrates how to use the Claude API to generate structured content from natural language. The same pattern can be applied to courses: "create a 5-module course on email marketing for small businesses" → full course outline with module titles, lesson descriptions, and quiz questions.

## How to Fix

1. **Create `aiCourseBuilderService.js`** in `marketplace/backend/services/`:
   - Input: natural language brief ("create a 5-module course on X")
   - Uses `ANTHROPIC_API_KEY` to call Claude API
   - System prompt: you are an expert course creator; output valid JSON matching the course schema
   - Output schema:
     ```json
     {
       "title": "...",
       "description": "...",
       "price_cents": 4999,
       "modules": [
         {
           "title": "...",
           "order": 1,
           "lessons": [
             {"title": "...", "content": "...", "duration_minutes": 15, "order": 1}
           ]
         }
       ]
     }
     ```

2. **Add `POST /api/courses/generate` route** to courseRoutes.js:
   - Accepts `{ brief: "create a 5-module course on..." }`
   - Calls `aiCourseBuilderService.generateCourse(brief)`
   - Returns generated course JSON for preview
   - Requires admin auth

3. **Add `POST /api/courses/generate-and-save`** that:
   - Generates the course
   - Immediately saves it to the `courses` table + `modules` + `lessons` tables
   - Returns the new course ID

4. **Add Course Builder UI to admin panel:**
   - "AI Course Builder" button in admin.html Courses section
   - Text area for the brief
   - "Generate Preview" → shows the generated outline
   - "Save Course" → saves and redirects to the course edit page

5. **Fallback gracefully** when `ANTHROPIC_API_KEY` is not set:
   - Return `{ success: false, error: "AI features require ANTHROPIC_API_KEY" }`
   - Don't crash; show a clear message in the UI

## Acceptance Criteria

- [ ] `POST /api/courses/generate` accepts a brief and returns structured course JSON
- [ ] Generated course can be saved to DB in one click
- [ ] Admin UI has AI Course Builder with textarea + Generate + Save buttons
- [ ] Works for briefs like "3-lesson intro to sourdough baking", "5-module social media course"
- [ ] Graceful 400 error when brief is empty or too short
- [ ] Requires admin auth (not public)

## Notes

_Generated from AGENT_TASKS.md Phase 2 Course Platform. Uses the same Claude API structured output pattern proven by aiStoreBuilderService.js. Course backend is fully wired to Supabase (f4b0050). This makes course creation accessible to non-technical operators._
