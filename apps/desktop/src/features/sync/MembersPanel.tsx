import { useMembersStore } from "@cortex/core"
import { Badge, Button, Input, NativeSelect, NativeSelectOption } from "@cortex/ui"
import { Plus, Trash2, UserMinus } from "lucide-react"
import { useEffect, useState } from "react"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface MembersPanelProps {
	vaultId: string
	currentUserRole?: string
}

export function MembersPanel({ vaultId, currentUserRole }: MembersPanelProps) {
	const {
		members,
		invites,
		loading,
		error,
		fetchMembers,
		updateMemberRole,
		removeMember,
		fetchInvites,
		createInvite,
		deleteInvite,
		clearError,
	} = useMembersStore()

	const [inviteEmail, setInviteEmail] = useState("")
	const [inviteRole, setInviteRole] = useState("editor")
	const [inviting, setInviting] = useState(false)

	const isValidEmail = EMAIL_REGEX.test(inviteEmail.trim())
	const canManage = currentUserRole === "owner" || currentUserRole === "admin"

	useEffect(() => {
		if (currentUserRole) {
			fetchMembers(vaultId)
		}
	}, [vaultId, fetchMembers, currentUserRole])

	useEffect(() => {
		if (canManage) {
			fetchInvites(vaultId)
		}
	}, [vaultId, fetchInvites, canManage])

	const handleInvite = async () => {
		if (!isValidEmail) return
		clearError()
		setInviting(true)
		try {
			await createInvite(vaultId, inviteEmail.trim(), inviteRole, "")
			setInviteEmail("")
		} catch {}
		setInviting(false)
	}

	const handleRemoveMember = async (userId: string) => {
		clearError()
		await removeMember(vaultId, userId)
	}

	const handleChangeRole = async (userId: string, newRole: string) => {
		clearError()
		await updateMemberRole(vaultId, userId, newRole)
	}

	const handleDeleteInvite = async (inviteId: string) => {
		clearError()
		await deleteInvite(vaultId, inviteId)
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h4 className="text-[10px] font-bold m-0 mb-2 text-text-muted uppercase tracking-wide">
					Members
				</h4>
				{loading && members.length === 0 ? (
					<p className="text-text-muted py-2">Loading members...</p>
				) : members.length === 0 ? (
					<p className="text-text-muted py-2">No members</p>
				) : (
					<div className="flex flex-col gap-1">
						{members.map((member) => (
							<div key={member.userId} className="flex items-center gap-3 py-1.5 group">
								<div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium uppercase shrink-0">
									{member.displayName?.charAt(0) || "?"}
								</div>
								<div className="flex flex-col min-w-0 flex-1">
									<span className="font-medium truncate">{member.displayName}</span>
									<span className="text-text-muted truncate">{member.email}</span>
								</div>
								{canManage ? (
									<NativeSelect
										className="bg-transparent border border-border rounded px-1 py-0.5 outline-none"
										value={member.role}
										onChange={(e) => handleChangeRole(member.userId, e.target.value)}
									>
										{currentUserRole === "owner" && <option value="owner">Owner</option>}
										<option value="admin">Admin</option>
										<option value="editor">Editor</option>
										<option value="viewer">Viewer</option>
									</NativeSelect>
								) : (
									<span className="text-xs text-text-muted capitalize">{member.role}</span>
								)}
								{canManage && member.role !== "owner" && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleRemoveMember(member.userId)}
										className="h-6 w-6 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
									>
										<UserMinus size={12} />
									</Button>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{canManage && (
				<div>
					<h4 className="text-[10px] font-bold m-0 mb-2 text-text-muted uppercase tracking-wide">
						Invite
					</h4>
					<div className="flex items-center gap-2">
						<Input
							className="h-7 flex-1"
							placeholder="email@example.com"
							value={inviteEmail}
							onChange={(e) => setInviteEmail(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleInvite()
							}}
						/>
						<NativeSelect
							className="bg-transparent border border-border rounded px-1 py-1 outline-none h-7"
							value={inviteRole}
							onChange={(e) => setInviteRole(e.target.value)}
						>
							<NativeSelectOption value="admin">Admin</NativeSelectOption>
							<NativeSelectOption value="editor">Editor</NativeSelectOption>
							<NativeSelectOption value="viewer">Viewer</NativeSelectOption>
						</NativeSelect>
						<Button
							variant="secondary"
							size="sm"
							onClick={handleInvite}
							disabled={inviting || !isValidEmail}
							className="h-7"
						>
							<Plus size={12} />
							Invite
						</Button>
					</div>
				</div>
			)}

			{canManage && invites.length > 0 && (
				<div>
					<h4 className="text-[10px] font-bold m-0 mb-2 text-text-muted uppercase tracking-wide">
						Pending Invites
					</h4>
					<div className="flex flex-col gap-1">
						{invites
							.filter((i) => !i.accepted)
							.map((invite) => (
								<div key={invite.id} className="flex items-center gap-3 py-1.5 group">
									<div className="flex flex-col min-w-0 flex-1">
										<span className="truncate">{invite.inviteeEmail}</span>
										<span className="text-text-muted">{invite.role}</span>
									</div>
									<Badge variant="outline" className="py-0">
										Pending
									</Badge>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDeleteInvite(invite.id)}
										className="h-6 w-6 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
									>
										<Trash2 size={12} />
									</Button>
								</div>
							))}
					</div>
				</div>
			)}

			{error && <p className="text-xs text-red-500">{error}</p>}
		</div>
	)
}
