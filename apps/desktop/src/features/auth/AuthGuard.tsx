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
	const { authenticated, checkAuth } = useAuthStore()
	const [authView, setAuthView] = useState<AuthView>("login")
	const [checked, setChecked] = useState(false)

	useEffect(() => {
		checkAuth().finally(() => setChecked(true))
	}, [checkAuth])

	if (!checked) return null

	if (!authenticated) {
		if (authView === "register") {
			return <RegisterPage onSwitchToLogin={() => setAuthView("login")} />
		}
		return <LoginPage onSwitchToRegister={() => setAuthView("register")} />
	}

	return <>{children}</>
}
