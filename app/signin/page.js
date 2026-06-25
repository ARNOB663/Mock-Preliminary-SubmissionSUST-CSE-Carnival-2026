import Link from "next/link";
import { SignInForm } from "@/components/sign-in";

export const metadata = {
  title: "Sign in — TechHire",
};

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-4">
        <SignInForm />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}