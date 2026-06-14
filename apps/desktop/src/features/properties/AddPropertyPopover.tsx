import {
	createPropertyDefinition,
	getPropertyTypes,
	type PropertyDefinition,
	suggestProperties,
	type VaultSchema,
} from "@cortex/properties"
import {
	Button,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@cortex/ui"
import { PlusIcon, SearchIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { PropertyTypeIcon } from "./PropertyTypeIcon"

interface AddPropertyPopoverProps {
	vaultPath: string
	schema: VaultSchema
	observedProperties: PropertyDefinition[]
	onRegister(definition: PropertyDefinition): Promise<void>
}

export function AddPropertyPopover({
	vaultPath,
	schema,
	observedProperties,
	onRegister,
}: AddPropertyPopoverProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [suggestions, setSuggestions] = useState<PropertyDefinition[]>([])
	const definedKeys = useMemo(
		() => new Set(schema.properties.map((property) => property.key)),
		[schema.properties],
	)

	useEffect(() => {
		if (!open) return
		let cancelled = false
		void suggestProperties(query, vaultPath).then((nextSuggestions) => {
			if (!cancelled) {
				setSuggestions(
					nextSuggestions.filter(
						(suggestion) => suggestion.observed && !definedKeys.has(suggestion.key),
					),
				)
			}
		})
		return () => {
			cancelled = true
		}
	}, [definedKeys, open, query, vaultPath])

	const createProperty = async (type: string) => {
		const propertyType = getPropertyTypes().find((candidate) => candidate.type === type)
		const name = query.trim() || propertyType?.displayName || "Property"
		await onRegister(
			createPropertyDefinition({
				name,
				type,
				properties: schema.properties,
			}),
		)
		setQuery("")
		setOpen(false)
	}

	const visibleObserved = [
		...observedProperties.filter((property) => !definedKeys.has(property.key)),
		...suggestions,
	].filter(
		(property, index, all) =>
			all.findIndex((candidate) => candidate.key === property.key) === index,
	)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<Button
					variant="ghost"
					size="xs"
					className="note-property-add-trigger"
					onClick={() => setOpen(true)}
				>
					<PlusIcon />
					Add a property
				</Button>
			</PopoverAnchor>
			<PopoverContent
				align="start"
				side="bottom"
				sideOffset={4}
				className="note-property-popover note-property-add-popover"
			>
				<Command shouldFilter={false} className="note-property-command">
					<CommandInput
						autoFocus
						placeholder="Search or name a property..."
						value={query}
						onValueChange={setQuery}
					/>
					<CommandList>
						{visibleObserved.length > 0 && (
							<CommandGroup heading="From this vault">
								{visibleObserved.map((suggestion) => (
									<CommandItem
										key={suggestion.key}
										value={`${suggestion.name} ${suggestion.key}`}
										onSelect={() => {
											void onRegister(
												createPropertyDefinition({
													name: suggestion.name,
													key: suggestion.key,
													type: suggestion.type,
													properties: schema.properties,
												}),
											).then(() => setOpen(false))
										}}
									>
										<SearchIcon />
										<span>{suggestion.name}</span>
										<small>{suggestion.type}</small>
									</CommandItem>
								))}
							</CommandGroup>
						)}
						<CommandGroup heading="Property type">
							{getPropertyTypes().map((type) => (
								<CommandItem
									key={type.type}
									value={`${type.displayName} ${type.type}`}
									onSelect={() => void createProperty(type.type)}
								>
									<PropertyTypeIcon icon={type.icon} />
									<span>{type.displayName}</span>
								</CommandItem>
							))}
						</CommandGroup>
						<CommandEmpty>No property types found</CommandEmpty>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
