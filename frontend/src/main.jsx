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
  app: "moroz-play",
  release: import.meta.env.VITE_APP_VERSION || "1.0.0",
});

const CONSOLE_OPTIONS = { captureFetch: false };
const ANALYTICS_ADAPTERS = [
  ga4Adapter({ measurementId: import.meta.env.VITE_GA4_ID || "" }),
  plausibleAdapter(),
];
const EMPTY_FLAGS = {};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorReporterProvider reportError={reportError}>
      <ErrorBoundary>
        {/*
          captureFetch намеренно отключён: React StrictMode монтирует эффекты
          дважды, из-за чего AbortController отменяет первый запрос погоды —
          это штатное поведение, а не ошибка. captureFetch: true делал бы
          из каждого такого AbortError шумный лог в консоли.
        */}
        <BrowserConsoleProvider persist captureOptions={CONSOLE_OPTIONS}>
          <ConsoleErrorBoundary>
            <AnalyticsProvider adapters={ANALYTICS_ADAPTERS}>
              <FeatureFlagsProvider endpoint="/config/feature-flags.json" initialFlags={EMPTY_FLAGS}>
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
