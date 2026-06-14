import { useAuthStore, useRemoteVaultStore, useUIStore } from "@cortex/core"
import {
	Alert,
	AlertDescription,
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@cortex/ui"
import { CircleAlert, KeyRound, Mail, UserRound } from "lucide-react"
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
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[440px]">
				<DialogHeader className="bg-muted/25 px-6 pt-6 pb-5 text-left">
					<DialogTitle className="mt-1 text-[19px] tracking-[-0.025em]">{activeView}</DialogTitle>
				</DialogHeader>

				<Tabs value={activeView} onValueChange={handleViewChange}>
					<TabsList
						variant="line"
						className="mx-6 mt-4 grid w-[calc(100%-3rem)] grid-cols-2 border-b border-border/50 pb-1"
					>
						<TabsTrigger value="login">Sign in</TabsTrigger>
						<TabsTrigger value="register">Create account</TabsTrigger>
					</TabsList>

					<TabsContent value="login" className="px-6 pt-5 pb-6">
						<form onSubmit={handleLogin}>
							<FieldGroup className="gap-4">
								<Field>
									<FieldLabel htmlFor="auth-login-email">Email</FieldLabel>
									<InputGroup>
										<InputGroupAddon>
											<Mail />
										</InputGroupAddon>
										<InputGroupInput
											id="auth-login-email"
											type="email"
											autoComplete="email"
											placeholder="you@example.com"
											value={email}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
											required
											disabled={loading}
										/>
									</InputGroup>
								</Field>
								<Field>
									<FieldLabel htmlFor="auth-login-password">Password</FieldLabel>
									<InputGroup>
										<InputGroupAddon>
											<KeyRound />
										</InputGroupAddon>
										<InputGroupInput
											id="auth-login-password"
											type="password"
											autoComplete="current-password"
											placeholder="Your password"
											value={password}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
											required
											disabled={loading}
										/>
									</InputGroup>
								</Field>
								{displayError && (
									<Alert variant="destructive">
										<CircleAlert />
										<AlertDescription>{displayError}</AlertDescription>
									</Alert>
								)}
								<Field>
									<Button type="submit" size="sm" className="w-full" disabled={loading}>
										{loading ? "Signing in..." : "Sign in"}
									</Button>
									<FieldDescription className="flex items-center justify-center gap-1 text-center">
										<span>No account yet?</span>
										<Button
											type="button"
											variant="link"
											size="xs"
											className="h-auto px-1"
											onClick={() => handleViewChange("register")}
										>
											Create one
										</Button>
									</FieldDescription>
								</Field>
							</FieldGroup>
						</form>
					</TabsContent>

					<TabsContent value="register" className="px-6 pt-5 pb-6">
						<form onSubmit={handleRegister}>
							<FieldGroup className="gap-4">
								<Field>
									<FieldLabel htmlFor="auth-register-name">Display name</FieldLabel>
									<InputGroup>
										<InputGroupAddon>
											<UserRound />
										</InputGroupAddon>
										<InputGroupInput
											id="auth-register-name"
											type="text"
											autoComplete="name"
											placeholder="How others will see you"
											value={displayName}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												setDisplayName(e.target.value)
											}
											required
											disabled={loading}
										/>
									</InputGroup>
								</Field>
								<Field>
									<FieldLabel htmlFor="auth-register-email">Email</FieldLabel>
									<InputGroup>
										<InputGroupAddon>
											<Mail />
										</InputGroupAddon>
										<InputGroupInput
											id="auth-register-email"
											type="email"
											autoComplete="email"
											placeholder="you@example.com"
											value={email}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
											required
											disabled={loading}
										/>
									</InputGroup>
								</Field>
								<Field>
									<FieldLabel htmlFor="auth-register-password">Password</FieldLabel>
									<InputGroup>
										<InputGroupAddon>
											<KeyRound />
										</InputGroupAddon>
										<InputGroupInput
											id="auth-register-password"
											type="password"
											autoComplete="new-password"
											placeholder="At least 8 characters"
											value={password}
											onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
											required
											disabled={loading}
										/>
									</InputGroup>
								</Field>
								<Field>
									<FieldLabel htmlFor="auth-register-confirm">Confirm password</FieldLabel>
									<InputGroup>
										<InputGroupAddon>
											<KeyRound />
										</InputGroupAddon>
										<InputGroupInput
											id="auth-register-confirm"
											type="password"
											autoComplete="new-password"
											placeholder="Repeat your password"
											value={confirmPassword}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												setConfirmPassword(e.target.value)
											}
											required
											disabled={loading}
										/>
									</InputGroup>
									<FieldDescription>Must be at least 8 characters long.</FieldDescription>
								</Field>
								{displayError && (
									<Alert variant="destructive">
										<CircleAlert />
										<AlertDescription>{displayError}</AlertDescription>
									</Alert>
								)}
								<Field>
									<Button type="submit" size="sm" className="w-full" disabled={loading}>
										{loading ? "Creating account..." : "Create account"}
									</Button>
									<FieldDescription className="flex items-center justify-center gap-1 text-center">
										<span>Already have an account?</span>
										<Button
											type="button"
											variant="link"
											size="xs"
											className="h-auto px-1"
											onClick={() => handleViewChange("login")}
										>
											Sign in
										</Button>
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
