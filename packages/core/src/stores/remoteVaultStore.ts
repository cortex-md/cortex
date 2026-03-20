import type { RemoteVaultInfo } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface RemoteVaultState {
	remoteVaults: RemoteVaultInfo[]
	linkedVaultId: string | null
	loading: boolean
	error: string | null

	fetchRemoteVaults: () => Promise<void>
	createRemoteVault: (name: string, description: string | null) => Promise<RemoteVaultInfo>
	updateRemoteVault: (
		vaultId: string,
		name: string | null,
		description: string | null,
	) => Promise<void>
	deleteRemoteVault: (vaultId: string) => Promise<void>
	linkVault: (vaultPath: string, remoteVaultId: string) => Promise<void>
	unlinkVault: (vaultPath: string) => Promise<void>
	loadLink: (vaultPath: string) => Promise<void>
	clearLink: () => void
	clearError: () => void
}

export const useRemoteVaultStore = create<RemoteVaultState>()(
	devtools(
		immer((set, _get) => ({
			remoteVaults: [],
			linkedVaultId: null,
			loading: false,
			error: null,

			fetchRemoteVaults: async () => {
				set((state) => {
					state.loading = true
					state.error = null
				})
				try {
					const platform = getPlatform()
					const vaults = await platform.remoteVault.list()
					set((state) => {
						state.remoteVaults = vaults
						state.loading = false
					})
				} catch (e) {
					set((state) => {
						state.loading = false
						state.error = String(e)
					})
				}
			},

			createRemoteVault: async (name, description) => {
				const platform = getPlatform()
				const vault = await platform.remoteVault.create(name, description)
				set((state) => {
					state.remoteVaults.push(vault)
				})
				return vault
			},

			updateRemoteVault: async (vaultId, name, description) => {
				const platform = getPlatform()
				const updated = await platform.remoteVault.update(vaultId, name, description)
				set((state) => {
					const index = state.remoteVaults.findIndex((v) => v.id === vaultId)
					if (index !== -1) {
						state.remoteVaults[index] = updated
					}
				})
			},

			deleteRemoteVault: async (vaultId) => {
				const platform = getPlatform()
				await platform.remoteVault.delete(vaultId)
				set((state) => {
					state.remoteVaults = state.remoteVaults.filter((v) => v.id !== vaultId)
					if (state.linkedVaultId === vaultId) {
						state.linkedVaultId = null
					}
				})
			},

			linkVault: async (vaultPath, remoteVaultId) => {
				const platform = getPlatform()
				await platform.remoteVault.link(vaultPath, remoteVaultId)
				set((state) => {
					state.linkedVaultId = remoteVaultId
				})
			},

			unlinkVault: async (vaultPath) => {
				const platform = getPlatform()
				await platform.remoteVault.unlink(vaultPath)
				set((state) => {
					state.linkedVaultId = null
				})
			},

			loadLink: async (vaultPath) => {
				try {
					const platform = getPlatform()
					const linkedId = await platform.remoteVault.getLink(vaultPath)
					set((state) => {
						state.linkedVaultId = linkedId
					})
				} catch {
					set((state) => {
						state.linkedVaultId = null
					})
				}
			},

			clearLink: () =>
				set((state) => {
					state.linkedVaultId = null
				}),

			clearError: () =>
				set((state) => {
					state.error = null
				}),
		})),
		{ name: "remoteVaultStore" },
	),
)
