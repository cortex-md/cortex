import type { AuthStatus, CurrentUser } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

const SERVER_URL_KEYCHAIN_KEY = "server_url"
const SYNC_ENABLED_KEY = "sync_enabled"
const SELF_HOSTED_KEY = "self_hosted"
const DEFAULT_SERVER_URL = "http://localhost:8080"

export interface AuthState {
	authenticated: boolean
	syncEnabled: boolean
	selfHosted: boolean
	user: CurrentUser | null
	loading: boolean
	error: string | null
	serverUrl: string

	checkAuth: () => Promise<void>
	loadPreferences: () => Promise<void>
	loadServerUrl: () => Promise<void>
	saveServerUrl: (url: string) => Promise<void>
	setSelfHosted: (selfHosted: boolean) => Promise<void>
	login: (email: string, password: string) => Promise<void>
	register: (email: string, password: string, displayName: string) => Promise<void>
	logout: (allDevices?: boolean) => Promise<void>
	setSyncEnabled: (enabled: boolean) => Promise<void>
	clearError: () => void
}

export const useAuthStore = create<AuthState>()(
	devtools(
		immer((set, get) => ({
			authenticated: false,
			syncEnabled: false,
			selfHosted: false,
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

			loadPreferences: async () => {
				try {
					const platform = getPlatform()
					const [storedUrl, storedSyncEnabled, storedSelfHosted] = await Promise.all([
						platform.keychain.get(SERVER_URL_KEYCHAIN_KEY),
						platform.keychain.get(SYNC_ENABLED_KEY),
						platform.keychain.get(SELF_HOSTED_KEY),
					])
					set((state) => {
						if (storedUrl) state.serverUrl = storedUrl
						state.syncEnabled = storedSyncEnabled === "true"
						state.selfHosted = storedSelfHosted === "true"
					})
				} catch {}
			},

			loadServerUrl: async () => {
				await get().loadPreferences()
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

			setSelfHosted: async (selfHosted: boolean) => {
				try {
					const platform = getPlatform()
					await platform.keychain.set(SELF_HOSTED_KEY, String(selfHosted))
					set((state) => {
						state.selfHosted = selfHosted
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
					const { useVaultStore } = await import("./vaultStore")
					const { vault } = useVaultStore.getState()
					if (vault?.path) {
						const { useRemoteVaultStore } = await import("./remoteVaultStore")
						const { linkedVaultId } = useRemoteVaultStore.getState()
						if (linkedVaultId) {
							await useRemoteVaultStore.getState().unlinkVault(vault.path)
						}
					}
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
					const { useSyncStore } = await import("./syncStore")
					await useSyncStore.getState().stopSync()
					const platform = getPlatform()
					await platform.auth.logout(allDevices)
					const { useRemoteVaultStore } = await import("./remoteVaultStore")
					const { useVaultStore } = await import("./vaultStore")
					const { vault } = useVaultStore.getState()
					if (vault?.path) {
						await useRemoteVaultStore.getState().unlinkVault(vault.path)
					} else {
						useRemoteVaultStore.getState().clearLink()
					}
				} finally {
					try {
						await getPlatform().keychain.set(SYNC_ENABLED_KEY, "false")
					} catch {}
					set((state) => {
						state.authenticated = false
						state.syncEnabled = false
						state.user = null
						state.error = null
					})
				}
			},

			setSyncEnabled: async (enabled: boolean) => {
				try {
					const platform = getPlatform()
					await platform.keychain.set(SYNC_ENABLED_KEY, String(enabled))
				} catch {}
				set((state) => {
					state.syncEnabled = enabled
				})
			},

			clearError: () =>
				set((state) => {
					state.error = null
				}),
		})),
		{ name: "authStore" },
	),
)
