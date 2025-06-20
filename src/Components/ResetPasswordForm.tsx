"use client";
import { useState } from "react";

export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/users/reset-password-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("パスワード再設定用のメールを送信しました。メールをご確認ください。");
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(err.error || "送信に失敗しました");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: 32, background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, marginBottom: 24 }}>パスワード再設定</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>登録メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ccc", marginBottom: 20, fontSize: 16 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 14, borderRadius: 8, background: "#7bc062", color: "#fff", fontWeight: 700, fontSize: 18, border: "none", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "送信中..." : "再設定メールを送信"}
        </button>
      </form>
      {message && <div style={{ marginTop: 24, color: message.includes("送信しました") ? "#7bc062" : "#e53935", fontWeight: 600, textAlign: "center" }}>{message}</div>}
      <div style={{ marginTop: 32, textAlign: "center" }}>
        <a href="/login" style={{ color: "#7bc062", textDecoration: "underline", fontWeight: 600 }}>ログイン画面へ戻る</a>
      </div>
    </div>
  );
}
