import { getPropertiesRuntime } from "./runtime"
import type { NotePropertiesUiState } from "./types"

function defaultUiState(): NotePropertiesUiState {
	return { version: 1, expanded: {} }
}

function getRelativeNotePath(vaultPath: string, filePath: string): string {
	const normalizedVault = vaultPath.replaceAll("\\", "/").replace(/\/+$/, "")
	const normalizedFile = filePath.replaceAll("\\", "/")
	return normalizedFile.startsWith(`${normalizedVault}/`)
		? normalizedFile.slice(normalizedVault.length + 1)
		: normalizedFile
}

async function readUiState(vaultPath: string): Promise<NotePropertiesUiState> {
	try {
		const raw = await getPropertiesRuntime().files.readFile(`${vaultPath}/.cortex/ui-state.json`)
		const parsed = JSON.parse(raw) as Partial<NotePropertiesUiState>
		return {
			version: 1,
			expanded: parsed.expanded && typeof parsed.expanded === "object" ? parsed.expanded : {},
		}
	} catch {
		return defaultUiState()
	}
}

async function writeUiState(vaultPath: string, state: NotePropertiesUiState): Promise<void> {
	await getPropertiesRuntime().files.atomicWriteFile(
		`${vaultPath}/.cortex/ui-state.json`,
		JSON.stringify(state, null, "\t"),
	)
}

export async function getNotePropertiesExpanded(
	vaultPath: string,
	filePath: string,
): Promise<boolean> {
	const state = await readUiState(vaultPath)
	return state.expanded[getRelativeNotePath(vaultPath, filePath)] ?? true
}

export async function setNotePropertiesExpanded(
	vaultPath: string,
	filePath: string,
	expanded: boolean,
): Promise<void> {
	const state = await readUiState(vaultPath)
	state.expanded[getRelativeNotePath(vaultPath, filePath)] = expanded
	await writeUiState(vaultPath, state)
}

export async function renameNotePropertiesUiState(
	vaultPath: string,
	oldFilePath: string,
	newFilePath: string,
): Promise<void> {
	const state = await readUiState(vaultPath)
	const oldPath = getRelativeNotePath(vaultPath, oldFilePath)
	if (!(oldPath in state.expanded)) return
	state.expanded[getRelativeNotePath(vaultPath, newFilePath)] = state.expanded[oldPath]
	delete state.expanded[oldPath]
	await writeUiState(vaultPath, state)
}

export async function removeNotePropertiesUiState(
	vaultPath: string,
	filePath: string,
): Promise<void> {
	const state = await readUiState(vaultPath)
	const relativePath = getRelativeNotePath(vaultPath, filePath)
	if (!(relativePath in state.expanded)) return
	delete state.expanded[relativePath]
	await writeUiState(vaultPath, state)
}
