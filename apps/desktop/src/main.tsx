import { tauriPlatform } from "@cortex/ipc"
import { initPlatform } from "@cortex/platform"
import { initThemeManager, WebThemeAdapter } from "@cortex/theme"
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./styles.css"

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
