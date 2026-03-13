import { cookies } from "next/headers"

const COOKIE_ACCESS_TOKEN = "access_token"
const COOKIE_REFRESH_TOKEN = "refresh_token"
const COOKIE_USER_ID = "user_id"
const COOKIE_DEVICE_ID = "device_id"

export async function createSession(accessToken: string, refreshToken: string, userId: string) {
	const cookieStore = await cookies()

	cookieStore.set(COOKIE_ACCESS_TOKEN, accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	})
	cookieStore.set(COOKIE_REFRESH_TOKEN, refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	})
	cookieStore.set(COOKIE_USER_ID, userId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	})
}

export async function deleteSession() {
	const cookieStore = await cookies()
	cookieStore.delete(COOKIE_ACCESS_TOKEN)
	cookieStore.delete(COOKIE_REFRESH_TOKEN)
	cookieStore.delete(COOKIE_USER_ID)
}

export async function getSession() {
	const cookieStore = await cookies()
	const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value
	const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value
	const userId = cookieStore.get(COOKIE_USER_ID)?.value

	if (!accessToken || !refreshToken || !userId) {
		return null
	}

	return { accessToken, refreshToken, userId }
}

export async function getDeviceId() {
	const cookieStore = await cookies()
	let deviceId = cookieStore.get(COOKIE_DEVICE_ID)?.value

	if (!deviceId) {
		deviceId = crypto.randomUUID()
		cookieStore.set(COOKIE_DEVICE_ID, deviceId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 365, // 1 year
		})
	}

	return deviceId
}
