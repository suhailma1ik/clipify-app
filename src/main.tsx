import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext";
import AuthWrapper from "./components/auth/AuthWrapper";

console.log('[Main] Application starting');
console.log('[Main] React version:', React.version);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  </React.StrictMode>,
);

console.log('[Main] Application rendered');