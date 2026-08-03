import { client } from "../generated/client.gen";
import { clearTokenDueToUnauthorized, getStoredToken } from "./tokenStorage";

// Attach the JWT (if present) to every request made via the generated API client.
client.instance.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server ever rejects our token as invalid/expired, clear it (and notify
// AuthContext) so the UI falls back to the unauthenticated "preview" experience
// instead of continuing to render as if still logged in.
client.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearTokenDueToUnauthorized();
    }
    return Promise.reject(error);
  },
);

export const apiClient = client.instance;
