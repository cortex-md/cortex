import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	cn,
} from "@cortex/ui"
import { FileIcon, FolderIcon, PlusIcon } from "lucide-react"
import { useMemo, useState } from "react"

export interface PathPatternPickerOption {
	value: string
	label: string
	isDir: boolean
}

interface SelectablePathPattern extends PathPatternPickerOption {
	custom?: boolean
}

interface PathPatternPickerProps {
	options: PathPatternPickerOption[]
	onSelect: (value: string) => void
	placeholder?: string
	allowCustomValue?: boolean
	getCustomValueLabel?: (value: string) => string
	className?: string
}

export function PathPatternPicker({
	options,
	onSelect,
	placeholder = "Search files and folders",
	allowCustomValue = false,
	getCustomValueLabel = (value) => `Add pattern "${value}"`,
	className,
}: PathPatternPickerProps) {
	const [query, setQuery] = useState("")
	const trimmedQuery = query.trim()

	const matchingOptions = useMemo(() => {
		if (!trimmedQuery) return options
		const normalizedQuery = trimmedQuery.toLowerCase()
		return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
	}, [options, trimmedQuery])

	const customOption = useMemo<SelectablePathPattern | null>(() => {
		if (!allowCustomValue || !trimmedQuery) return null
		const exactMatch = options.some(
			(option) => option.value === trimmedQuery || option.label === trimmedQuery,
		)
		if (exactMatch) return null
		return {
			value: trimmedQuery,
			label: getCustomValueLabel(trimmedQuery),
			isDir: trimmedQuery.replace(/^!/, "").endsWith("/"),
			custom: true,
		}
	}, [allowCustomValue, getCustomValueLabel, options, trimmedQuery])

	const handleSelect = (option: SelectablePathPattern | null) => {
		if (!option) return
		onSelect(option.value)
		setQuery("")
	}

	return (
		<Combobox<SelectablePathPattern>
			value={null}
			inputValue={query}
			onInputValueChange={setQuery}
			onValueChange={handleSelect}
			filter={null}
			autoHighlight={false}
			itemToStringLabel={(option) => option.label}
			itemToStringValue={(option) => option.value}
		>
			<ComboboxInput
				aria-label={placeholder}
				placeholder={placeholder}
				showClear={Boolean(query)}
				className={cn("w-full", className)}
			/>
			<ComboboxContent>
				<ComboboxList>
					{matchingOptions.map((option) => (
						<ComboboxItem key={option.value} value={option}>
							{option.isDir ? <FolderIcon /> : <FileIcon />}
							<span className="min-w-0 flex-1 truncate">{option.label}</span>
						</ComboboxItem>
					))}
					{customOption && (
						<ComboboxItem value={customOption}>
							<PlusIcon />
							<span className="min-w-0 flex-1 truncate">{customOption.label}</span>
						</ComboboxItem>
					)}
					<ComboboxEmpty>No matching files or folders</ComboboxEmpty>
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	)
}
