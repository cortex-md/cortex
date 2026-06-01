import { useUIStore, useVaultStore } from "@cortex/core"
import type { OpenSettingsWindowOptions } from "@cortex/platform"
import { useSettingsStore } from "@cortex/settings"
import { listen } from "@tauri-apps/api/event"
import { useEffect, useState } from "react"
import { AuthModal } from "../auth/AuthModal"
import { SettingsContent } from "./SettingsModal"

function readRoute(): OpenSettingsWindowOptions {
	const params = new URLSearchParams(window.location.search)
	return {
		section: params.get("section"),
		marketplaceTab: params.get("marketplaceTab") as OpenSettingsWindowOptions["marketplaceTab"],
		vaultPath: params.get("vaultPath"),
		vaultName: params.get("vaultName"),
	}
}

export function SettingsWindow() {
	const [route, setRoute] = useState<OpenSettingsWindowOptions>(() => readRoute())
	const loadVaultSnapshot = useVaultStore((s) => s.loadVaultSnapshot)
	const loadSettings = useSettingsStore((s) => s.loadSettings)
	const closeSettings = useUIStore((s) => s.closeSettings)

	useEffect(() => {
		closeSettings()
	}, [closeSettings])

	useEffect(() => {
		const vaultPath = route.vaultPath
		if (!vaultPath) return
		loadVaultSnapshot(vaultPath).then(() => loadSettings(vaultPath))
	}, [route.vaultPath, loadVaultSnapshot, loadSettings])

	useEffect(() => {
		const unlisten = listen<OpenSettingsWindowOptions>("settings-route", (event) => {
			setRoute((current) => ({ ...current, ...event.payload }))
		})
		return () => {
			unlisten.then((fn) => fn())
		}
	}, [])

	return (
		<div className="settings-window app-shell h-screen bg-bg-primary text-text-primary">
			<SettingsContent
				fullHeight
				initialSection={route.section}
				initialMarketplaceTab={route.marketplaceTab}
			/>
			<AuthModal />
		</div>
	)
}
