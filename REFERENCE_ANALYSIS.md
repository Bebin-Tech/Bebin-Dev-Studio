# Reference analysis

Reference: https://karthiable.vercel.app/ — explored on 9 October 2026.

The product presents itself as an AI web-app generator. Its central journey is prompt entry → category selection → optional enhancement → generation → iframe preview → standalone HTML download. The sidebar shows Dashboard, Generate, My Projects, Templates, Chat History, Favorites, and Settings. The header includes search, theme toggle, notifications, and New Project. A Pro card advertises unlimited generation, priority access, export and deployment. Recent generation cards and two preview areas appear beneath the editor.

Observed behavior:

- Prompt enhancement appended “Make it premium, responsive, and animated.”
- A prompt requesting a global architecture studio produced an ArcStudio landing page with navigation, hero, about section, gallery images, and a contact form.
- Generation displayed a loading state and inserted a recent-generation entry.
- My Projects, Templates, and Settings received clicks but showed no visible content change. This observation does not prove they never work under other conditions.
- Backend implementation, data retention, authentication, payments, and deployment behavior cannot be established from the publicly visible interface. These were not treated as verified capabilities.

Atlas Studio keeps the core prompt/preview/export workflow, while adding actual private accounts, SQLite persistence, project organization, search, favorite toggling, code editing, version restoration, duplication, a template library, responsive preview controls, language preferences and Arabic direction support. Its visual design uses forest green, ivory surfaces, restrained typography, quiet borders and an adaptive navigation layout.

The application clearly distinguishes deterministic local template generation from optional live AI. It does not claim that generated contact or payment demonstrations are integrated services. Deployment remains an owner-controlled future action.
