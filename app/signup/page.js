import { SignUpForm } from "@/components/sign-up";

export const metadata = {
  title: "Sign up — TechHire",
};

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </div>
  );
}