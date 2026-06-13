import { useVaultStore } from "@cortex/core"
import { formatHotkeyDisplay, useHotkeysStore } from "@cortex/hotkeys"
import { Button, InputGroup, InputGroupAddon, InputGroupInput, Kbd } from "@cortex/ui"
import { RotateCcwIcon, SearchIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	SettingsEmptyState,
	SettingsGroup,
	SettingsGroupContent,
	SettingsList,
	SettingsListItem,
	SettingsPage,
	SettingsSection,
} from "./SettingsPrimitives"

function HotkeyRecorder({
	currentKeys,
	onRecord,
}: {
	currentKeys: string
	onRecord: (keys: string) => void
}) {
	const [recording, setRecording] = useState(false)
	const recorderRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (!recording) return

		const handleKeyDown = (e: KeyboardEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (e.key === "Escape") {
				setRecording(false)
				return
			}

			const parts: string[] = []
			if (e.metaKey || e.ctrlKey) parts.push("mod")
			if (e.shiftKey) parts.push("shift")
			if (e.altKey) parts.push("alt")

			const key = e.key.toLowerCase()
			if (!["control", "shift", "alt", "meta"].includes(key)) {
				parts.push(key === " " ? "space" : key)
				const hotkeyString = parts.join("+")
				onRecord(hotkeyString)
				setRecording(false)
			}
		}

		window.addEventListener("keydown", handleKeyDown, true)
		return () => window.removeEventListener("keydown", handleKeyDown, true)
	}, [recording, onRecord])

	if (recording) {
		return (
			<Button
				ref={recorderRef}
				variant="outline"
				size="sm"
				className="min-w-[100px] text-xs text-brand border-brand/50 animate-pulse"
				onClick={() => setRecording(false)}
			>
				Press keys...
			</Button>
		)
	}

	return (
		<Button
			variant="outline"
			size="sm"
			className="min-w-[100px] text-xs"
			onClick={() => setRecording(true)}
		>
			<Kbd className="text-[10px]">{formatHotkeyDisplay(currentKeys)}</Kbd>
		</Button>
	)
}

export function HotkeysSection() {
	const { bindings, updateBinding, resetBinding, resetAll, saveOverrides } = useHotkeysStore()
	const vault = useVaultStore((s) => s.vault)
	const pendingSave = useRef(false)
	const [searchQuery, setSearchQuery] = useState("")

	const handleRecord = useCallback(
		(id: string, keys: string) => {
			updateBinding(id, keys)
			pendingSave.current = true
		},
		[updateBinding],
	)

	const handleReset = useCallback(
		(id: string) => {
			resetBinding(id)
			pendingSave.current = true
		},
		[resetBinding],
	)

	const handleResetAll = useCallback(() => {
		resetAll()
		pendingSave.current = true
	}, [resetAll])

	// biome-ignore lint/correctness/useExhaustiveDependencies: save when bindings change
	useEffect(() => {
		if (!pendingSave.current || !vault) return
		pendingSave.current = false
		saveOverrides(vault.path)
	}, [bindings, vault, saveOverrides])

	const filtered = useMemo(() => {
		const query = searchQuery.toLowerCase().trim()
		if (!query) return bindings.filter((b) => b.category !== "QuickFinder")
		return bindings
			.filter((b) => b.category !== "QuickFinder")
			.filter((binding) => {
				const labelMatch = binding.label.toLowerCase().includes(query)
				const categoryMatch = binding.category.toLowerCase().includes(query)
				const keysMatch = binding.keys.toLowerCase().includes(query)
				const displayMatch = formatHotkeyDisplay(binding.keys).toLowerCase().includes(query)
				return labelMatch || categoryMatch || keysMatch || displayMatch
			})
	}, [bindings, searchQuery])

	const categories = Array.from(new Set(filtered.map((b) => b.category)))
	const grouped = categories.map((category) => ({
		category,
		items: filtered.filter((b) => b.category === category),
	}))

	return (
		<SettingsPage>
			<SettingsSection
				title="Keyboard shortcuts"
				description="Search, record, and reset command bindings for this vault."
				action={
					<Button variant="ghost" size="sm" onClick={handleResetAll}>
						<RotateCcwIcon className="size-3" />
						Reset All
					</Button>
				}
			>
				<SettingsGroup>
					<SettingsGroupContent className="flex flex-col gap-4">
						<InputGroup variant="search">
							<InputGroupAddon>
								<SearchIcon />
							</InputGroupAddon>
							<InputGroupInput
								placeholder="Search shortcuts..."
								value={searchQuery}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setSearchQuery(e.target.value)
								}
							/>
						</InputGroup>

						{grouped.length === 0 && searchQuery && (
							<SettingsEmptyState className="text-center">
								No shortcuts matching "{searchQuery}"
							</SettingsEmptyState>
						)}

						{grouped.map(({ category, items }) => (
							<div key={category} className="flex flex-col gap-2">
								<h4 className="m-0 text-sm font-medium text-foreground">{category}</h4>
								<SettingsList>
									{items.map((binding) => {
										const isModified = binding.keys !== binding.defaultKeys
										return (
											<SettingsListItem
												key={binding.id}
												className="justify-between hover:bg-bg-hover"
											>
												<span className="text-sm text-text-primary">{binding.label}</span>
												<div className="flex items-center gap-2">
													<HotkeyRecorder
														currentKeys={binding.keys}
														onRecord={(keys) => handleRecord(binding.id, keys)}
													/>
													{isModified && (
														<Button
															variant="ghost"
															size="sm"
															className="text-xs text-muted-foreground h-7 w-7 p-0"
															onClick={() => handleReset(binding.id)}
															title="Reset to default"
														>
															<RotateCcwIcon className="size-3" />
														</Button>
													)}
												</div>
											</SettingsListItem>
										)
									})}
								</SettingsList>
							</div>
						))}
					</SettingsGroupContent>
				</SettingsGroup>
			</SettingsSection>
		</SettingsPage>
	)
}
