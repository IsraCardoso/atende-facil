import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "ui/tooltip";

import { RequireAuth } from "./components/require-auth";
import { RootRedirect } from "./components/root-redirect";
import { initThemeOnDocument } from "./lib/theme";
import { FlowsPage } from "./pages/flows";
import { InboxPage } from "./pages/inbox";
import { LoginPage } from "./pages/login";
import { SchedulesPage } from "./pages/schedules";
import { SettingsPage } from "./pages/settings";
import { SignupPage } from "./pages/signup";
import "./styles.css";

const FlowEditorPage = lazy(() =>
  import("./pages/flow-editor").then((m) => ({ default: m.FlowEditorPage })),
);

initThemeOnDocument();

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/inbox"
            element={
              <RequireAuth>
                <InboxPage />
              </RequireAuth>
            }
          />
          <Route
            path="/flows"
            element={
              <RequireAuth>
                <FlowsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/flows/:id/edit"
            element={
              <RequireAuth>
                <Suspense
                  fallback={
                    <div className="text-muted-foreground flex h-screen items-center justify-center text-sm">
                      Carregando editor…
                    </div>
                  }
                >
                  <FlowEditorPage />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/schedules"
            element={
              <RequireAuth>
                <SchedulesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  );
}

const rootElement = globalThis.document?.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

export { App };
