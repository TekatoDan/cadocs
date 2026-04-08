# CADOcs Next.js Modernization Design

## Overview
Restructure CADOcs from a Vite-converted SPA into a properly architected Next.js 15 app with server actions, TanStack Query, Supabase SSR auth, and decomposed components.

## Architecture

### Supabase Auth (`@supabase/ssr`)
- `src/lib/supabase/client.ts` — browser client via `createBrowserClient`
- `src/lib/supabase/server.ts` — server client via `createServerClient` with cookies
- `src/middleware.ts` — session refresh + route protection
- `app/auth/callback/route.ts` — OAuth code exchange as route handler

### Server Actions (`src/app/actions/`)
- `storage.ts` — all file/folder CRUD (create, delete, archive, restore, move, rename, upload metadata, signed URLs)
- `teams.ts` — team management (get default team, roles, members, update/remove members)
- `search.ts` — document search with filters
- `chat.ts` — messaging

### TanStack Query Hooks (`src/hooks/`)
- `use-files.ts` — useFiles, useRecentFiles, useStarredFiles + mutations
- `use-folders.ts` — useFolders, useStarredFolders + mutations
- `use-teams.ts` — useDefaultTeam, useTeamRole, useTeamMembers + mutations
- `use-search.ts` — useSearchDocuments (debounced)

### Component Structure
```
src/components/
  dashboard/
    Dashboard.tsx, Sidebar.tsx, Header.tsx, BreadcrumbNav.tsx,
    FileTable.tsx, FileRow.tsx, FolderRow.tsx, UploadPanel.tsx,
    FilePreviewModal.tsx, SearchResults.tsx, NewFolderModal.tsx,
    DeleteConfirmModal.tsx
  auth/    LoginForm.tsx, ProtectedRoute.tsx
  admin/   AdminPanel.tsx
  collaboration/ CollaborationPanel.tsx
  ui/      SidebarFolderTree.tsx
```

### Routes
- `/` — protected dashboard
- `/login` — auth page
- `/auth/callback` — route handler for OAuth

### Types
Centralized in `src/lib/types.ts`.
