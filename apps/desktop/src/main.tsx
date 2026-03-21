import { tauriPlatform } from "@cortex/ipc"
import { initPlatform } from "@cortex/platform"
import { initThemeManager } from "@cortex/theme"
import ReactDOM from "react-dom/client"
import App from "./App"
import { generateCSSString, generateCSSVariables } from "./features/themes/cssGenerator"
import { WebThemeAdapter } from "./features/themes/webThemeAdapter"
import "./styles.css"

initPlatform(tauriPlatform)
initThemeManager("ink", new WebThemeAdapter(), { generateCSSString, generateCSSVariables })

const ua = navigator.userAgent.toLowerCase()
const platform = ua.includes("macintosh") ? "macos" : ua.includes("windows") ? "windows" : "linux"
document.body.setAttribute("data-platform", platform)

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />)
