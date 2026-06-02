import { tauriPlatform } from "@cortex/ipc"
import { initPlatform, type NativeAppearanceSnapshot } from "@cortex/platform"
import { initThemeManager } from "@cortex/theme"
import { lazy, Suspense } from "react"
import ReactDOM from "react-dom/client"
import { generateCSSString, generateCSSVariables } from "./features/themes/cssGenerator"
import { WebThemeAdapter } from "./features/themes/webThemeAdapter"
import "./styles.css"

initPlatform(tauriPlatform)
initThemeManager("ink", new WebThemeAdapter(), { generateCSSString, generateCSSVariables })

function applyNativeAppearance(snapshot: NativeAppearanceSnapshot) {
	document.body.dataset.platform = snapshot.platform
	document.body.dataset.colorScheme = snapshot.colorScheme
	document.body.dataset.reducedMotion = String(snapshot.reducedMotion)
	document.body.dataset.highContrast = String(snapshot.highContrast)
	document.body.dataset.scrollbarStyle = snapshot.scrollbarStyle
	if (snapshot.accentColor) {
		document.body.style.setProperty("--system-accent", snapshot.accentColor)
	} else {
		document.body.style.removeProperty("--system-accent")
	}
}

function refreshNativeAppearance() {
	tauriPlatform.appearance.getSnapshot().then(applyNativeAppearance)
}

function prewarmTextRendering() {
	const span = document.createElement("span")
	span.setAttribute("aria-hidden", "true")
	span.className = "native-text-prewarm"
	span.textContent = "😀✨✓✗中文日本語한국어"
	document.body.appendChild(span)
	requestAnimationFrame(() => requestAnimationFrame(() => span.remove()))
}

refreshNativeAppearance()
const unsubscribeNativeAppearance = tauriPlatform.appearance.subscribe(applyNativeAppearance)
window.addEventListener("beforeunload", unsubscribeNativeAppearance, { once: true })
prewarmTextRendering()

const params = new URLSearchParams(window.location.search)
const Root = lazy(async () => {
	if (params.get("window") === "settings") {
		const module = await import("./features/settings/SettingsWindow")
		return { default: module.SettingsWindow }
	}
	return import("./App")
})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<Suspense fallback={null}>
		<Root />
	</Suspense>,
)
