import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./styles.css";
import { FlowEditorPage } from "./pages/flow-editor";
import { FlowsPage } from "./pages/flows";
import { InboxPage } from "./pages/inbox";
import { LoginPage } from "./pages/login";
import { SchedulesPage } from "./pages/schedules";
import { SettingsPage } from "./pages/settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/inbox" replace={true} />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/flows" element={<FlowsPage />} />
        <Route path="/flows/:id/edit" element={<FlowEditorPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<LoginPage />} />
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
