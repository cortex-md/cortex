import { cn, Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@cortex/ui"
import type { ComponentProps, ReactNode } from "react"

interface SettingsPageProps extends ComponentProps<"section"> {
	children: ReactNode
}

interface SettingsBlockProps extends ComponentProps<"div"> {
	title: string
	description?: string
	action?: ReactNode
	children: ReactNode
}

interface SettingsFieldProps extends ComponentProps<typeof Field> {
	label: ReactNode
	description?: ReactNode
	htmlFor?: string
	controlClassName?: string
	children: ReactNode
}

interface SettingsListProps extends ComponentProps<"div"> {
	children: ReactNode
}

interface SettingsListItemProps extends ComponentProps<"div"> {
	children: ReactNode
}

interface SettingsEmptyStateProps extends ComponentProps<"p"> {
	children: ReactNode
}

export function SettingsPage({ className, children, ...props }: SettingsPageProps) {
	return (
		<section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-4", className)} {...props}>
			{children}
		</section>
	)
}

export function SettingsBlock({
	title,
	description,
	action,
	children,
	className,
	...props
}: SettingsBlockProps) {
	return (
		<div className={cn("rounded-lg border border-border bg-muted/20 p-4", className)} {...props}>
			<div className="mb-4 flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="m-0 text-sm font-semibold text-foreground">{title}</h3>
					{description && <p className="m-0 mt-1 text-xs text-muted-foreground">{description}</p>}
				</div>
				{action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
			</div>
			<FieldGroup className="gap-3">{children}</FieldGroup>
		</div>
	)
}

export function SettingsField({
	label,
	description,
	htmlFor,
	controlClassName,
	className,
	children,
	...props
}: SettingsFieldProps) {
	return (
		<Field
			orientation="responsive"
			className={cn("justify-between gap-3 py-2 @md/field-group:items-center", className)}
			{...props}
		>
			<FieldContent className="min-w-0 gap-1">
				<FieldLabel htmlFor={htmlFor} className="w-auto max-w-full text-sm font-medium">
					{label}
				</FieldLabel>
				{description && (
					<FieldDescription className="text-xs leading-relaxed">{description}</FieldDescription>
				)}
			</FieldContent>
			<div
				className={cn(
					"flex w-full min-w-0 justify-start @md/field-group:min-w-[180px] @md/field-group:max-w-[320px] @md/field-group:flex-1 @md/field-group:justify-end",
					controlClassName,
				)}
			>
				{children}
			</div>
		</Field>
	)
}

export function SettingsList({ className, children, ...props }: SettingsListProps) {
	return (
		<div className={cn("flex flex-col divide-y divide-border", className)} {...props}>
			{children}
		</div>
	)
}

export function SettingsListItem({ className, children, ...props }: SettingsListItemProps) {
	return (
		<div className={cn("group flex items-center gap-3 py-3", className)} {...props}>
			{children}
		</div>
	)
}

export function SettingsEmptyState({ className, children, ...props }: SettingsEmptyStateProps) {
	return (
		<p className={cn("m-0 py-2 text-sm text-muted-foreground", className)} {...props}>
			{children}
		</p>
	)
}
