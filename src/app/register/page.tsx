'use client'
import Register from "@/Components/Register";




export default function RegisterPage() {
  return (
    <div>
      <Register onBack={() => window.history.back()} />
    </div>
  );
}