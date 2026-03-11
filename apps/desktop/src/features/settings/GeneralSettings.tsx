import type { GeneralSettings } from "@cortex/settings"
import { Label, Switch } from "@cortex/ui"
import type { UpdateSettingFn } from "."

interface GeneralSectionProps {
	settings: GeneralSettings
	onUpdate: UpdateSettingFn
}

export function GeneralSection({ settings, onUpdate }: GeneralSectionProps) {
	return (
		<section>
			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Startup
				</h3>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="auto-open-vault" className="flex-1">
						Open last vault on startup
					</Label>
					<Switch
						id="auto-open-vault"
						checked={settings.autoOpenLastVault}
						onCheckedChange={(checked) => onUpdate("general", "autoOpenLastVault", checked)}
					/>
				</div>
			</div>
		</section>
	)
}
