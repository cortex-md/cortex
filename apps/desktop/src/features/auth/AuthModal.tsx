import { useAuthStore, useRemoteVaultStore, useUIStore } from "@cortex/core"
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@cortex/ui"
import { LogIn } from "lucide-react"
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react"

type AuthView = "login" | "register"

export function AuthModal() {
	const authOpen = useUIStore((s) => s.authOpen)
	const authInitialView = useUIStore((s) => s.authInitialView)
	const authReturnTo = useUIStore((s) => s.authReturnTo)
	const closeAuth = useUIStore((s) => s.closeAuth)
	const openSettings = useUIStore((s) => s.openSettings)
	const { login, register, loading, error, clearError } = useAuthStore()
	const serverUrl = useRemoteVaultStore((s) => s.syncConfig.serverUrl)

	const [activeView, setActiveView] = useState<AuthView>(authInitialView)
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [displayName, setDisplayName] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [validationError, setValidationError] = useState<string | null>(null)

	useEffect(() => {
		if (!authOpen) return
		setActiveView(authInitialView)
		setValidationError(null)
		clearError()
	}, [authOpen, authInitialView, clearError])

	useEffect(() => {
		if (authOpen) return
		setEmail("")
		setPassword("")
		setDisplayName("")
		setConfirmPassword("")
		setValidationError(null)
		clearError()
	}, [authOpen, clearError])

	const handleSuccess = () => {
		const returnTo = authReturnTo
		closeAuth()
		if (returnTo) {
			openSettings(returnTo)
		}
	}

	const handleViewChange = (value: string) => {
		setActiveView(value as AuthView)
		setValidationError(null)
		clearError()
	}

	const handleLogin = async (e: FormEvent) => {
		e.preventDefault()
		setValidationError(null)
		clearError()
		try {
			await login(email, password, serverUrl ?? undefined)
			handleSuccess()
		} catch {}
	}

	const handleRegister = async (e: FormEvent) => {
		e.preventDefault()
		setValidationError(null)
		clearError()

		if (password !== confirmPassword) {
			setValidationError("Passwords do not match")
			return
		}
		if (password.length < 8) {
			setValidationError("Password must be at least 8 characters")
			return
		}

		try {
			await register(email, password, displayName, serverUrl ?? undefined)
			handleSuccess()
		} catch {}
	}

	const displayError = validationError || error

	return (
		<Dialog open={authOpen} onOpenChange={(open) => !open && closeAuth()}>
			<DialogContent className="sm:max-w-[420px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<LogIn size={16} />
						Cortex account
					</DialogTitle>
					<DialogDescription>Sign in or create an account to use sync.</DialogDescription>
				</DialogHeader>

				<Tabs value={activeView} onValueChange={handleViewChange}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="login">Sign in</TabsTrigger>
						<TabsTrigger value="register">Create account</TabsTrigger>
					</TabsList>

					<TabsContent value="login">
						<form onSubmit={handleLogin}>
							<FieldGroup className="gap-4">
								<Field>
									<FieldLabel htmlFor="auth-login-email">Email</FieldLabel>
									<Input
										id="auth-login-email"
										type="email"
										placeholder="you@example.com"
										value={email}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
										required
										disabled={loading}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="auth-login-password">Password</FieldLabel>
									<Input
										id="auth-login-password"
										type="password"
										value={password}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
										required
										disabled={loading}
									/>
								</Field>
								{displayError && <FieldError>{displayError}</FieldError>}
								<Field>
									<Button type="submit" className="w-full" disabled={loading}>
										{loading ? "Signing in..." : "Sign in"}
									</Button>
									<FieldDescription className="text-center">
										No account yet?{" "}
										<button
											type="button"
											className="underline hover:text-accent-hover"
											onClick={() => handleViewChange("register")}
										>
											Create one
										</button>
									</FieldDescription>
								</Field>
							</FieldGroup>
						</form>
					</TabsContent>

					<TabsContent value="register">
						<form onSubmit={handleRegister}>
							<FieldGroup className="gap-4">
								<Field>
									<FieldLabel htmlFor="auth-register-name">Display name</FieldLabel>
									<Input
										id="auth-register-name"
										type="text"
										placeholder="John Doe"
										value={displayName}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
										required
										disabled={loading}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="auth-register-email">Email</FieldLabel>
									<Input
										id="auth-register-email"
										type="email"
										placeholder="you@example.com"
										value={email}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
										required
										disabled={loading}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="auth-register-password">Password</FieldLabel>
									<Input
										id="auth-register-password"
										type="password"
										value={password}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
										required
										disabled={loading}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="auth-register-confirm">Confirm password</FieldLabel>
									<Input
										id="auth-register-confirm"
										type="password"
										value={confirmPassword}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											setConfirmPassword(e.target.value)
										}
										required
										disabled={loading}
									/>
									<FieldDescription>Must be at least 8 characters long.</FieldDescription>
								</Field>
								{displayError && <FieldError>{displayError}</FieldError>}
								<Field>
									<Button type="submit" className="w-full" disabled={loading}>
										{loading ? "Creating account..." : "Create account"}
									</Button>
									<FieldDescription className="text-center">
										Already have an account?{" "}
										<button
											type="button"
											className="underline hover:text-accent-hover"
											onClick={() => handleViewChange("login")}
										>
											Sign in
										</button>
									</FieldDescription>
								</Field>
							</FieldGroup>
						</form>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
