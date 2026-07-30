import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	// Base public path when served from GitHub Pages under a repo path
	base: "/BattleReadyShelf/",
	plugins: [react()],
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
