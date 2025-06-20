"use client";
import { useRouter } from "next/navigation";
import type { User } from "@/types/declaration";
import Image from "next/image";
import { useState } from "react";

type Props = {
  user: User | null;
  entered: boolean;
  onEnter: () => void;
  onExit: () => void;
  enteredUsers: User[];
};

const enterExitButtonStyle = {
  fontSize: 18,
  padding: 12,
  borderRadius: 8,
  color: "#fff",
  border: "none",
  width: 120,
};

export default function HomeForm({ user, entered, onEnter, onExit, enteredUsers }: Props) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleEnter = () => onEnter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    onExit();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm("本当にアカウントを削除しますか？この操作は元に戻せません。")) return;
    await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div
      style={{
        position: "relative",
        padding: 24,
        maxWidth: 600,
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#f7f7f7",
      }}
    >
      {/* 右上にユーザーアイコンを常に表示（クリックでサイドバー） */}
      {user && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 72,
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            cursor: "pointer",
          }}
          onClick={() => setSidebarOpen(true)}
        >
          <Image
            src={user.iconFileName ? `/uploads/${user.iconFileName}` : "/file.svg"}
            alt={user.name}
            width={72}
            height={72}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              background: "#eee",
              aspectRatio: "1 / 1",
              display: "block",
              border: "2px solid #7bc062",
            }}
          />
        </div>
      )}

      {/* サイドバー */}
      {sidebarOpen && user && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "50vw", // スマホで画面の半分
            maxWidth: 360,
            minWidth: 220,
            height: "100vh",
            background: "#fff",
            boxShadow: "-4px 0 16px rgba(0,0,0,0.12)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 24,
            transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              top: 16,
              right: 24,
              fontSize: 56, // 2倍サイズ
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#888",
              lineHeight: 1,
            }}
            aria-label="サイドバーを閉じる"
          >
            ×
          </button>
          <div style={{ display: "flex", alignItems: "center", marginTop: 32, marginBottom: 32 }}>
            <Image
              src={user.iconFileName ? `/uploads/${user.iconFileName}` : "/file.svg"}
              alt={user.name}
              width={64}
              height={64}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                background: "#eee",
                border: "2px solid #7bc062",
                marginRight: 20,
              }}
            />
            <div style={{ fontSize: 22, fontWeight: 600 }}>{user.name}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              fontSize: 16,
              padding: "12px 24px",
              borderRadius: 8,
              background: "#fff",
              color: "#7bc062",
              border: "2px solid #7bc062",
              cursor: "pointer",
              fontWeight: "bold",
              marginBottom: 16,
            }}
          >
            ログアウト
          </button>
          <button
            onClick={handleDeleteAccount}
            style={{
              fontSize: 16,
              padding: "12px 24px",
              borderRadius: 8,
              background: "#e53935",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            アカウント削除
          </button>
        </div>
      )}

      {/* 入退室状態表示 */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 32,
          marginTop: 8,
          fontSize: 32,
          fontWeight: 700,
          color: entered ? "#7bc062" : "#e53935",
          letterSpacing: 2,
          transition: "all 0.2s",
        }}
      >
        {entered ? "入室中" : "退出中"}
      </div>
      {/* 入退室ボタン */}
      <div
        style={{
          height: 56,
          margin: "0 auto 24px auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {!entered ? (
          <button
            onClick={handleEnter}
            style={{ ...enterExitButtonStyle, background: "#7bc062" }}
          >
            入室
          </button>
        ) : (
          <button
            onClick={onExit}
            style={{ ...enterExitButtonStyle, background: "#e53935" }}
          >
            退室
          </button>
        )}
      </div>

      {/* テーブル上のアイコンと名前は非表示にする（削除） */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 24,
          minHeight: 112,
          transition: "opacity 0.2s",
          opacity: 0,
          visibility: "hidden",
          display: "none",
        }}
      />

      {/* 入室中ユーザー一覧テーブル */}
      <div style={{ marginTop: 0, minHeight: 300 }}>
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 0,
            textAlign: "center",
            width: "100%",
            tableLayout: "fixed",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <thead
            style={{
              height: "50px",
              color: "#f9fafb",
              fontSize: "20px",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <tr style={{ backgroundColor: "#7bc062" }}>
              <th
                style={{
                  fontSize: 16,
                  color: "#f9fafb",
                  padding: "12px 8px",
                  minWidth: 120,
                  whiteSpace: "nowrap",
                  wordBreak: "keep-all",
                }}
              >
                入室中ユーザー
              </th>
              <th
                style={{
                  fontSize: 16,
                  color: "#f9fafb",
                  padding: "12px 8px",
                  minWidth: 100,
                  whiteSpace: "nowrap",
                  wordBreak: "keep-all",
                }}
              >
                入室した時間
              </th>
            </tr>
          </thead>
          <tbody>
            {enteredUsers.map((u) => (
              <tr key={u.id}>
                <td
                  style={{
                    borderBottom: "2px solid #000000",
                    padding: "14px 18px",
                    fontSize: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "2px 0",
                    }}
                  >
                    <Image
                      src={u.iconFileName ? `/uploads/${u.iconFileName}` : "/file.svg"}
                      alt={u.name}
                      width={32}
                      height={32}
                      style={{
                        borderRadius: 16,
                        marginRight: 8,
                        objectFit: "cover",
                        background: "#eee",
                      }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        if (target && target.src !== "/file.svg") {
                          target.src = "/file.svg";
                        }
                      }}
                    />
                    <span style={{ fontSize: 20 }}>{u.name}</span>
                  </div>
                </td>
                <td
                  style={{
                    borderBottom: "2px solid #000000",
                    borderLeft: "2px solid #9ca3af",
                    padding: "14px 18px",
                    fontSize: 20,
                  }}
                >
                  {u.enteredAt ? formatDateTime(u.enteredAt) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDateTime(dt: string | Date | undefined): string {
  if (!dt) return "-";
  const date = typeof dt === "string" ? new Date(dt) : dt;
  if (isNaN(date.getTime())) return "-";
  const pad = (n: number) => n.toString().padStart(2, "0");
  // 年と秒を省略し、月/日 時:分 のみ表示
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
