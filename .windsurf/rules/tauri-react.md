---
trigger: always_on
---

# .cursor/rules

# Project Type
project: "Tauri Desktop App with React.js frontend"

# Preferred Stack
stack:
  frontend: "React.js + Vite + TailwindCSS"
  backend: "Rust (Tauri)"
  language: "Typescript"

# Coding Style
style:
  typescript: true
  react:
    - functional_components
    - hooks
    - prefer_use_state_use_effect
    - no_class_components
  formatting:
    - semicolons: true
    - quotes: double
    - trailing_commas: always
    - indent: 2

# React Guidelines
react_rules:
  - use TypeScript everywhere
  - prefer `useEffect` over lifecycle methods
  - use `useContext` or Redux toolkit for global state
  - component files must be PascalCase
  - hooks/util files in camelCase

# Tauri Guidelines
tauri_rules:
  - expose minimal commands from Rust to frontend
  - keep API calls on frontend via `fetch` when possible
  - use `@tauri-apps/api` for file system, notifications, clipboard, etc.
  - deep linking & global shortcuts must be handled in Rust side

# File/Folder Structure
structure:
  - src/
    - components/
    - pages/
    - hooks/
    - utils/
    - assets/
    - App.tsx
    - main.tsx
  - src-tauri/
    - src/
    - Cargo.toml

# Testing & TDD
testing:
  - follow TDD for all tasks (write tests first, then implementation)
  - use Vitest + React Testing Library
  - write interaction-based component tests
  - mock Tauri APIs when needed
  - ensure tests cover edge cases

# Commit/PR Guidelines
git:
  commits: "use conventional commits (feat:, fix:, chore:, etc.)"
  pull_requests: "clear description + screenshots for UI changes"