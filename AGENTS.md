<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
MENACE Project Instructions
Project Vision

MENACE is not a task manager.

MENACE is a customizable life operating system inspired by RPG progression systems.

Every user action contributes to character progression.

The application should feel like a futuristic command center rather than a productivity app.

Architecture

The application is data-driven.

Avoid hardcoded UI.

Business logic belongs in engines.

Pages should be thin.

Reusable components are preferred over duplicated code.

Core Systems
Progression Engine
Quest Engine
Dashboard Widget Engine
Achievement Engine
Analytics Engine
Trading Engine
Health Engine
Career Engine
Dashboard

Dashboard is composed of configurable widgets.

Widgets should never be hardcoded directly into the page.

Dashboard layout must support future drag-and-drop editing.

Widget order, visibility, and configuration should remain independent from widget implementation.

Quests

Quest definitions are editable.

Quest completions are immutable history.

Changing quest XP must never modify previously awarded XP.

Styling

Design language:

Dark futuristic UI
Purple / Cyan accent colors
Glassmorphism
Clean spacing
Minimalistic
Responsive
Smooth animations

Avoid clutter.

Code Rules
Never duplicate code.
Prefer composition over inheritance.
Keep files reasonably small.
Use TypeScript.
Explain architectural changes before implementing them.
Preserve existing functionality unless explicitly requested.
Future

Current storage:

localStorage

Future storage:

Supabase

Design new features so localStorage can later be replaced by a repository or service layer without changing UI components.

AI Behaviour

Before implementing large features:

Propose architecture.
Explain trade-offs.
Then implement.

When modifying existing code:

Preserve current behavior.
Avoid unnecessary refactors.
Keep components reusable.