import { useAuthStore, useRemoteVaultStore, useSyncStore, useVaultStore } from "@cortex/core"
import { useEffect, useRef } from "react"

export function useSyncLifecycle() {
	const vault = useVaultStore((s) => s.vault)
	const authenticated = useAuthStore((s) => s.authenticated)
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
		const canSync = authenticated && vault !== null && linkedVaultId !== null && serverUrl !== ""

		if (canSync) {
			if (!syncActiveRef.current) {
				syncActiveRef.current = true
				startSync(linkedVaultId!, vault!.path, serverUrl)
			}
		} else {
			if (syncActiveRef.current) {
				syncActiveRef.current = false
				stopSync()
			}
		}
	}, [authenticated, vault, linkedVaultId, serverUrl, startSync, stopSync])

	useEffect(() => {
		return () => {
			if (syncActiveRef.current) {
				syncActiveRef.current = false
				stopSync()
			}
		}
	}, [stopSync])
}
