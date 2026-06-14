import {
	noteCache,
	useAuthStore,
	useDevicesStore,
	useMembersStore,
	useRemoteVaultStore,
	useVaultStore,
} from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import { initializeProperties } from "@cortex/properties"

const loadedMemberVaults = new Set<string>()
const memberLoads = new Map<string, Promise<void>>()
let devicesLoaded = false
let devicesLoad: Promise<void> | null = null
let currentDeviceInfo:
	| Promise<{ deviceId: string; deviceName: string; deviceType: string }>
	| undefined
const noteMetadataLoads = new Map<string, ReturnType<typeof loadRemoteNoteMetadata>>()

async function ensureMembers(vaultId: string): Promise<void> {
	if (loadedMemberVaults.has(vaultId)) return
	const existing = memberLoads.get(vaultId)
	if (existing) return existing
	const load = useMembersStore
		.getState()
		.fetchMembers(vaultId)
		.then(() => {
			loadedMemberVaults.add(vaultId)
		})
		.finally(() => memberLoads.delete(vaultId))
	memberLoads.set(vaultId, load)
	return load
}

async function ensureDevices(): Promise<void> {
	if (devicesLoaded) return
	if (devicesLoad) return devicesLoad
	devicesLoad = useDevicesStore
		.getState()
		.fetchDevices()
		.then(() => {
			devicesLoaded = true
		})
		.finally(() => {
			devicesLoad = null
		})
	return devicesLoad
}

function loadRemoteNoteMetadata(vaultPath: string, relativePath: string) {
	return getPlatform().sync.getNoteMetadata(vaultPath, relativePath)
}

export function initializeDesktopProperties(): void {
	const platform = getPlatform()
	currentDeviceInfo ??= platform.device.getDeviceInfo().catch(async () => ({
		deviceId: await platform.device.getDeviceId(),
		deviceName: "This device",
		deviceType: "desktop",
	}))
	const deviceInfoLoad = currentDeviceInfo
	initializeProperties({
		files: {
			readFile: (path) => platform.fs.readFile(path),
			atomicWriteFile: (path, content) => platform.fs.atomicWriteFile(path, content),
		},
		notes: {
			readNote: (path) => {
				const entry = noteCache.getEntry(path)
				return entry ? Promise.resolve(entry.content) : platform.fs.readFile(path)
			},
			writeNote: async (path, content) => {
				if (noteCache.getEntry(path)) {
					noteCache.writeExternal(path, content)
					return
				}
				await platform.fs.writeFile(path, content)
			},
			resolveVaultPath: (filePath) => {
				const vaultPath = useVaultStore.getState().vault?.path
				return vaultPath && filePath.startsWith(`${vaultPath}/`) ? vaultPath : null
			},
			listMarkdownFiles: async (_vaultPath) => {
				return useVaultStore
					.getState()
					.files.filter((file) => !file.isDir && file.path.toLocaleLowerCase().endsWith(".md"))
					.map((file) => file.path)
			},
		},
		identity: {
			getAuthorContext: async () => {
				try {
					const config = useRemoteVaultStore.getState().syncConfig
					const auth = useAuthStore.getState()
					const deviceInfo = await deviceInfoLoad
					if (config.remoteVaultId && auth.authenticated) {
						await Promise.all([ensureMembers(config.remoteVaultId), ensureDevices()])
					}
					const members = useMembersStore.getState().members
					const devices = useDevicesStore.getState().deviceEntries
					return {
						authenticated: auth.authenticated,
						remoteVaultId: config.remoteVaultId,
						currentUserId: auth.user?.userId ?? null,
						members: members.map((member) => ({
							id: member.userId,
							label: member.displayName || member.email,
							email: member.email,
						})),
						currentDeviceId: deviceInfo.deviceId,
						devices: devices.map((device) => ({
							id: device.id,
							label: device.deviceName,
							current: device.isCurrent ?? device.id === deviceInfo.deviceId,
						})),
					}
				} catch {
					const deviceInfo = await deviceInfoLoad
					return {
						authenticated: false,
						remoteVaultId: null,
						currentUserId: null,
						members: [],
						currentDeviceId: deviceInfo.deviceId,
						devices: [
							{
								id: deviceInfo.deviceId,
								label: deviceInfo.deviceName,
								current: true,
							},
						],
					}
				}
			},
		},
		metadata: {
			getNoteSourceMetadata: async (filePath) => {
				const fileMetadata = await platform.fs.getFileMetadata(filePath)
				const entry = noteCache.getEntry(filePath)
				const vaultPath = useVaultStore.getState().vault?.path
				const config = useRemoteVaultStore.getState().syncConfig
				if (vaultPath && config.enabled && config.remoteVaultId) {
					const relativePath = filePath.replace(`${vaultPath}/`, "")
					const cacheKey = `${config.remoteVaultId}:${relativePath}`
					let load = noteMetadataLoads.get(cacheKey)
					if (!load) {
						load = loadRemoteNoteMetadata(vaultPath, relativePath).finally(() =>
							noteMetadataLoads.delete(cacheKey),
						)
						noteMetadataLoads.set(cacheKey, load)
					}
					const remote = await load.catch(() => null)
					if (remote) {
						return {
							source: "remote" as const,
							synced: remote.synced,
							dirty: entry?.dirty ?? false,
							createdAt: remote.createdAt,
							createdBy: remote.createdBy,
							lastEditedAt: remote.lastEditedAt,
							lastEditedBy:
								remote.lastEditedBy ??
								(remote.lastDeviceId ? `device:${remote.lastDeviceId}` : null),
						}
					}
				}
				const deviceInfo = await deviceInfoLoad
				return {
					source: "local",
					synced: false,
					dirty: entry?.dirty ?? false,
					createdAt: new Date(fileMetadata.createdAt).toISOString(),
					createdBy: `device:${deviceInfo.deviceId}`,
					lastEditedAt: new Date(fileMetadata.modifiedAt).toISOString(),
					lastEditedBy: `device:${deviceInfo.deviceId}`,
				}
			},
		},
	})
}
