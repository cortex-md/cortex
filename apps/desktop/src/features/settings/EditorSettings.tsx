import type { EditorSettings } from "@cortex/settings"
import {
	FolderPicker,
	type FolderPickerOption,
	Input,
	Label,
	NativeSelect,
	NativeSelectOption,
	Switch,
} from "@cortex/ui"
import type { UpdateSettingFn } from "."

interface EditorSectionProps {
	settings: EditorSettings
	onUpdate: UpdateSettingFn
	vaultFolders?: FolderPickerOption[]
}

export function EditorSection({ settings, onUpdate, vaultFolders = [] }: EditorSectionProps) {
	return (
		<section>
			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Indentation
				</h3>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<label htmlFor="tab-size">Tab Size</label>
					<Input
						id="tab-size"
						type="number"
						min={1}
						max={8}
						value={settings.tabSize}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							onUpdate("editor", "tabSize", Number.parseInt(e.target.value, 10))
						}
					/>
				</div>

				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="use-spaces" className="flex-1">
						Use spaces instead of tabs
					</Label>
					<Switch
						id="use-spaces"
						checked={settings.useSpaces}
						onCheckedChange={(checked) => onUpdate("editor", "useSpaces", checked)}
					/>
				</div>
			</div>

			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Editor Behavior
				</h3>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="word-wrap" className="flex-1">
						Word wrap
					</Label>
					<Switch
						id="word-wrap"
						checked={settings.wordWrap}
						onCheckedChange={(checked) => onUpdate("editor", "wordWrap", checked)}
					/>
				</div>

				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="line-numbers" className="flex-1">
						Show line numbers
					</Label>
					<Switch
						id="line-numbers"
						checked={settings.showLineNumbers}
						onCheckedChange={(checked) => onUpdate("editor", "showLineNumbers", checked)}
					/>
				</div>

				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="auto-save" className="flex-1">
						Auto-save
					</Label>
					<Switch
						id="auto-save"
						checked={settings.autoSave}
						onCheckedChange={(checked) => onUpdate("editor", "autoSave", checked)}
					/>
				</div>
			</div>

			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Images
				</h3>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="image-storage" className="flex-1">
						Image storage location
					</Label>
					<NativeSelect
						value={settings.imageStorageLocation}
						onChange={(event) => onUpdate("editor", "imageStorageLocation", event.target.value)}
					>
						<NativeSelectOption value="same">Same folder as note</NativeSelectOption>
						<NativeSelectOption value="root">Vault root</NativeSelectOption>
						<NativeSelectOption value="custom">Custom folder</NativeSelectOption>
					</NativeSelect>
				</div>

				{settings.imageStorageLocation === "custom" && (
					<div className="px-0 py-2">
						<FolderPicker
							options={vaultFolders}
							value={settings.imageStorageCustomPath}
							onChange={(value) => onUpdate("editor", "imageStorageCustomPath", value)}
							placeholder="Select a folder..."
						/>
					</div>
				)}
			</div>
		</section>
	)
}
