"use client"

import { FileIcon, FolderIcon } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Input } from "./input"
import { nativeGlassSurface } from "./lib/native-styles"
import { cn } from "./lib/utils"

export interface FolderPickerOption {
	value: string
	label: string
	isDir: boolean
}

interface FolderPickerProps {
	options: FolderPickerOption[]
	value: string
	onChange: (value: string) => void
	placeholder?: string
	className?: string
}

export function FolderPicker({
	options,
	value,
	onChange,
	placeholder = "Search folders...",
	className,
}: FolderPickerProps) {
	const [search, setSearch] = useState("")
	const [dropdownOpen, setDropdownOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const filteredOptions = useMemo(() => {
		if (!search.trim()) return options
		const lower = search.toLowerCase()
		return options.filter((option) => option.label.toLowerCase().includes(lower))
	}, [options, search])

	const handleSelect = useCallback(
		(optionValue: string) => {
			onChange(optionValue)
			setSearch("")
			setDropdownOpen(false)
			inputRef.current?.blur()
		},
		[onChange],
	)

	const selectedLabel = options.find((o) => o.value === value)?.label

	return (
		<div className={cn("relative", className)}>
			<Input
				ref={inputRef}
				value={dropdownOpen ? search : (selectedLabel ?? "")}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
					setSearch(e.target.value)
					setDropdownOpen(true)
				}}
				onFocus={() => {
					setSearch("")
					setDropdownOpen(true)
				}}
				onBlur={() => {
					setTimeout(() => setDropdownOpen(false), 150)
				}}
				placeholder={placeholder}
			/>
			{dropdownOpen && filteredOptions.length > 0 && (
				<div
					className={cn(
						"absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-[10px] p-1",
						nativeGlassSurface,
					)}
				>
					{filteredOptions.map((option) => (
						<button
							key={option.value}
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => handleSelect(option.value)}
							className="flex items-center gap-2 w-full rounded-[6px] px-2 py-1.5 text-[13px] text-left hover:bg-accent/70"
						>
							{option.isDir ? (
								<FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
							) : (
								<FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
							)}
							<span className="truncate">{option.label}</span>
						</button>
					))}
				</div>
			)}
			{dropdownOpen && search.trim() && filteredOptions.length === 0 && (
				<div className={cn("absolute z-50 mt-1 w-full rounded-[10px] p-1", nativeGlassSurface)}>
					<p className="px-3 py-2 text-[13px] text-muted-foreground text-center">
						No matching folders
					</p>
				</div>
			)}
		</div>
	)
}
