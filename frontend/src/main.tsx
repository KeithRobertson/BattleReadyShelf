import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./auth/apiClient";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <MantineProvider defaultColorScheme="auto">
        <GoogleOAuthProvider clientId={googleClientId}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </GoogleOAuthProvider>
      </MantineProvider>
    </StrictMode>,
  );
}
