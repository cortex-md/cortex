import { useUIStore } from "@cortex/core"
import { Alert, AlertDescription, AlertTitle, Button } from "@cortex/ui"
import { CloudOff, LogIn } from "lucide-react"

export function SignedOutNotice() {
	const openAuth = useUIStore((state) => state.openAuth)
	return (
		<Alert>
			<LogIn />
			<AlertTitle>Sign in before enabling sync</AlertTitle>
			<AlertDescription>
				<div className="flex flex-col gap-3">
					<p>Connect your Cortex account to enable sync and link a remote vault.</p>
					<Button size="sm" className="w-fit" onClick={() => openAuth("login", "sync")}>
						Sign in
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	)
}

export function SyncDisabledNotice({ description }: { description: string }) {
	return (
		<Alert>
			<CloudOff />
			<AlertTitle>Sync is disabled</AlertTitle>
			<AlertDescription>{description}</AlertDescription>
		</Alert>
	)
}
