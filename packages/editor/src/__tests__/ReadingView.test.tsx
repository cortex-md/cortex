import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReadingView } from "../ReadingView"

afterEach(cleanup)

describe("ReadingView links", () => {
	it("delegates sanitized external links to the host", async () => {
		const onExternalLinkClick = vi.fn()
		const { container } = render(
			<ReadingView
				content="[Cortex](https://example.com)"
				onExternalLinkClick={onExternalLinkClick}
			/>,
		)
		await waitFor(() => expect(container.querySelector("a")).not.toBeNull())

		fireEvent.click(container.querySelector("a") as HTMLAnchorElement)

		expect(onExternalLinkClick).toHaveBeenCalledWith("https://example.com")
	})

	it("removes unsafe link protocols", async () => {
		const { container } = render(<ReadingView content="[Unsafe](javascript:alert(1))" />)
		await waitFor(() => expect(container.textContent).toContain("Unsafe"))

		expect(container.innerHTML).not.toContain("javascript:")
	})
})
