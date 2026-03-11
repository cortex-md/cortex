import { useVaultStore } from "@cortex/core"
import {
	Button,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Field,
	FieldGroup,
	type IconName,
	IconPicker,
	Input,
	Label,
} from "@cortex/ui"
import { type FormEvent, useState } from "react"

interface CreateVaultModalProps {
	open: boolean
	folderPath: string
	onOpenChange: (open: boolean) => void
}

export function CreateVaultModal({ open, folderPath, onOpenChange }: CreateVaultModalProps) {
	const { openVault } = useVaultStore()
	const defaultName = folderPath.split("/").pop() || "My Vault"

	const [name, setName] = useState(defaultName)
	const [color, setColor] = useState("#e8a83c")
	const [icon, setIcon] = useState<IconName | undefined>(undefined)

	const handleIconChange = (value: IconName) => {
		setIcon(value)
	}

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		await openVault(folderPath, {
			icon: icon ?? undefined,
			color,
			name,
		})
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create new vault</DialogTitle>
					<DialogDescription>Customize your vault the way you want.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<Label htmlFor="vault-name">Name</Label>
							<Input
								id="vault-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Second brain"
							/>
						</Field>
						<div className="grid grid-cols-2 gap-4">
							<Field>
								<Label htmlFor="vault-color">Color</Label>
								<Input
									id="vault-color"
									type="color"
									value={color}
									onChange={(e) => setColor(e.target.value)}
								/>
							</Field>
							<Field>
								<Label>Icon</Label>
								<IconPicker value={icon} onValueChange={handleIconChange} />
							</Field>
						</div>
					</FieldGroup>
					<DialogFooter className="mt-4">
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button type="submit">Create vault</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
