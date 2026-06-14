import {
	useAuthStore,
	useDevicesStore,
	useRemoteVaultStore,
	useSyncStore,
	useVaultStore,
} from "@cortex/core"
import { useEffect, useMemo } from "react"
import type { SyncSettingsView } from "./types"

export function useSyncOverview(view: SyncSettingsView) {
	const authenticated = useAuthStore((state) => state.authenticated)
	const vault = useVaultStore((state) => state.vault)
	const files = useVaultStore((state) => state.files)
	const linkedVaultId = useRemoteVaultStore((state) => state.linkedVaultId)
	const remoteVaults = useRemoteVaultStore((state) => state.remoteVaults)
	const loadLink = useRemoteVaultStore((state) => state.loadLink)
	const fetchRemoteVaults = useRemoteVaultStore((state) => state.fetchRemoteVaults)
	const syncConfig = useRemoteVaultStore((state) => state.syncConfig)
	const engineState = useSyncStore((state) => state.engineState)
	const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt)
	const deviceEntries = useDevicesStore((state) => state.deviceEntries)
	const devicesLoading = useDevicesStore((state) => state.loading)
	const devicesError = useDevicesStore((state) => state.error)
	const fetchDevices = useDevicesStore((state) => state.fetchDevices)

	useEffect(() => {
		if (vault?.path) void loadLink(vault.path)
	}, [loadLink, vault?.path])

	useEffect(() => {
		if (authenticated && syncConfig.enabled) void fetchRemoteVaults()
	}, [authenticated, fetchRemoteVaults, syncConfig.enabled])

	useEffect(() => {
		if (
			view === "overview" &&
			authenticated &&
			syncConfig.enabled &&
			linkedVaultId &&
			deviceEntries.length === 0 &&
			!devicesLoading &&
			!devicesError
		) {
			void fetchDevices()
		}
	}, [
		authenticated,
		deviceEntries.length,
		devicesError,
		devicesLoading,
		fetchDevices,
		linkedVaultId,
		syncConfig.enabled,
		view,
	])

	const linkedVault = remoteVaults.find((remoteVault) => remoteVault.id === linkedVaultId)
	const noteCount = useMemo(
		() => files.filter((file) => !file.isDir && file.name.toLowerCase().endsWith(".md")).length,
		[files],
	)
	const connectedDeviceCount = useMemo(
		() => deviceEntries.filter((device) => !device.revoked).length,
		[deviceEntries],
	)

	return {
		authenticated,
		connectedDeviceCount,
		devicesLoading,
		engineState,
		lastSyncedAt,
		linkedVault,
		linkedVaultId,
		noteCount,
		syncConfig,
		vault,
	}
}
