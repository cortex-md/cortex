import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		name: "desktop",
		root,
		environment: "jsdom",
		globals: true,
		maxWorkers: 4,
		setupFiles: ["src/__tests__/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
	},
})
