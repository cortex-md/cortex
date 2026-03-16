import { useAuthStore } from "@cortex/core"
import { listen } from "@tauri-apps/api/event"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { LoginPage } from "./LoginPage"
import { RegisterPage } from "./RegisterPage"

type AuthView = "login" | "register"

interface AuthGuardProps {
	children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
	const { authenticated, offline, checkAuth, loadPreferences, logout } = useAuthStore()
	const [authView, setAuthView] = useState<AuthView>("login")
	const [checked, setChecked] = useState(false)

	useEffect(() => {
		loadPreferences()
			.then(() => checkAuth())
			.finally(() => setChecked(true))
	}, [checkAuth, loadPreferences])

	useEffect(() => {
		const unlisten = listen("auth-session-expired", () => {
			logout()
		})
		return () => {
			unlisten.then((fn) => fn())
		}
	}, [logout])

	if (!checked) return null

	if (authenticated || offline) return <>{children}</>

	if (authView === "register") {
		return (
			<RegisterPage
				onStayOffline={() => useAuthStore.getState().setOffline(true)}
				onSwitchToLogin={() => setAuthView("login")}
			/>
		)
	}

	return (
		<LoginPage
			onStayOffline={() => useAuthStore.getState().setOffline(true)}
			onSwitchToRegister={() => setAuthView("register")}
		/>
	)
}
