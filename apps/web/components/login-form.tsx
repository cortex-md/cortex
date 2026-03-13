"use client"

import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	cn,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
} from "@cortex/ui"
import { useActionState } from "react"
import { login } from "@/app/login/actions"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const [state, action, isPending] = useActionState(login, undefined)

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>Enter your cortex login</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={action}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="m@example.com"
									required
									disabled={isPending}
								/>
								{state?.errors?.email && <FieldError>{state.errors.email.join(", ")}</FieldError>}
							</Field>
							<Field>
								<div className="flex items-center justify-between">
									<FieldLabel htmlFor="password">Password</FieldLabel>
									<a href="#" className="text-sm hover:underline">
										Forgot password?
									</a>
								</div>
								<Input
									id="password"
									name="password"
									type="password"
									required
									disabled={isPending}
								/>
								{state?.errors?.password && (
									<FieldError>{state.errors.password.join(", ")}</FieldError>
								)}
							</Field>
							{state?.message && <FieldError className="text-center">{state.message}</FieldError>}
							<Field>
								<Button type="submit" className="w-full" disabled={isPending}>
									{isPending ? "Logging in..." : "Login"}
								</Button>
								<FieldDescription className="text-center">
									Don&apos;t have an account?{" "}
									<a href="/sign-up" className="hover:text-accent-hover underline">
										Sign up
									</a>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
