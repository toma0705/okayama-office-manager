// login/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import LoginForm from "@/Components/LoginForm";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");
  if (token) {
    redirect("/");
  }

  return (
    <div>
      <LoginForm />
    </div>
  );
}
