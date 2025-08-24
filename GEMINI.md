# Clipify `refine`

This document provides a comprehensive overview of the `refine` project, its constituent components, and instructions for development and deployment.

## Project Overview

The `refine` project is a cross-platform desktop application built using Tauri, React, and TypeScript. It provides a user interface for interacting with the Clipify API. The application allows users to clean up text from their clipboard with a global shortcut (Cmd+Shift+C). It also maintains a history of clipboard entries.

## Key Technologies:

*   **Framework:** Tauri
*   **UI Library:** React
*   **Language:** TypeScript, Rust
*   **Build Tool:** Vite, Cargo

## Building and Running:

1.  **Prerequisites:**
    *   Node.js and npm
    *   Rust and Cargo

2.  **Setup:**
    *   Navigate to the `refine` directory.
    *   Install the Node.js dependencies:
        ```bash
        npm install
        ```

3.  **Run in development mode:**
    ```bash
    npm run tauri:dev
    ```

4.  **Build the application:**
    ```bash
    npm run tauri:build
    ```

## Development Conventions

*   **Monorepo Structure:** The project is organized as a monorepo, with each application in its own directory.
*   **Environment Variables:** Each project uses `.env` files for managing environment-specific configurations.
*   **API-Driven:** The `refine` application is a client of the `server` API.
*   **TypeScript:** The `refine` project uses TypeScript for type safety.
*   **Vite:** The `refine` project uses Vite for fast and efficient development and builds.
