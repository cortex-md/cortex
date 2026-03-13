export interface RemoteVaultInfo {
	id: string
	name: string
	description: string | null
	ownerId: string
	role: string
	createdAt: string
	updatedAt: string
}

export interface RemoteVault {
	create(name: string, description: string | null): Promise<RemoteVaultInfo>
	list(): Promise<RemoteVaultInfo[]>
	get(vaultId: string): Promise<RemoteVaultInfo>
	update(vaultId: string, name: string | null, description: string | null): Promise<RemoteVaultInfo>
	delete(vaultId: string): Promise<void>
	link(vaultPath: string, remoteVaultId: string): Promise<void>
	unlink(vaultPath: string): Promise<void>
	getLink(vaultPath: string): Promise<string | null>
}
