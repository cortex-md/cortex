import { useSyncStore } from "@cortex/core"
import { Switch } from "@cortex/ui"
import { ExcludedPathsSettings } from "../ExcludedPathsSettings"
import { SettingsField, SettingsGroup, SettingsPage, SettingsSection } from "../SettingsPrimitives"
import { SignedOutNotice, SyncDisabledNotice } from "./SyncNotices"

function SyncPreferencesSection() {
	const syncPreferences = useSyncStore((state) => state.syncPreferences)
	const updateSyncPreference = useSyncStore((state) => state.updateSyncPreference)
	const preferences = [
		{ key: "ignoreImages" as const, label: "Ignore images" },
		{ key: "syncSettings" as const, label: "App settings" },
		{ key: "syncHotkeys" as const, label: "Keyboard shortcuts" },
		{ key: "syncWorkspace" as const, label: "Workspace layout" },
		{ key: "syncPluginMetadata" as const, label: "Plugin configuration" },
		{ key: "syncThemeMetadata" as const, label: "Theme configuration" },
	]
	return (
		<SettingsSection title="Content" description="Choose what sync should include for this vault.">
			<SettingsGroup>
				{preferences.map(({ key, label }) => (
					<SettingsField key={key} label={label} htmlFor={`sync-preference-${key}`}>
						<Switch
							id={`sync-preference-${key}`}
							checked={syncPreferences[key]}
							onCheckedChange={(checked) => void updateSyncPreference(key, checked)}
						/>
					</SettingsField>
				))}
			</SettingsGroup>
		</SettingsSection>
	)
}

interface SyncPreferencesPageProps {
	authenticated: boolean
	syncEnabled: boolean
}

export function SyncPreferencesPage({ authenticated, syncEnabled }: SyncPreferencesPageProps) {
	if (!authenticated) {
		return (
			<SettingsPage>
				<SignedOutNotice />
			</SettingsPage>
		)
	}
	if (!syncEnabled) {
		return (
			<SettingsPage>
				<SyncDisabledNotice description="Enable sync in the Sync page to configure content preferences." />
			</SettingsPage>
		)
	}
	return (
		<SettingsPage>
			<SyncPreferencesSection />
			<ExcludedPathsSettings />
		</SettingsPage>
	)
}
