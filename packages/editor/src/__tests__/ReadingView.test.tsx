import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReadingView } from "../ReadingView"

afterEach(cleanup)

describe("ReadingView rendering", () => {
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

	it("renders GFM table headers, cells, and alignment metadata", async () => {
		const { container } = render(
			<ReadingView content={"| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |"} />,
		)
		await waitFor(() => expect(container.querySelector("table")).not.toBeNull())

		expect(container.querySelectorAll("th")).toHaveLength(3)
		expect(container.querySelectorAll("td")).toHaveLength(3)
		expect(
			Array.from(container.querySelectorAll<HTMLElement>("th")).map((cell) =>
				cell.getAttribute("align"),
			),
		).toEqual(["left", "center", "right"])
	})

	it("renders unordered, ordered, nested, and task lists", async () => {
		const { container } = render(
			<ReadingView content={"- alpha\n  - nested\n\n1. first\n2. second\n\n- [ ] task"} />,
		)
		await waitFor(() => expect(container.querySelector("ul")).not.toBeNull())

		expect(container.querySelectorAll("ul")).toHaveLength(3)
		expect(container.querySelectorAll("ol")).toHaveLength(1)
		expect(container.querySelectorAll("li")).toHaveLength(5)
		expect(container.querySelector("[data-task-item] input[type='checkbox']")).not.toBeNull()
	})
})
