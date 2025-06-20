'use client'
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/declaration";
import Image from "next/image";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const noSelectStyle = {
  userSelect: 'none' as const,
  WebkitUserSelect: 'none' as const,
  WebkitTouchCallout: 'none' as const,
};

const inputStyle = {
  fontSize: 18,
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
  width: "100%",
  boxSizing: "border-box" as const,
  marginBottom: 16,
};

const primaryButtonStyle = {
  fontSize: 18,
  padding: 12,
  borderRadius: 8,
  background: "#7bc062",
  color: "#fff",
  border: "none",
  marginBottom: 12,
  marginTop: 12,
  ...noSelectStyle,
};

const secondaryButtonStyle = {
  fontSize: 16,
  padding: 10,
  borderRadius: 8,
  background: "#fff",
  color: "#7bc062",
  border: "1px solid #7bc062",
  marginBottom: 0,
  marginTop: 8,
  ...noSelectStyle,
};

export default function Register({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`);
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const addUser = async () => {
    if (!name || !email || !password || !iconFile) {
      if (!name || !email || !password) {
        alert("名前・メールアドレス・パスワードは必須です");
      } else if (!iconFile) {
        alert("アイコン画像の選択は必須です");
      }
      return;
    }
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("icon", iconFile);
      formData.append("password", password);
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        router.push("/login");
      } else {
        alert("ユーザー追加に失敗しました");
      }
      setName("");
      setEmail("");
      setIconFile(null);
      setPassword("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserLongPress = (userId: number, userName: string) => {
    let timer: NodeJS.Timeout;
    const onMouseDown = () => {
      timer = setTimeout(async () => {
        if (window.confirm(`${userName} を削除しますか？`)) {
          try {
            const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
              method: "DELETE",
            });
            if (res.ok) {
              setUsers((prev) => prev.filter((u) => u.id !== userId));
            } else {
              alert("削除に失敗しました");
            }
          } catch {
            alert("削除時にエラーが発生しました");
          }
        }
      }, 700);
    };
    const onMouseUp = () => clearTimeout(timer);
    return { onMouseDown, onMouseUp, onMouseLeave: onMouseUp, onTouchStart: onMouseDown, onTouchEnd: onMouseUp };
  };

  const iconPreviewUrl = useMemo(() => {
    return iconFile ? URL.createObjectURL(iconFile) : null;
  }, [iconFile]);

  useEffect(() => {
    return () => {
      if (iconPreviewUrl) {
        URL.revokeObjectURL(iconPreviewUrl);
      }
    };
  }, [iconPreviewUrl]);

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f7f7f7" }}>
      <h1 style={{ textAlign: "center", marginBottom: 24, fontSize: 24, ...noSelectStyle }}>ユーザー一覧</h1>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
        {users.map((u) => {
          const longPressHandlers = handleUserLongPress(u.id, u.name);
          return (
            <li
              key={u.id}
              style={{ display: "flex", alignItems: "center", marginBottom: 16, background: "#fff", borderRadius: 12, padding: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              {...longPressHandlers}
              onContextMenu={e => e.preventDefault()}
              draggable={false}
            >
              <Image
                src={u.iconFileName ? `/uploads/${u.iconFileName}` : "/file.svg"}
                alt={u.name}
                width={40}
                height={40}
                style={{
                  verticalAlign: "middle",
                  marginRight: 12,
                  borderRadius: "50%",
                  objectFit: "cover",
                  background: "#eee",
                  ...noSelectStyle,
                }}
              />
              <span
                onContextMenu={e => e.preventDefault()}
                style={{ fontSize: 18, ...noSelectStyle }}
              >{u.name}</span>
            </li>
          );
        })}
      </ul>
      <hr
        onContextMenu={e => e.preventDefault()}
        style={{
          border: "none",
          borderTop: "2px solid #e0e0e0",
          margin: "24px 0",
          pointerEvents: "none",
          ...noSelectStyle,
        }}
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名前を入力"
        style={inputStyle}
      />
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="メールアドレス"
        style={inputStyle}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        style={inputStyle}
      />
      <label
        htmlFor="icon-upload"
        style={{
          display: "block",
          marginBottom: 16,
          padding: "12px 0",
          border: "2px dashed #7bc062",
          borderRadius: 8,
          background: "#f0f8f4",
          color: "#7bc062",
          textAlign: "center",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 16,
          ...noSelectStyle,
        }}
      >
        {iconFile ? `選択済み: ${iconFile.name}` : "アイコン画像を選択（必須）"}
        <input
          id="icon-upload"
          type="file"
          accept="image/*"
          onChange={(e) => setIconFile(e.target.files ? e.target.files[0] : null)}
          style={{ display: "none" }}
        />
        {/* 画像プレビュー表示 */}
        {iconFile && (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <Image
              src={iconPreviewUrl || "/file.svg"}
              alt="icon preview"
              width={80}
              height={80}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                background: "#eee",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                border: "2px solid #7bc062",
                display: "block",
                aspectRatio: "1 / 1",
              }}
            />
          </div>
        )}
      </label>
      <hr
        onContextMenu={e => e.preventDefault()}
        style={{
          border: "none",
          borderTop: "2px solid #e0e0e0",
          margin: "24px 0",
          pointerEvents: "none",
          ...noSelectStyle,
        }}
      />
      <button
        onClick={addUser}
        style={primaryButtonStyle}
      >
        追加
      </button>
      <button
        onClick={onBack}
        style={secondaryButtonStyle}
      >
        ログイン画面に戻る
      </button>
    </div>
  );
}
