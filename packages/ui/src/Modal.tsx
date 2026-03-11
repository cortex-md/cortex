import type { HTMLAttributes, ReactNode } from "react"

interface Props extends HTMLAttributes<HTMLDivElement> {
	onClose: () => void
	children: ReactNode
}

export function ModalOverlay({ onClose, children, className = "", ...rest }: Props) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: modal overlay dismiss
		<div className={`modal-overlay ${className}`} onClick={onClose} role="presentation" {...rest}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only */}
			<div className="modal" onClick={(e) => e.stopPropagation()}>
				{children}
			</div>
		</div>
	)
}

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
}

export function ModalHeader({ children, className = "", ...rest }: ModalHeaderProps) {
	return (
		<div className={`modal-header ${className}`} {...rest}>
			{children}
		</div>
	)
}

interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
}

export function ModalBody({ children, className = "", ...rest }: ModalBodyProps) {
	return (
		<div className={`modal-body ${className}`} {...rest}>
			{children}
		</div>
	)
}

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
}

export function ModalFooter({ children, className = "", ...rest }: ModalFooterProps) {
	return (
		<div className={`modal-footer ${className}`} {...rest}>
			{children}
		</div>
	)
}
