import { Button } from "@cortex/ui"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { AddPropertyPopover } from "./AddPropertyPopover"
import { PropertyRow } from "./PropertyRow"
import { useNotePropertiesPanel } from "./useNotePropertiesPanel"

interface NotePropertiesPanelProps {
	filePath: string
}

export function NotePropertiesPanel({ filePath }: NotePropertiesPanelProps) {
	const panel = useNotePropertiesPanel(filePath)
	if (!panel.vaultPath) return null

	return (
		<section className="note-properties" aria-label="Note properties">
			<div className="note-properties-header">
				<Button variant="ghost" size="xs" onClick={panel.toggleExpanded}>
					{panel.expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
					Properties
				</Button>
			</div>
			{panel.expanded && (
				<div className="note-properties-content" aria-disabled={Boolean(panel.frontmatterError)}>
					{panel.schema.properties.map((definition) => (
						<PropertyRow
							key={definition.id}
							definition={definition}
							value={panel.meta[definition.key]}
							schema={panel.schema}
							authorConfig={panel.authorConfig}
							onSetValue={panel.setValue}
							onRemoveValue={panel.removeValue}
							onUpdateDefinition={panel.updateDefinition}
							onDeleteDefinition={panel.deleteDefinition}
							onDuplicateDefinition={panel.duplicateDefinition}
						/>
					))}
					<AddPropertyPopover
						vaultPath={panel.vaultPath}
						schema={panel.schema}
						observedProperties={panel.observedProperties}
						onRegister={panel.registerProperty}
					/>
					{panel.frontmatterError && (
						<output className="note-properties-error">
							Properties are read-only until the YAML frontmatter is fixed: {panel.frontmatterError}
						</output>
					)}
					{panel.error && <output className="note-properties-error">{panel.error}</output>}
				</div>
			)}
		</section>
	)
}
