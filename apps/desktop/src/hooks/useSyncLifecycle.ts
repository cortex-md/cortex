import {
	useAuthStore,
	useRemoteVaultStore,
	useSyncLogStore,
	useSyncStore,
	useVaultStore,
} from "@cortex/core"
import { useEffect, useRef } from "react"

export function useSyncLifecycle() {
	const vault = useVaultStore((s) => s.vault)
	const authenticated = useAuthStore((s) => s.authenticated)
	const authServerUrl = useAuthStore((s) => s.serverUrl)
	const checkAuth = useAuthStore((s) => s.checkAuth)
	const { linkedVaultId, loadLink, syncConfig } = useRemoteVaultStore()
	const { startSync, stopSync } = useSyncStore()

	const syncActiveRef = useRef(false)

	useEffect(() => {
		if (!vault) {
			loadLink("")
			return
		}
		loadLink(vault.path)
	}, [vault, loadLink])

	useEffect(() => {
		if (syncConfig.serverUrl) {
			checkAuth(syncConfig.serverUrl)
		}
	}, [syncConfig.serverUrl, checkAuth])

	useEffect(() => {
		const serverUrl = syncConfig.serverUrl ?? ""
		const canSync =
			authenticated &&
			authServerUrl === serverUrl &&
			syncConfig.enabled &&
			vault !== null &&
			linkedVaultId !== null &&
			serverUrl !== ""

		if (canSync) {
			if (!syncActiveRef.current) {
				syncActiveRef.current = true
				useSyncLogStore.getState().log("info", "Sync lifecycle: starting sync", {
					serverUrl,
					vaultId: linkedVaultId!,
				})
				startSync(linkedVaultId!, vault!.path, serverUrl)
			}
		} else {
			if (syncActiveRef.current) {
				syncActiveRef.current = false
				useSyncLogStore.getState().log("info", "Sync lifecycle: stopping sync")
				stopSync()
			}
		}
	}, [
		authenticated,
		authServerUrl,
		syncConfig.enabled,
		syncConfig.serverUrl,
		vault,
		linkedVaultId,
		startSync,
		stopSync,
	])

	useEffect(() => {
		return () => {
			if (syncActiveRef.current) {
				syncActiveRef.current = false
				stopSync()
			}
		}
	}, [stopSync])
}
