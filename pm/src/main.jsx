import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  AnalyticsProvider,
  ErrorBoundary,
  ErrorReporterProvider,
  FeatureFlagsProvider,
} from "./modules"; 

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FeatureFlagsProvider endpoint="/config/feature-flags.json">
        <App />
      </FeatureFlagsProvider>
    </ErrorBoundary>
  </React.StrictMode>
);