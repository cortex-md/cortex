import type { FileEntry, VaultMetadata, VaultRegistryEntry } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { getSettingsManager, initSettingsManager } from "@cortex/settings"
import { create } from "zustand"
import { noteCache } from "../noteCache"

export type { VaultMetadata, VaultRegistryEntry }

export interface VaultState {
	vault: VaultMetadata | null
	files: FileEntry[]
	recentVaults: VaultRegistryEntry[]
	loading: boolean
	error: string | null
	stopWatcher: (() => void) | null

	openVault: (path: string) => Promise<void>
	closeVault: () => Promise<void>
	refreshFiles: () => Promise<void>
	loadRecentVaults: () => Promise<void>
}

export const useVaultStore = create<VaultState>((set, get) => ({
	vault: null,
	files: [],
	recentVaults: [],
	loading: false,
	error: null,
	stopWatcher: null,

	openVault: async (path: string) => {
		const platform = getPlatform()
		set({ loading: true, error: null })
		try {
			const metadata = await platform.vault.openVault(path)
			await platform.vault.updateVaultRegistry(metadata.uuid, metadata.path, metadata.name)
			const files = await platform.vault.scanVault(path)

			const stopWatcher = await platform.fs.startWatching(path, async (event) => {
				get().refreshFiles()
				const hash = await platform.fs.hashFile(event.path)
				await noteCache.handleExternalChange(event.path, hash)
			})

			initSettingsManager()
			await getSettingsManager().loadFromVault(path)

			set({
				vault: metadata,
				files,
				loading: false,
				stopWatcher,
			})
		} catch (e) {
			set({ loading: false, error: String(e) })
		}
	},

	closeVault: async () => {
		const { stopWatcher } = get()
		stopWatcher?.()
		await getSettingsManager().flush()
		set({
			vault: null,
			files: [],
			stopWatcher: null,
			error: null,
		})
	},

	refreshFiles: async () => {
		const { vault } = get()
		if (!vault) return
		try {
			const files = await getPlatform().vault.scanVault(vault.path)
			set({ files })
		} catch (_e) {}
	},

	loadRecentVaults: async () => {
		try {
			const entries = await getPlatform().vault.readVaultRegistry()
			const sorted = [...entries].sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0))
			set({ recentVaults: sorted })
		} catch (_e) {}
	},
}))
