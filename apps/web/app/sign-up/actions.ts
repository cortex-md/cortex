"use server"

import { apiFetch } from "@/lib/api"
import { redirect } from "next/navigation"
import { z } from "zod"

const signupSchema = z
	.object({
		display_name: z.string().min(2, "Display name must be at least 2 characters"),
		email: z.string().email("Invalid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})

export type SignupState = {
	message?: string
	errors?: {
		display_name?: string[]
		email?: string[]
		password?: string[]
		confirmPassword?: string[]
	}
}

export async function signup(
	_prevState: SignupState | undefined,
	formData: FormData,
): Promise<SignupState | undefined> {
	const result = signupSchema.safeParse(Object.fromEntries(formData.entries()))

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors,
		}
	}

	const { email, password, display_name } = result.data

	const { error } = await apiFetch("/auth/v1/register", {
		method: "POST",
		body: JSON.stringify({
			email,
			password,
			display_name,
		}),
	})

	if (error) {
		return {
			message: error,
		}
	}

	redirect("/login?created=true")
}
