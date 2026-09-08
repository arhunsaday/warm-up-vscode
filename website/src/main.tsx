import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { App } from "./App";
import { AppPage } from "./app/AppPage";
import "./styles.css";
import "./app/app.css";

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/app" element={<AppPage />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>,
  );
}
