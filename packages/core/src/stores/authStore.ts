import type { AuthStatus, CurrentUser } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface AuthState {
	authenticated: boolean
	user: CurrentUser | null
	loading: boolean
	error: string | null

	checkAuth: () => Promise<void>
	login: (serverUrl: string, email: string, password: string) => Promise<void>
	register: (
		serverUrl: string,
		email: string,
		password: string,
		displayName: string,
	) => Promise<void>
	logout: (allDevices?: boolean) => Promise<void>
	clearError: () => void
}

export const useAuthStore = create<AuthState>()(
	devtools(
		immer((set, get) => ({
			authenticated: false,
			user: null,
			loading: false,
			error: null,

			checkAuth: async () => {
				try {
					const platform = getPlatform()
					const status: AuthStatus = await platform.auth.getStatus()
					if (status.authenticated && status.userId && status.email) {
						set((state) => {
							state.authenticated = true
							state.user = { userId: status.userId!, email: status.email! }
							state.loading = false
						})
					} else {
						set((state) => {
							state.authenticated = false
							state.user = null
							state.loading = false
						})
					}
				} catch {
					set((state) => {
						state.authenticated = false
						state.user = null
						state.loading = false
					})
				}
			},

			login: async (serverUrl, email, password) => {
				set((state) => {
					state.loading = true
					state.error = null
				})
				try {
					const platform = getPlatform()
					const result = await platform.auth.login(serverUrl, email, password)
					set((state) => {
						state.authenticated = true
						state.user = { userId: result.userId, email: result.email }
						state.loading = false
					})
				} catch (e) {
					set((state) => {
						state.loading = false
						state.error = String(e)
					})
					throw e
				}
			},

			register: async (serverUrl, email, password, displayName) => {
				set((state) => {
					state.loading = true
					state.error = null
				})
				try {
					const platform = getPlatform()
					await platform.auth.register(serverUrl, email, password, displayName)
					await get().login(serverUrl, email, password)
				} catch (e) {
					set((state) => {
						state.loading = false
						state.error = String(e)
					})
					throw e
				}
			},

			logout: async (allDevices = false) => {
				try {
					const platform = getPlatform()
					await platform.auth.logout(allDevices)
				} finally {
					set((state) => {
						state.authenticated = false
						state.user = null
						state.error = null
					})
				}
			},

			clearError: () =>
				set((state) => {
					state.error = null
				}),
		})),
		{ name: "authStore" },
	),
)
