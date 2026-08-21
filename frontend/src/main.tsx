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
import Router from "./Router";
import { theme } from "./theme";

const rootElement = document.getElementById("root");
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <GoogleOAuthProvider clientId={googleClientId}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </BrowserRouter>
        </GoogleOAuthProvider>
      </MantineProvider>
    </StrictMode>,
  );
}
