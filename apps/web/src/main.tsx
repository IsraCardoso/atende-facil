import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { RequireAuth } from "./components/require-auth";
import { RootRedirect } from "./components/root-redirect";
import { initThemeOnDocument } from "./lib/theme";
import { FlowEditorPage } from "./pages/flow-editor";
import { FlowsPage } from "./pages/flows";
import { InboxPage } from "./pages/inbox";
import { LoginPage } from "./pages/login";
import { SchedulesPage } from "./pages/schedules";
import { SettingsPage } from "./pages/settings";
import "./styles.css";

initThemeOnDocument();

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
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
              <FlowEditorPage />
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
