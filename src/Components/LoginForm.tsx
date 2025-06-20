"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const inputStyle = {
  fontSize: 18,
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
  width: "100%",
  boxSizing: "border-box" as const,
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password: password.trim() }),
    });
    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem("token", token);
      router.push("/");
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "メールアドレスまたはパスワードが違います");
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", background: "#f7f7f7" }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        style={{ ...inputStyle, marginBottom: 16 }}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        style={{ ...inputStyle, marginBottom: 24 }}
      />
      <button
        onClick={handleLogin}
        style={{
          fontSize: 18,
          padding: 12,
          borderRadius: 8,
          background: "#7bc062", // 緑色
          color: "#fff",
          border: "none",
          marginBottom: 12,
        }}
      >
        ログイン
      </button>
      <button
        onClick={() => router.push("/register")}
        style={{
          fontSize: 16,
          padding: 10,
          borderRadius: 8,
          background: "#fff",
          color: "#7bc062", // 緑色
          border: "1px solid #7bc062", // 緑色
        }}
      >
        新規登録
      </button>
    </div>
  );
}
