import type { AcceptInviteResult, VaultInvite, VaultMember } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface MembersState {
	members: VaultMember[]
	invites: VaultInvite[]
	myInvites: VaultInvite[]
	loading: boolean
	error: string | null

	fetchMembers: (vaultId: string) => Promise<void>
	updateMemberRole: (vaultId: string, userId: string, role: string) => Promise<void>
	removeMember: (vaultId: string, userId: string) => Promise<void>
	fetchInvites: (vaultId: string) => Promise<void>
	createInvite: (
		vaultId: string,
		inviteeEmail: string,
		role: string,
		encryptedVaultKey: string,
	) => Promise<void>
	deleteInvite: (vaultId: string, inviteId: string) => Promise<void>
	fetchMyInvites: () => Promise<void>
	acceptInvite: (inviteId: string) => Promise<AcceptInviteResult>
	clearError: () => void
}

export const useMembersStore = create<MembersState>()(
	devtools(
		immer((set) => ({
			members: [],
			invites: [],
			myInvites: [],
			loading: false,
			error: null,

			fetchMembers: async (vaultId) => {
				set((state) => {
					state.loading = true
					state.error = null
				})
				try {
					const platform = getPlatform()
					const members = await platform.members.listMembers(vaultId)
					set((state) => {
						state.members = members
						state.loading = false
					})
				} catch (e) {
					set((state) => {
						state.loading = false
						state.error = String(e)
					})
				}
			},

			updateMemberRole: async (vaultId, userId, role) => {
				try {
					const platform = getPlatform()
					await platform.members.updateMemberRole(vaultId, userId, role)
					set((state) => {
						const member = state.members.find((m) => m.userId === userId)
						if (member) {
							member.role = role
						}
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			removeMember: async (vaultId, userId) => {
				try {
					const platform = getPlatform()
					await platform.members.removeMember(vaultId, userId)
					set((state) => {
						state.members = state.members.filter((m) => m.userId !== userId)
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			fetchInvites: async (vaultId) => {
				try {
					const platform = getPlatform()
					const invites = await platform.members.listInvites(vaultId)
					set((state) => {
						state.invites = invites
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			createInvite: async (vaultId, inviteeEmail, role, encryptedVaultKey) => {
				try {
					const platform = getPlatform()
					const invite = await platform.members.createInvite(
						vaultId,
						inviteeEmail,
						role,
						encryptedVaultKey,
					)
					set((state) => {
						state.invites.push(invite)
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
					throw e
				}
			},

			deleteInvite: async (vaultId, inviteId) => {
				try {
					const platform = getPlatform()
					await platform.members.deleteInvite(vaultId, inviteId)
					set((state) => {
						state.invites = state.invites.filter((i) => i.id !== inviteId)
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			fetchMyInvites: async () => {
				try {
					const platform = getPlatform()
					const invites = await platform.members.myInvites()
					set((state) => {
						state.myInvites = invites
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			acceptInvite: async (inviteId) => {
				try {
					const platform = getPlatform()
					const result = await platform.members.acceptInvite(inviteId)
					set((state) => {
						state.myInvites = state.myInvites.filter((i) => i.id !== inviteId)
					})
					return result
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
					throw e
				}
			},

			clearError: () =>
				set((state) => {
					state.error = null
				}),
		})),
		{ name: "membersStore" },
	),
)
