import { useVaultStore } from "@cortex/core"
import { formatHotkeyDisplay, useHotkeysStore } from "@cortex/hotkeys"
import { Button, Input, Kbd } from "@cortex/ui"
import { RotateCcwIcon, SearchIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
		<section>
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-[10px] font-bold m-0 text-text-muted uppercase tracking-wide">
					Keyboard Shortcuts
				</h3>
				<Button variant="ghost" size="sm" className="text-xs" onClick={handleResetAll}>
					<RotateCcwIcon className="size-3" />
					Reset All
				</Button>
			</div>

			<div className="relative mb-4">
				<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
				<Input
					placeholder="Search shortcuts..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-8 h-8 text-sm"
				/>
			</div>

			{grouped.length === 0 && searchQuery && (
				<p className="text-sm text-muted-foreground text-center py-6">
					No shortcuts matching "{searchQuery}"
				</p>
			)}

			{grouped.map(({ category, items }) => (
				<div key={category} className="mb-5">
					<h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2">
						{category}
					</h4>
					<div className="space-y-1">
						{items.map((binding) => {
							const isModified = binding.keys !== binding.defaultKeys
							return (
								<div
									key={binding.id}
									className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-bg-hover"
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
								</div>
							)
						})}
					</div>
				</div>
			))}
		</section>
	)
}
