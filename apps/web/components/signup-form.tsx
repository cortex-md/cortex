"use client"

import { signup } from "@/app/sign-up/actions"
import { Button, cn } from "@cortex/ui"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@cortex/ui"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@cortex/ui"
import { Input } from "@cortex/ui"
import { useActionState } from "react"

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const [state, action, isPending] = useActionState(signup, undefined)

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Create your account</CardTitle>
					<CardDescription>
						Enter your email below to create your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={action}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="display_name">Display Name</FieldLabel>
								<Input
									id="display_name"
									name="display_name"
									type="text"
									placeholder="John Doe"
									required
									disabled={isPending}
								/>
								{state?.errors?.display_name && (
									<FieldError>{state.errors.display_name.join(", ")}</FieldError>
								)}
							</Field>
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
								{state?.errors?.email && (
									<FieldError>{state.errors.email.join(", ")}</FieldError>
								)}
							</Field>
							<Field>
								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="password">Password</FieldLabel>
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
									<Field>
										<FieldLabel htmlFor="confirmPassword">
											Confirm Password
										</FieldLabel>
										<Input
											id="confirmPassword"
											name="confirmPassword"
											type="password"
											required
											disabled={isPending}
										/>
										{state?.errors?.confirmPassword && (
											<FieldError>{state.errors.confirmPassword.join(", ")}</FieldError>
										)}
									</Field>
								</div>
								<FieldDescription>
									Must be at least 8 characters long.
								</FieldDescription>
							</Field>
							{state?.message && <FieldError className="text-center">{state.message}</FieldError>}
							<Field>
								<Button type="submit" className="w-full" disabled={isPending}>
									{isPending ? "Creating account..." : "Create Account"}
								</Button>
								<FieldDescription className="text-center">
									Already have an account?{" "}
									<a href="/login" className="hover:text-accent-hover underline">
										Sign in
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
