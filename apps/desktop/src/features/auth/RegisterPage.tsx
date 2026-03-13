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

interface RegisterPageProps {
	onSwitchToLogin: () => void
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
	const { register, loading, error, clearError } = useAuthStore()
	const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL)
	const [displayName, setDisplayName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [validationError, setValidationError] = useState<string | null>(null)

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		clearError()
		setValidationError(null)

		if (password !== confirmPassword) {
			setValidationError("Passwords do not match")
			return
		}
		if (password.length < 8) {
			setValidationError("Password must be at least 8 characters")
			return
		}

		await register(serverUrl, email, password, displayName).catch(() => {})
	}

	const displayError = validationError || error

	return (
		<div className="flex items-center justify-center flex-1">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader>
						<CardTitle>Create your account</CardTitle>
						<CardDescription>Sign up to start syncing</CardDescription>
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
									<FieldLabel htmlFor="display-name">Display Name</FieldLabel>
									<Input
										id="display-name"
										type="text"
										placeholder="John Doe"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										required
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
								<Field>
									<FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
									<Input
										id="confirm-password"
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										required
										disabled={loading}
									/>
									<FieldDescription>Must be at least 8 characters long.</FieldDescription>
								</Field>
								{displayError && (
									<FieldError className="text-center">{displayError}</FieldError>
								)}
								<Field>
									<Button type="submit" className="w-full" disabled={loading}>
										{loading ? "Creating account..." : "Create Account"}
									</Button>
									<FieldDescription className="text-center">
										Already have an account?{" "}
										<button
											type="button"
											className="underline hover:text-accent-hover"
											onClick={onSwitchToLogin}
										>
											Sign in
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
