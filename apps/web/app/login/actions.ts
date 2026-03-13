"use server"

import { apiFetch } from "@/lib/api"
import { createSession, getDeviceId } from "@/lib/session"
import { redirect } from "next/navigation"
import { z } from "zod"

const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
})

export type LoginState = {
	message?: string
	errors?: {
		email?: string[]
		password?: string[]
	}
}

export async function login(
	_prevState: LoginState | undefined,
	formData: FormData,
): Promise<LoginState | undefined> {
	const result = loginSchema.safeParse(Object.fromEntries(formData.entries()))

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors,
		}
	}

	const { email, password } = result.data
	const deviceId = await getDeviceId()

	const { data, error } = await apiFetch<{
		access_token: string
		refresh_token: string
		user_id: string
	}>("/auth/v1/login", {
		method: "POST",
		body: JSON.stringify({
			email,
			password,
			device_id: deviceId,
			device_name: "Web Browser",
			device_type: "web",
		}),
	})

	if (error || !data) {
		return {
			message: error || "Login failed",
		}
	}

	await createSession(data.access_token, data.refresh_token, data.user_id)
	redirect("/")
}
