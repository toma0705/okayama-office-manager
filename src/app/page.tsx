"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomeForm from "@/Components/HomeForm";
import type { User } from "@/types/declaration";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [entered] = useState(false);
  const [enteredUsers, setEnteredUsers] = useState<User[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // ユーザー情報取得APIを叩く
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setEnteredUsers(data.enteredUsers || []);
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });
  }, [router]);

  const onEnter = () => {};
  const onExit = () => {};

  return (
    <div>
      <HomeForm
        user={user}
        entered={entered}
        onEnter={onEnter}
        onExit={onExit}
        enteredUsers={enteredUsers}
      />
    </div>
  );
};

export default Home;