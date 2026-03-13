import { useAuthStore } from "@cortex/core"
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
	Separator,
} from "@cortex/ui"
import { type FormEvent, useState } from "react"

interface LoginPageProps {
	onSwitchToRegister: () => void
	onStayOffline: () => void
}

export function LoginPage({ onSwitchToRegister, onStayOffline }: LoginPageProps) {
	const { login, loading, error, clearError } = useAuthStore()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		clearError()
		await login(email, password).catch(() => {})
	}

	return (
		<div className="flex h-screen items-center justify-center bg-bg-primary text-text-primary">
			<div className="w-full max-w-sm px-4 flex flex-col gap-5">
				<Card>
					<CardHeader>
						<CardTitle>Login to Cortex</CardTitle>
						<CardDescription>Sign in to sync your vaults</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit}>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="email">Email</FieldLabel>
									<Input
										id="email"
										type="email"
										placeholder="you@example.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										disabled={loading}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="password">Password</FieldLabel>
									<Input
										id="password"
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										disabled={loading}
									/>
								</Field>
								{error && <FieldError className="text-center">{error}</FieldError>}
								<Field>
									<Button type="submit" className="w-full" disabled={loading}>
										{loading ? "Signing in..." : "Sign In"}
									</Button>
									<FieldDescription className="text-center">
										Don&apos;t have an account?{" "}
										<button
											type="button"
											className="underline hover:text-accent-hover"
											onClick={onSwitchToRegister}
										>
											Create one
										</button>
									</FieldDescription>
								</Field>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>
				<Separator />
				<Button onClick={onStayOffline} variant="outline">
					Stay offline
				</Button>
			</div>
		</div>
	)
}
