import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
	base: "/",
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		target: "esnext",
		sourcemap: true,
	},
	// Dev server proxy: forward /api to local backend during development
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:8080",
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/api/, "/battlereadyshelf/api"),
			},
		},
	},
});
