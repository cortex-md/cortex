import { initPlatform } from "@cortex/platform"
import { tauriPlatform } from "@cortex/platform/adapters/tauri"
import { initThemeManager, WebThemeAdapter } from "@cortex/theme"
import React from "react"
import ReactDOM from "react-dom/client"
import "./styles.css"
import App from "./App"

initPlatform(tauriPlatform)
initThemeManager("ink", new WebThemeAdapter())

const ua = navigator.userAgent.toLowerCase()
const platform = ua.includes("macintosh") ? "macos" : ua.includes("windows") ? "windows" : "linux"
document.body.setAttribute("data-platform", platform)

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
