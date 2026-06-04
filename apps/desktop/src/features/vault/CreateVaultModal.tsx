import {
	createDefaultSyncPreferences,
	isSyncImagePath,
	normalizeSyncPathPattern,
	shouldIgnoreSyncPath,
	useSyncStore,
	useVaultStore,
} from "@cortex/core"
import type { FileEntry, SyncPreferences } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import {
	Badge,
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
	FieldLabel,
	FolderPicker,
	type IconName,
	IconPicker,
	Input,
	Label,
	Switch,
} from "@cortex/ui"
import { FileIcon, FolderIcon, PlusIcon, XIcon } from "lucide-react"
import {
	type ChangeEvent,
	type FormEvent,
	type KeyboardEvent,
	useEffect,
	useMemo,
	useState,
} from "react"

interface CreateVaultModalProps {
	open: boolean
	folderPath: string
	onOpenChange: (open: boolean) => void
}

type CreateVaultStep = "identity" | "preferences"

function fileEntryToRelativePath(entry: FileEntry, vaultPath: string): string {
	const relative = entry.path.replace(`${vaultPath}/`, "")
	return entry.isDir ? (relative.endsWith("/") ? relative : `${relative}/`) : relative
}

export function CreateVaultModal({ open, folderPath, onOpenChange }: CreateVaultModalProps) {
	const { openVault } = useVaultStore()
	const saveSyncPreferences = useSyncStore((state) => state.saveSyncPreferences)
	const defaultName = folderPath.split("/").pop() || "My Vault"

	const [step, setStep] = useState<CreateVaultStep>("identity")
	const [name, setName] = useState(defaultName)
	const [color, setColor] = useState("#e8a83c")
	const [icon, setIcon] = useState<IconName | undefined>(undefined)
	const [files, setFiles] = useState<FileEntry[]>([])
	const [syncPreferences, setSyncPreferences] = useState<SyncPreferences>(
		createDefaultSyncPreferences,
	)
	const [patternInput, setPatternInput] = useState("")
	const [creating, setCreating] = useState(false)

	useEffect(() => {
		if (!open) return
		setStep("identity")
		setName(defaultName)
		setColor("#e8a83c")
		setIcon(undefined)
		setSyncPreferences(createDefaultSyncPreferences())
		setPatternInput("")
		getPlatform()
			.vault.scanVault(folderPath)
			.then(setFiles)
			.catch(() => setFiles([]))
	}, [open, folderPath, defaultName])

	const availableOptions = useMemo(() => {
		return files
			.map((file) => fileEntryToRelativePath(file, folderPath))
			.filter((path) => !path.startsWith(".cortex/") && path !== ".cortex")
			.filter((path) => !(syncPreferences.ignoreImages && isSyncImagePath(path)))
			.filter((path) => !shouldIgnoreSyncPath(path, syncPreferences))
			.map((path) => ({
				value: path,
				label: path,
				isDir: path.endsWith("/"),
			}))
	}, [files, folderPath, syncPreferences.ignoreImages, syncPreferences.excludedPaths])

	const updateSyncPreference = (
		key: keyof Omit<SyncPreferences, "excludedPaths">,
		value: boolean,
	) => {
		setSyncPreferences((previous) => ({ ...previous, [key]: value }))
	}

	const normalizedPatternInput = normalizeSyncPathPattern(patternInput)

	const toggleExcludedPath = (path: string, excluded: boolean) => {
		const pattern = normalizeSyncPathPattern(path)
		if (!pattern) return
		setSyncPreferences((previous) => ({
			...previous,
			excludedPaths: excluded
				? Array.from(new Set([...previous.excludedPaths, pattern]))
				: previous.excludedPaths.filter((entry) => entry !== pattern),
		}))
	}

	const handleAddPattern = () => {
		if (!normalizedPatternInput || syncPreferences.excludedPaths.includes(normalizedPatternInput)) return
		toggleExcludedPath(normalizedPatternInput, true)
		setPatternInput("")
	}

	const handlePatternKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault()
			handleAddPattern()
		}
	}

	const handleIdentitySubmit = (event: FormEvent) => {
		event.preventDefault()
		setStep("preferences")
	}

	const handleCreate = async () => {
		setCreating(true)
		try {
			await openVault(folderPath, {
				icon: icon ?? undefined,
				color,
				name,
			})
			await saveSyncPreferences(folderPath, syncPreferences)
			onOpenChange(false)
		} finally {
			setCreating(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[680px]">
				<DialogHeader>
					<DialogTitle>Create new vault</DialogTitle>
					<DialogDescription>
						{step === "identity"
							? "Customize your vault the way you want."
							: "Set sync preferences before this vault connects to any remote."}
					</DialogDescription>
				</DialogHeader>
				{step === "identity" ? (
					<form onSubmit={handleIdentitySubmit}>
						<FieldGroup>
							<Field>
								<Label htmlFor="vault-name">Name</Label>
								<Input
									id="vault-name"
									value={name}
									onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
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
										onChange={(event: ChangeEvent<HTMLInputElement>) =>
											setColor(event.target.value)
										}
									/>
								</Field>
								<Field>
									<Label>Icon</Label>
									<IconPicker value={icon} onValueChange={setIcon} />
								</Field>
							</div>
						</FieldGroup>
						<DialogFooter className="mt-4">
							<DialogClose asChild>
								<Button variant="outline">Cancel</Button>
							</DialogClose>
							<Button type="submit">Continue</Button>
						</DialogFooter>
					</form>
				) : (
					<div>
						<FieldGroup>
							<Field orientation="horizontal" className="items-center justify-between py-2">
								<FieldLabel htmlFor="new-vault-ignore-images">Ignore images</FieldLabel>
								<Switch
									id="new-vault-ignore-images"
									checked={syncPreferences.ignoreImages}
									onCheckedChange={(checked) => updateSyncPreference("ignoreImages", checked)}
								/>
							</Field>
							<Field orientation="horizontal" className="items-center justify-between py-2">
								<FieldLabel>Sync app settings</FieldLabel>
								<Switch
									checked={syncPreferences.syncSettings}
									onCheckedChange={(checked) => updateSyncPreference("syncSettings", checked)}
								/>
							</Field>
							<Field orientation="horizontal" className="items-center justify-between py-2">
								<FieldLabel>Sync workspace layout</FieldLabel>
								<Switch
									checked={syncPreferences.syncWorkspace}
									onCheckedChange={(checked) => updateSyncPreference("syncWorkspace", checked)}
								/>
							</Field>
							<Field>
								<FieldLabel>Excluded paths</FieldLabel>
								<div className="flex gap-2 mb-3">
									<Input
										value={patternInput}
										onChange={(event: ChangeEvent<HTMLInputElement>) =>
											setPatternInput(event.target.value)
										}
										onKeyDown={handlePatternKeyDown}
										placeholder="node_modules/, *.log, docs/**/*.tmp"
									/>
									<Button
										variant="secondary"
										size="sm"
										onClick={handleAddPattern}
										disabled={
											!normalizedPatternInput ||
											syncPreferences.excludedPaths.includes(normalizedPatternInput)
										}
										className="shrink-0"
									>
										<PlusIcon size={14} />
										Add
									</Button>
								</div>
								{syncPreferences.excludedPaths.length > 0 && (
									<div className="flex flex-wrap gap-1.5 mb-3">
										{syncPreferences.excludedPaths.map((path) => (
											<Badge
												key={path}
												variant="secondary"
												className="flex items-center gap-1.5 pl-2 pr-1 py-1"
											>
												{path.replace(/^!/, "").endsWith("/") ? (
													<FolderIcon className="size-3 shrink-0 text-text-muted" />
												) : (
													<FileIcon className="size-3 shrink-0 text-text-muted" />
												)}
												<span className="text-xs">{path}</span>
												<button
													type="button"
													onClick={() => toggleExcludedPath(path, false)}
													className="ml-0.5 p-0.5 rounded-sm hover:bg-bg-hover"
												>
													<XIcon className="size-3" />
												</button>
											</Badge>
										))}
									</div>
								)}
								<FolderPicker
									options={availableOptions}
									value=""
									onChange={(path) => toggleExcludedPath(path, true)}
									placeholder="Search files and folders to exclude..."
								/>
							</Field>
						</FieldGroup>
						<DialogFooter className="mt-4">
							<Button variant="ghost" onClick={() => setStep("identity")} disabled={creating}>
								Back
							</Button>
							<Button onClick={handleCreate} disabled={creating}>
								{creating ? "Creating..." : "Create vault"}
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
