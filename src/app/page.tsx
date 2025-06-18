"use client";
import HomeForm from "@/Components/HomeForm";
import type { User } from "@/types/declaration";

const Home = () => {
  // 必要なpropsをここで定義し、HomeFormに渡す場合は下記のように記述できます。
  // 例:
  const user = null;
  const entered = false;
  const onEnter = () => {};
  const onExit = () => {};
  const enteredUsers: User[] = [];

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