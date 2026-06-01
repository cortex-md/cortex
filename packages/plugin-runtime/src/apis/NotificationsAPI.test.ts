import type { PluginNotificationPermissionState } from "cortex-plugin-api"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPluginAPI } from "../PluginAPIFactory"
import { usePluginStore } from "../pluginStore"
import { resetNotificationRateLimits, setNotificationFunctions } from "./NotificationsAPI"

const manifest = {
	id: "notifier",
	name: "Notifier",
	version: "0.1.0",
	minAppVersion: "0.1.0",
	author: "Tester",
	description: "Sends notifications",
	icon: "bell",
	main: "main.js",
}

const testState = vi.hoisted(() => ({
	isSupported: vi.fn(() => true),
	getPermission: vi.fn(async (): Promise<PluginNotificationPermissionState> => "granted"),
	send: vi.fn(async () => ({ delivered: true })),
}))

beforeEach(() => {
	usePluginStore.getState().reset()
	resetNotificationRateLimits()
	testState.isSupported.mockReset()
	testState.isSupported.mockReturnValue(true)
	testState.getPermission.mockReset()
	testState.getPermission.mockResolvedValue("granted")
	testState.send.mockReset()
	testState.send.mockResolvedValue({ delivered: true })
	setNotificationFunctions(testState)
})

describe("notifications API", () => {
	it("requires the notifications manifest capability", async () => {
		usePluginStore.getState().registerPlugin({ ...manifest, capabilities: [] })

		const api = createPluginAPI("notifier", () => null)
		const result = await api.notifications.send({ title: "Hello" })

		expect(result).toEqual({ delivered: false, reason: "missing-capability" })
		expect(testState.send).not.toHaveBeenCalled()
	})

	it("returns unsupported when the host has no notification support", async () => {
		usePluginStore.getState().registerPlugin({ ...manifest, capabilities: ["notifications"] })
		testState.isSupported.mockReturnValue(false)

		const api = createPluginAPI("notifier", () => null)
		const result = await api.notifications.send({ title: "Hello" })

		expect(result).toEqual({ delivered: false, reason: "unsupported" })
	})

	it("does not request permission for plugins", async () => {
		usePluginStore.getState().registerPlugin({ ...manifest, capabilities: ["notifications"] })
		testState.getPermission.mockResolvedValue("prompt")

		const api = createPluginAPI("notifier", () => null)
		const result = await api.notifications.send({ title: "Hello" })

		expect(result).toEqual({ delivered: false, reason: "permission-denied" })
		expect(testState.send).not.toHaveBeenCalled()
	})

	it("passes plugin id to the notification bridge", async () => {
		usePluginStore.getState().registerPlugin({ ...manifest, capabilities: ["notifications"] })

		const api = createPluginAPI("notifier", () => null)
		const result = await api.notifications.send({ title: "Hello", tag: "daily" })

		expect(result).toEqual({ delivered: true })
		expect(testState.send).toHaveBeenCalledWith({
			title: "Hello",
			tag: "daily",
			pluginId: "notifier",
		})
	})

	it("rate limits plugin notifications", async () => {
		usePluginStore.getState().registerPlugin({ ...manifest, capabilities: ["notifications"] })

		const api = createPluginAPI("notifier", () => null)
		await api.notifications.send({ title: "One" })
		await api.notifications.send({ title: "Two" })
		await api.notifications.send({ title: "Three" })
		const result = await api.notifications.send({ title: "Four" })

		expect(result).toEqual({ delivered: false, reason: "rate-limited" })
		expect(testState.send).toHaveBeenCalledTimes(3)
	})

	it("routes showNotice through native notifications", async () => {
		usePluginStore.getState().registerPlugin({ ...manifest, capabilities: ["notifications"] })

		const api = createPluginAPI("notifier", () => null)
		api.ui.showNotice("Saved")
		await vi.waitFor(() => expect(testState.send).toHaveBeenCalled())

		expect(testState.send).toHaveBeenCalledWith({
			title: "Notifier",
			body: "Saved",
			pluginId: "notifier",
		})
	})
})
