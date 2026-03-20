import { useDevicesStore } from "@cortex/core"
import { Badge, Button, Input } from "@cortex/ui"
import { Laptop, Monitor, Pencil, Smartphone, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

function DeviceIcon({ deviceType }: { deviceType: string }) {
	switch (deviceType) {
		case "mobile":
			return <Smartphone size={16} className="text-text-muted" />
		case "desktop":
			return <Monitor size={16} className="text-text-muted" />
		default:
			return <Laptop size={16} className="text-text-muted" />
	}
}

export function DeviceManager() {
	const { deviceEntries, loading, error, fetchDevices, renameDevice, revokeDevice } =
		useDevicesStore()
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editName, setEditName] = useState("")

	useEffect(() => {
		fetchDevices()
	}, [fetchDevices])

	const handleStartRename = (deviceId: string, currentName: string) => {
		setEditingId(deviceId)
		setEditName(currentName)
	}

	const handleConfirmRename = async (deviceId: string) => {
		if (!editName.trim()) return
		try {
			await renameDevice(deviceId, editName.trim())
		} catch {}
		setEditingId(null)
		setEditName("")
	}

	const handleCancelRename = () => {
		setEditingId(null)
		setEditName("")
	}

	const handleRevoke = async (deviceId: string) => {
		try {
			await revokeDevice(deviceId)
		} catch {}
	}

	if (loading && deviceEntries.length === 0) {
		return <p className="text-xs text-text-muted py-2">Loading devices...</p>
	}

	if (error) {
		return <p className="text-xs text-red-500 py-2">{error}</p>
	}

	if (deviceEntries.length === 0) {
		return <p className="text-xs text-text-muted py-2">No devices found</p>
	}

	return (
		<div className="flex flex-col gap-1">
			{deviceEntries.map((device) => (
				<div key={device.id} className="flex items-center gap-3 py-2 group">
					<DeviceIcon deviceType={device.deviceType} />
					<div className="flex flex-col min-w-0 flex-1">
						{editingId === device.id ? (
							<div className="flex items-center gap-1">
								<Input
									className="bg-transparent border border-border rounded px-1 py-0.5 outline-none focus:border-accent w-full"
									value={editName}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
									onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
										if (e.key === "Enter") handleConfirmRename(device.id)
										if (e.key === "Escape") handleCancelRename()
									}}
									autoFocus
								/>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleConfirmRename(device.id)}
									className="h-6 px-2"
								>
									Save
								</Button>
							</div>
						) : (
							<>
								<span className="font-medium truncate">
									{device.deviceName}
									{device.isCurrent && (
										<Badge variant="outline" className="ml-2 py-0">
											This device
										</Badge>
									)}
									{device.revoked && (
										<Badge variant="destructive" className="ml-2 py-0">
											Revoked
										</Badge>
									)}
								</span>
								<span className="text-text-muted">
									{device.lastSeenAt
										? `Last seen ${new Date(device.lastSeenAt).toLocaleDateString()}`
										: `Added ${new Date(device.createdAt).toLocaleDateString()}`}
								</span>
							</>
						)}
					</div>
					{!device.isCurrent && editingId !== device.id && !device.revoked && (
						<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleStartRename(device.id, device.deviceName)}
								className="h-6 w-6 text-text-muted"
							>
								<Pencil size={12} />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleRevoke(device.id)}
								className="h-6 w-6 text-text-muted hover:text-red-500"
							>
								<Trash2 size={12} />
							</Button>
						</div>
					)}
				</div>
			))}
		</div>
	)
}
