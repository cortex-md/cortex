import { SignupForm } from "@/components/signup-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center justify-center flex-col gap-3 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            Logo here
          </div>
         Cortex
        </a>
        <SignupForm />
      </div>
    </div>
  )
}
