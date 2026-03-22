import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
	plugins: [react()],
	test: {
		name: "desktop",
		root,
		environment: "jsdom",
		globals: true,
		setupFiles: ["src/__tests__/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
	},
})
