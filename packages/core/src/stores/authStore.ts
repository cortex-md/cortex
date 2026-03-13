import type { AuthStatus, CurrentUser } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

const SERVER_URL_KEYCHAIN_KEY = "server_url"
const DEFAULT_SERVER_URL = "http://localhost:8080"

export interface AuthState {
	authenticated: boolean
	offline: boolean
	user: CurrentUser | null
	loading: boolean
	error: string | null
	serverUrl: string

	checkAuth: () => Promise<void>
	loadServerUrl: () => Promise<void>
	saveServerUrl: (url: string) => Promise<void>
	login: (email: string, password: string) => Promise<void>
	register: (email: string, password: string, displayName: string) => Promise<void>
	logout: (allDevices?: boolean) => Promise<void>
	setOffline: (offline: boolean) => void
	clearError: () => void
}

export const useAuthStore = create<AuthState>()(
	devtools(
		immer((set, get) => ({
			authenticated: false,
			offline: false,
			user: null,
			loading: false,
			error: null,
			serverUrl: DEFAULT_SERVER_URL,

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

			loadServerUrl: async () => {
				try {
					const platform = getPlatform()
					const stored = await platform.keychain.get(SERVER_URL_KEYCHAIN_KEY)
					if (stored) {
						set((state) => {
							state.serverUrl = stored
						})
					}
				} catch {}
			},

			saveServerUrl: async (url: string) => {
				try {
					const platform = getPlatform()
					await platform.keychain.set(SERVER_URL_KEYCHAIN_KEY, url)
					set((state) => {
						state.serverUrl = url
					})
				} catch {}
			},

			login: async (email: string, password: string) => {
				set((state) => {
					state.loading = true
					state.error = null
				})
				try {
					const platform = getPlatform()
					const serverUrl = get().serverUrl
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

			register: async (email: string, password: string, displayName: string) => {
				set((state) => {
					state.loading = true
					state.error = null
				})
				try {
					const platform = getPlatform()
					const serverUrl = get().serverUrl
					await platform.auth.register(serverUrl, email, password, displayName)
					await get().login(email, password)
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
						state.offline = false
						state.user = null
						state.error = null
					})
				}
			},

			setOffline: (offline: boolean) =>
				set((state) => {
					state.offline = offline
				}),

			clearError: () =>
				set((state) => {
					state.error = null
				}),
		})),
		{ name: "authStore" },
	),
)
