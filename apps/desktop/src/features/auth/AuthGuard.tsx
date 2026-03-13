import { useAuthStore } from "@cortex/core"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { LoginPage } from "./LoginPage"
import { RegisterPage } from "./RegisterPage"

type AuthView = "login" | "register"

interface AuthGuardProps {
	children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
	const { authenticated, offline, checkAuth, loadServerUrl, setOffline } = useAuthStore()
	const [authView, setAuthView] = useState<AuthView>("login")
	const [checked, setChecked] = useState(false)

	useEffect(() => {
		loadServerUrl()
			.then(() => checkAuth())
			.finally(() => setChecked(true))
	}, [checkAuth, loadServerUrl])

	if (!checked) return null

	if (authenticated || offline) return <>{children}</>

	if (authView === "register") {
		return (
			<RegisterPage
				onStayOffline={() => setOffline(true)}
				onSwitchToLogin={() => setAuthView("login")}
			/>
		)
	}

	return (
		<LoginPage
			onStayOffline={() => setOffline(true)}
			onSwitchToRegister={() => setAuthView("register")}
		/>
	)
}
