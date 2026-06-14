import { getPropertiesRuntime } from "./runtime"
import type { ResolvedAuthorConfig, ResolvedPropertyActor } from "./types"

export async function resolveAuthorProperty(vaultPath: string): Promise<ResolvedAuthorConfig> {
	const context = await getPropertiesRuntime().getAuthorContext(vaultPath)
	if (!context.authenticated || !context.remoteVaultId) return { variant: "text" }
	return {
		variant: "person",
		options: context.members,
		currentUserId: context.currentUserId,
	}
}

export async function resolvePropertyActor(vaultPath: string): Promise<string> {
	const runtime = getPropertiesRuntime()
	const context = await runtime.getAuthorContext(vaultPath)
	if (context.authenticated && context.remoteVaultId && context.currentUserId) {
		return context.currentUserId
	}
	return `device:${await runtime.getDeviceId()}`
}

export async function resolvePropertyActorValue(
	vaultPath: string,
	value: unknown,
): Promise<ResolvedPropertyActor> {
	const id = String(value ?? "")
	const context = await getPropertiesRuntime().getAuthorContext(vaultPath)
	const person = context.members.find((member) => member.id === id)
	if (person) {
		return {
			kind: "person",
			...person,
			current: person.id === context.currentUserId,
		}
	}
	const deviceId = id.startsWith("device:") ? id.slice("device:".length) : id
	const device = context.devices.find((candidate) => candidate.id === deviceId)
	if (device || id.startsWith("device:")) {
		return {
			kind: "device",
			id,
			label:
				device?.label ?? (deviceId === context.currentDeviceId ? "This device" : "Local device"),
			current: device?.current ?? deviceId === context.currentDeviceId,
		}
	}
	return {
		kind: "unknown",
		id,
		label: "Unknown member",
	}
}
