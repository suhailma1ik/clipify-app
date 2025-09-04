import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeApiClient } from "./services/apiClient";
import { environmentConfig } from "./services/environmentService";
import { initializeLogging } from "./services/loggingService";

initializeLogging(environmentConfig.environment);
initializeApiClient(environmentConfig.api);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
