import { useMembersStore } from "@cortex/core"
import { Badge, Button } from "@cortex/ui"
import { Check } from "lucide-react"
import { useEffect } from "react"

export function InvitesPanel() {
	const { myInvites, error, fetchMyInvites, acceptInvite } = useMembersStore()

	useEffect(() => {
		fetchMyInvites()
	}, [fetchMyInvites])

	if (myInvites.length === 0) {
		return <p className="text-xs text-text-muted py-2">No pending invites</p>
	}

	const handleAccept = async (inviteId: string) => {
		try {
			await acceptInvite(inviteId)
		} catch {}
	}

	return (
		<div className="flex flex-col gap-1">
			{myInvites
				.filter((i) => !i.accepted)
				.map((invite) => (
					<div key={invite.id} className="flex items-center gap-3 py-2">
						<div className="flex flex-col min-w-0 flex-1">
							<span className="text-xs font-medium truncate">{invite.vaultName}</span>
							<span className="text-[10px] text-text-muted">Role: {invite.role}</span>
						</div>
						<Badge variant="outline" className="text-[10px] py-0">
							Pending
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleAccept(invite.id)}
							className="h-6 px-2 text-xs text-status-success-foreground hover:text-status-success"
						>
							<Check size={12} />
							Accept
						</Button>
					</div>
				))}
			{error && <p className="mt-2 text-xs text-status-error-foreground">{error}</p>}
		</div>
	)
}
