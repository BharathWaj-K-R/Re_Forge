import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Landing from "./components/Landing";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Landing />
  </StrictMode>
);
