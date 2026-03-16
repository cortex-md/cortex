"use client"

import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	Kbd,
} from "@cortex/ui"
import { BookMarkedIcon, Search } from "lucide-react"
import { useEffect, useState } from "react"
import type { DocsDocumentMetadata } from "@/lib/docs-registry"

interface SearchProps {
	docs: DocsDocumentMetadata[]
}

export function SearchDoc({ docs }: SearchProps) {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen((prev) => !prev)
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => {
			window.removeEventListener("keydown", handleKeyDown)
		}
	}, [])

	return (
		<div className="flex flex-col gap-4">
			<InputGroup className="min-w-sm max-w-xl" onClick={() => setOpen(true)}>
				<InputGroupInput disabled placeholder="Search..." />
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupAddon align="inline-end">
					<Kbd>
						<span>⌘</span>
						<span>K</span>
					</Kbd>
				</InputGroupAddon>
			</InputGroup>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<Command className="min-h-80 min-w-4xl rounded-xl">
					<CommandInput className="px-4" placeholder="Search..." />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup heading="Navigation" className="px-2 py-4">
							{docs.map((doc) => (
								<CommandItem className="px-4 mb-2" key={doc.slug}>
									<BookMarkedIcon className="mr-3 h-5 w-5" />
									<span>{doc.title}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</CommandDialog>
		</div>
	)
}
