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
	const selfHosted = useAuthStore((s) => s.selfHosted)
	const syncEnabled = useAuthStore((s) => s.syncEnabled)
	const serverUrl = useAuthStore((s) => s.serverUrl)
	const { linkedVaultId, loadLink } = useRemoteVaultStore()
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
		const hasAuth = authenticated || selfHosted
		const canSync =
			hasAuth && syncEnabled && vault !== null && linkedVaultId !== null && serverUrl !== ""

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
	}, [authenticated, selfHosted, syncEnabled, vault, linkedVaultId, serverUrl, startSync, stopSync])

	useEffect(() => {
		return () => {
			if (syncActiveRef.current) {
				syncActiveRef.current = false
				stopSync()
			}
		}
	}, [stopSync])
}
