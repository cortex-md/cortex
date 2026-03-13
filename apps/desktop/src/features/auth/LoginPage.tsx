import { useAuthStore } from "@cortex/core"
import { Button } from "@cortex/ui"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@cortex/ui"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@cortex/ui"
import { Input } from "@cortex/ui"
import { type FormEvent, useState } from "react"

const DEFAULT_SERVER_URL = "http://localhost:8080"

interface LoginPageProps {
	onSwitchToRegister: () => void
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
	const { login, loading, error, clearError } = useAuthStore()
	const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL)
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		clearError()
		await login(serverUrl, email, password).catch(() => {})
	}

	return (
		<div className="flex items-center justify-center flex-1">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader>
						<CardTitle>Login to Cortex</CardTitle>
						<CardDescription>Sign in to sync your vaults</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit}>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="server-url">Server URL</FieldLabel>
									<Input
										id="server-url"
										type="url"
										value={serverUrl}
										onChange={(e) => setServerUrl(e.target.value)}
										disabled={loading}
									/>
								</Field>
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
			</div>
		</div>
	)
}
