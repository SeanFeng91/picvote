"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginFormProps = {
  title: string;
  subtitle: string;
  intent: "user" | "admin";
  returnTo?: string;
};

export function LoginForm({ title, subtitle, intent, returnTo }: LoginFormProps) {
  const router = useRouter();
  const [employeeNo, setEmployeeNo] = useState(intent === "admin" ? "90001" : "10001");
  const [accessCode, setAccessCode] = useState(intent === "admin" ? "admin123" : "demo123");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeNo, accessCode, intent, returnTo })
    });

    const payload = await response.json();
    if (!response.ok) {
      setPending(false);
      setMessage(payload.error || "登录失败");
      return;
    }

    router.push(payload.redirectTo);
    router.refresh();
  }

  return (
    <div className="page-shell" style={{ maxWidth: 520 }}>
      <div className="panel hero-panel stack">
        <div className="brand-lockup">
          <span className="eyebrow">Vivo Pic Vote</span>
          <h1 className="headline">{title}</h1>
          <p className="subtle" style={{ margin: 0 }}>
            {subtitle}
          </p>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="stack">
            <span>工号</span>
            <input className="input" value={employeeNo} onChange={(event) => setEmployeeNo(event.target.value)} />
          </label>
          <label className="stack">
            <span>{intent === "admin" ? "管理员口令" : "登录口令"}</span>
            <input
              className="input"
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
            />
          </label>
          <button className="button" type="submit" disabled={pending}>
            {pending ? "登录中..." : "进入系统"}
          </button>
          <div className="hint">
            演示账号：普通用户 `10001 / demo123`，管理员 `90001 / admin123`
          </div>
          {message ? <div className="warning">{message}</div> : null}
        </form>
      </div>
    </div>
  );
}
