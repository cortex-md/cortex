import { useEditorStore, useTagsStore, useUIStore, useVaultStore } from "@cortex/core"
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Input,
} from "@cortex/ui"
import { CheckIcon, PlusIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

function TagDot({ color }: { color: string | null }) {
	if (!color) return null
	return (
		<span
			className="inline-block size-2.5 rounded-full flex-shrink-0"
			style={{ backgroundColor: color }}
		/>
	)
}

export function TagPicker() {
	const { tagPickerOpen, toggleTagPicker } = useUIStore()
	const { activeFilePath } = useEditorStore()
	const vault = useVaultStore((s) => s.vault)
	const { getAllTags, getTagsForFile, getTagColor, setTagColor, addTagToFile, removeTagFromFile } =
		useTagsStore()
	const [inputValue, setInputValue] = useState("")
	const [editingColorFor, setEditingColorFor] = useState<string | null>(null)

	const allTags = getAllTags()
	// biome-ignore lint/correctness/useExhaustiveDependencies: recompute when picker opens
	const currentTags = useMemo(() => {
		if (!activeFilePath) return []
		return getTagsForFile(activeFilePath)
	}, [activeFilePath, getTagsForFile, tagPickerOpen])

	const closeModal = useCallback(() => {
		toggleTagPicker()
		setInputValue("")
		setEditingColorFor(null)
	}, [toggleTagPicker])

	const handleToggleTag = useCallback(
		async (tag: string) => {
			if (!activeFilePath) return
			if (currentTags.includes(tag)) {
				await removeTagFromFile(activeFilePath, tag)
			} else {
				await addTagToFile(activeFilePath, tag)
			}
		},
		[activeFilePath, currentTags, addTagToFile, removeTagFromFile],
	)

	const handleCreateTag = useCallback(async () => {
		if (!activeFilePath || !inputValue.trim()) return
		const newTag = inputValue.trim().toLowerCase()
		await addTagToFile(activeFilePath, newTag)
		setInputValue("")
		closeModal()
	}, [activeFilePath, inputValue, addTagToFile, closeModal])

	const handleColorChange = useCallback(
		(tag: string, color: string) => {
			if (!vault) return
			setTagColor(vault.path, tag, color || null)
		},
		[vault, setTagColor],
	)

	if (!activeFilePath) return null

	const inputMatchesExisting = allTags.some(
		(t) => t.tag.toLowerCase() === inputValue.trim().toLowerCase(),
	)

	return (
		<CommandDialog
			open={tagPickerOpen}
			onOpenChange={(open) => {
				if (!open) closeModal()
			}}
			title="Tag Picker"
			description="Add or remove tags from the current note"
			showCloseButton={false}
		>
			<CommandInput
				placeholder="Search or create tag..."
				value={inputValue}
				onValueChange={setInputValue}
			/>
			<CommandList>
				<CommandEmpty className="py-4">
					{inputValue.trim() && !inputMatchesExisting ? (
						<button
							type="button"
							className="flex items-center gap-2 mx-auto text-sm text-brand hover:text-brand/80 transition-colors"
							onClick={handleCreateTag}
						>
							<PlusIcon className="size-3.5" />
							Create tag "{inputValue.trim()}"
						</button>
					) : (
						<span className="text-sm text-muted-foreground">No tags found</span>
					)}
				</CommandEmpty>

				{inputValue.trim() && !inputMatchesExisting && allTags.length > 0 && (
					<CommandGroup>
						<CommandItem onSelect={handleCreateTag} value={`create:${inputValue}`}>
							<PlusIcon className="size-4 text-brand" />
							<span>
								Create tag "<span className="font-medium">{inputValue.trim()}</span>"
							</span>
						</CommandItem>
					</CommandGroup>
				)}

				{allTags.length > 0 && (
					<CommandGroup heading="Tags">
						{allTags.map((entry) => {
							const isActive = currentTags.includes(entry.tag)
							return (
								<CommandItem
									key={entry.tag}
									value={entry.tag}
									onSelect={() => handleToggleTag(entry.tag)}
								>
									<TagDot color={entry.color} />
									<span className="flex-1">{entry.tag}</span>
									<button
										type="button"
										className="size-4 rounded-sm border border-border/60 flex-shrink-0 cursor-pointer hover:border-border"
										style={{ backgroundColor: entry.color ?? "transparent" }}
										title="Set tag color"
										onClick={(e) => {
											e.stopPropagation()
											setEditingColorFor(editingColorFor === entry.tag ? null : entry.tag)
										}}
									/>
									<span className="text-xs text-muted-foreground">{entry.filePaths.length}</span>
									{isActive && <CheckIcon className="size-4 text-brand" />}
								</CommandItem>
							)
						})}
					</CommandGroup>
				)}

				{editingColorFor && (
					<div className="px-3 py-2 border-t border-border flex items-center gap-2">
						<span className="text-xs text-muted-foreground">Color for {editingColorFor}:</span>
						<Input
							type="color"
							value={getTagColor(editingColorFor) ?? "#e8a83c"}
							onChange={(e) => handleColorChange(editingColorFor, e.target.value)}
							className="w-8 h-6 p-0 border-none cursor-pointer rounded-sm"
						/>
						<button
							type="button"
							className="text-[10px] text-muted-foreground hover:text-text-primary transition-colors"
							onClick={() => {
								if (vault) setTagColor(vault.path, editingColorFor, null)
								setEditingColorFor(null)
							}}
						>
							Clear
						</button>
					</div>
				)}
			</CommandList>
		</CommandDialog>
	)
}
