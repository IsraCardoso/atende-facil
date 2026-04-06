import { type ReactElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App(): ReactElement<Readonly<{ children: string }>, "main"> {
  return <main>web bootstrap ready</main>;
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
