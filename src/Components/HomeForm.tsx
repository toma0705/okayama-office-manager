"use client";
import { useRouter } from "next/navigation";
import type { User } from "@/types/declaration";
import Image from "next/image";

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

  const handleEnter = () => onEnter(); 

  const handleLogout = () => {
    localStorage.removeItem("token");
    onExit();
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
      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          padding: "8px 20px",
          fontSize: 16,
          borderRadius: 8,
          background: "#fff",
          color: "#7bc062",
          border: "2px solid #7bc062",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        ログアウト
      </button>

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

      <div
        style={{
          textAlign: "center",
          marginBottom: 24,
          minHeight: 112,
          transition: "opacity 0.2s",
          opacity: user && entered ? 1 : 0,
          visibility: user && entered ? "visible" : "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {user && entered && (
          <>
            <Image
              src={user.iconFileName ? `/uploads/${user.iconFileName}` : "/file.svg"}
              alt={user.name}
              width={80}
              height={80}
              style={{
                borderRadius: "50%",
                marginBottom: 16,
                objectFit: "cover",
                background: "#eee",
                aspectRatio: "1 / 1",
                display: "block",
              }}
            />
            <div style={{ fontSize: 20, fontWeight: 600 }}>{user.name}</div>
          </>
        )}
      </div>

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
