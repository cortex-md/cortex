import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PathPatternPicker } from "../../../components/shared/PathPatternPicker"

const options = [
	{ value: "Notes/", label: "Notes/", isDir: true },
	{ value: "Projects/Plan.md", label: "Projects/Plan.md", isDir: false },
]

afterEach(cleanup)

describe("PathPatternPicker", () => {
	it("filters options, renders the list in a portal, and supports keyboard selection", async () => {
		const onSelect = vi.fn()
		const { container } = render(
			<PathPatternPicker
				options={options}
				onSelect={onSelect}
				placeholder="Choose a path"
				allowCustomValue
			/>,
		)
		const input = screen.getByRole("combobox", { name: "Choose a path" })

		await userEvent.type(input, "Plan")

		expect(await screen.findByRole("option", { name: "Projects/Plan.md" })).toBeInTheDocument()
		expect(screen.queryByRole("option", { name: "Notes/" })).not.toBeInTheDocument()
		expect(container.querySelector('[data-slot="combobox-content"]')).toBeNull()
		expect(document.querySelector('[data-slot="combobox-content"]')).not.toBeNull()

		fireEvent.keyDown(input, { key: "ArrowDown" })
		fireEvent.keyDown(input, { key: "Enter" })

		expect(onSelect).toHaveBeenCalledWith("Projects/Plan.md")
		expect(input).toHaveValue("")
	})

	it("adds custom patterns through the same keyboard flow", async () => {
		const onSelect = vi.fn()
		render(
			<PathPatternPicker
				options={options}
				onSelect={onSelect}
				placeholder="Choose a path"
				allowCustomValue
				getCustomValueLabel={(value) => `Add pattern ${value}`}
			/>,
		)
		const input = screen.getByRole("combobox", { name: "Choose a path" })

		await userEvent.type(input, "*.tmp")
		expect(await screen.findByRole("option", { name: "Add pattern *.tmp" })).toBeInTheDocument()

		fireEvent.keyDown(input, { key: "ArrowDown" })
		fireEvent.keyDown(input, { key: "Enter" })

		expect(onSelect).toHaveBeenCalledWith("*.tmp")
	})
})
