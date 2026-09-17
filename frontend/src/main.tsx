import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@/auth/apiClient";
import { AuthProvider } from "@/auth/AuthContext";
import "@/index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { isAxiosError } from "axios";
import Router from "@/Router";
import { theme } from "@/theme";

const rootElement = document.getElementById("root");
// `refetchOnMount` stays on the library default. Turning it off once meant a catalogue fetched on
// an earlier visit was reused forever within a session, so a faction or model definition added on
// one page stayed invisible on the others until a full page reload. Every query below sets
// `placeholderData`, so a background refetch on mount re-renders with fresh data without showing a
// loading state over data we already have. Note that this also makes `isLoading` false on the very
// first render, so use `isInitialLoad` (see `utils/isInitialLoad.ts`) to decide whether to show a
// loading state.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Only retry when the request never got an answer. A server that replied with an error will
      // reply the same way again, so retrying it just delays the failure - and in the meantime the
      // page sits on `placeholderData`, telling the user they have no collections rather than that
      // the list could not be loaded.
      retry: (failureCount, error) => (isAxiosError(error) && !error.response ? failureCount < 2 : false),
    },
  },
});
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        <MantineProvider theme={theme} defaultColorScheme="auto">
          {/* Bottom, because the top right of the header is where the user menu and the sign-in
              button live - and "your session has expired" landing on top of the button it is telling
              you to press is not helpful. */}
          <Notifications position="bottom-right" />
          <GoogleOAuthProvider clientId={googleClientId}>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <AuthProvider>
                <Router />
              </AuthProvider>
            </BrowserRouter>
          </GoogleOAuthProvider>
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
