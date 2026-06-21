import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  AnalyticsProvider,
  ErrorBoundary,
  ErrorReporterProvider,
  FeatureFlagsProvider,
  ga4Adapter,
  plausibleAdapter,
  createHttpErrorReporter,
  BrowserConsoleProvider,
  ConsoleErrorBoundary,
  BrowserConsoleWindow,
} from "@kaldyrr/react-modules";

const reportError = createHttpErrorReporter({
  endpoint: import.meta.env.VITE_ERROR_ENDPOINT || "/api/errors",
  app: "my-react-app",
  release: import.meta.env.VITE_APP_VERSION || "1.0.0",
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorReporterProvider reportError={reportError}>
      <ErrorBoundary>
        <BrowserConsoleProvider
          persist
          captureOptions={{ captureFetch: true }}
        >
          <ConsoleErrorBoundary>
            <AnalyticsProvider
              adapters={[
                ga4Adapter({ measurementId: "G-XXXXXXXXXX" }),
                plausibleAdapter(),
              ]}
            >
              <FeatureFlagsProvider endpoint="/config/feature-flags.json">
                <App />
              </FeatureFlagsProvider>
            </AnalyticsProvider>
          </ConsoleErrorBoundary>

          <BrowserConsoleWindow defaultOpen={false} hotkey="F9" />
        </BrowserConsoleProvider>
      </ErrorBoundary>
    </ErrorReporterProvider>
  </React.StrictMode>
);
