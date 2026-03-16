import type { MDXComponents } from "mdx/types"
import type { HTMLAttributes, ReactNode } from "react"

function slugifyHeading(children: ReactNode): string {
	const text = typeof children === "string" ? children : String(children ?? "")
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
}

function HeadingH1({ children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
	const id = slugifyHeading(children)
	return (
		<h1 id={id} {...rest}>
			{children}
		</h1>
	)
}

function HeadingH2({ children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
	const id = slugifyHeading(children)
	return (
		<h2 id={id} {...rest}>
			{children}
		</h2>
	)
}

function HeadingH3({ children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
	const id = slugifyHeading(children)
	return (
		<h3 id={id} {...rest}>
			{children}
		</h3>
	)
}

function HeadingH4({ children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
	const id = slugifyHeading(children)
	return (
		<h4 id={id} {...rest}>
			{children}
		</h4>
	)
}

export function useMDXComponents(): MDXComponents {
	return {
		h1: HeadingH1,
		h2: HeadingH2,
		h3: HeadingH3,
		h4: HeadingH4,
	}
}
