import { useMembersStore } from "@cortex/core"
import {
	Badge,
	Button,
	Input,
	NativeSelect,
	NativeSelectOption,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@cortex/ui"
import { Plus, Trash2, UserMinus } from "lucide-react"
import { type ChangeEvent, type KeyboardEvent, useEffect, useState } from "react"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatInviteDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value))
}

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
	const pendingInvites = invites.filter((invite) => !invite.accepted)

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
			setInviting(false)
		} catch {
			setInviting(false)
		}
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
			<div className="overflow-hidden rounded-lg border border-border bg-background">
				{loading && members.length === 0 ? (
					<p className="p-4 text-sm text-muted-foreground">Loading members...</p>
				) : members.length === 0 ? (
					<p className="p-4 text-sm text-muted-foreground">No members</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Member</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Joined</TableHead>
								<TableHead className="w-12 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((member) => (
								<TableRow key={member.userId}>
									<TableCell>
										<div className="flex min-w-0 items-center gap-3">
											<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-medium uppercase text-accent">
												{member.displayName?.charAt(0) || "?"}
											</div>
											<div className="min-w-0">
												<div className="truncate font-medium">{member.displayName}</div>
												<div className="truncate text-xs text-muted-foreground">{member.email}</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										{canManage ? (
											<NativeSelect
												className="h-7 w-[132px]"
												value={member.role}
												onChange={(event: ChangeEvent<HTMLSelectElement>) =>
													handleChangeRole(member.userId, event.target.value)
												}
											>
												{currentUserRole === "owner" && (
													<NativeSelectOption value="owner">Owner</NativeSelectOption>
												)}
												<NativeSelectOption value="admin">Admin</NativeSelectOption>
												<NativeSelectOption value="editor">Editor</NativeSelectOption>
												<NativeSelectOption value="viewer">Viewer</NativeSelectOption>
											</NativeSelect>
										) : (
											<Badge variant="outline" className="capitalize">
												{member.role}
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{formatInviteDate(member.joinedAt)}
									</TableCell>
									<TableCell className="text-right">
										{canManage && member.role !== "owner" && (
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleRemoveMember(member.userId)}
												className="h-7 w-7 text-muted-foreground hover:text-red-500"
											>
												<UserMinus size={13} />
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>

			{canManage && (
				<div className="rounded-lg border border-border bg-background p-3">
					<div className="flex items-center gap-2">
						<Input
							className="h-7 flex-1"
							placeholder="email@example.com"
							value={inviteEmail}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setInviteEmail(event.target.value)
							}
							onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
								if (event.key === "Enter") handleInvite()
							}}
						/>
						<NativeSelect
							className="h-7 w-[128px]"
							value={inviteRole}
							onChange={(event: ChangeEvent<HTMLSelectElement>) =>
								setInviteRole(event.target.value)
							}
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

			{canManage && pendingInvites.length > 0 && (
				<div className="overflow-hidden rounded-lg border border-border bg-background">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Invite</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Expires</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-12 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{pendingInvites.map((invite) => (
								<TableRow key={invite.id}>
									<TableCell className="font-medium">{invite.inviteeEmail}</TableCell>
									<TableCell>
										<Badge variant="outline" className="capitalize">
											{invite.role}
										</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{formatInviteDate(invite.expiresAt)}
									</TableCell>
									<TableCell>
										<Badge variant="outline">Pending</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDeleteInvite(invite.id)}
											className="h-7 w-7 text-muted-foreground hover:text-red-500"
										>
											<Trash2 size={13} />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{error && <p className="text-xs text-red-500">{error}</p>}
		</div>
	)
}
