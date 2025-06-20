'use client'
import { useRouter } from "next/navigation";
import Register from "@/Components/Register";

export default function RegisterPage() {
  const router = useRouter();
  return (
    <div>
      <Register onBack={() => router.push("/login")} />
    </div>
  );
}