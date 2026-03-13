import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm flex flex-col gap-8">
				<div className="flex flex-col w-full items-center">
					logo here
					<h1 className="w-full text-center font-bold text-2xl">Cortex</h1>
				</div>
				<LoginForm />
			</div>
		</div>
	)
}
