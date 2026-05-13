"use client";

import { FormEvent, useState } from "react";

import { User } from "@/lib/types";

type AdminUsersClientProps = {
  initialUsers: User[];
};

export function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    employeeNo: "",
    displayName: "",
    accessCode: "demo123",
    voteQuota: "",
    canUpload: true,
    canVote: true
  });

  async function saveUser(user: User) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: user.displayName,
        canUpload: user.canUpload,
        canVote: user.canVote,
        voteQuota: user.voteQuota
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "保存失败");
      return;
    }
    setMessage(`已更新 ${payload.user.employeeNo}`);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNo: form.employeeNo,
        displayName: form.displayName,
        accessCode: form.accessCode,
        voteQuota: form.voteQuota ? Number(form.voteQuota) : null,
        canUpload: form.canUpload,
        canVote: form.canVote
      })
    });
    const payload = await response.json();
    setCreating(false);
    if (!response.ok) {
      setMessage(payload.error || "创建失败");
      return;
    }
    setUsers((current) => [...current, payload.user]);
    setForm({
      employeeNo: "",
      displayName: "",
      accessCode: "demo123",
      voteQuota: "",
      canUpload: true,
      canVote: true
    });
    setMessage(`已新增账号 ${payload.user.employeeNo}`);
  }

  return (
    <div className="stack">
      <form className="panel card stack" onSubmit={createUser}>
        <div className="spread">
          <strong>新增账号</strong>
          <button className="button" type="submit" disabled={creating}>
            {creating ? "创建中..." : "新增账号"}
          </button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <input
            className="input"
            placeholder="工号"
            value={form.employeeNo}
            onChange={(event) => setForm((current) => ({ ...current, employeeNo: event.target.value }))}
          />
          <input
            className="input"
            placeholder="姓名"
            value={form.displayName}
            onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
          />
          <input
            className="input"
            placeholder="登录口令"
            value={form.accessCode}
            onChange={(event) => setForm((current) => ({ ...current, accessCode: event.target.value }))}
          />
          <input
            className="input"
            placeholder="票数额度，留空走默认 5 票"
            value={form.voteQuota}
            onChange={(event) => setForm((current) => ({ ...current, voteQuota: event.target.value }))}
          />
        </div>
        <div className="row">
          <label className="badge">
            <input
              type="checkbox"
              checked={form.canUpload}
              onChange={(event) => setForm((current) => ({ ...current, canUpload: event.target.checked }))}
            />
            允许上传
          </label>
          <label className="badge">
            <input
              type="checkbox"
              checked={form.canVote}
              onChange={(event) => setForm((current) => ({ ...current, canVote: event.target.checked }))}
            />
            允许投票
          </label>
        </div>
      </form>

      <div className="panel card">
        <table className="table">
          <thead>
            <tr>
              <th>工号</th>
              <th>姓名</th>
              <th>上传</th>
              <th>投票</th>
              <th>票数</th>
              <th>保存</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={user.id}>
                <td>{user.employeeNo}</td>
                <td>
                  <input
                    className="input"
                    value={user.displayName}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, displayName: event.target.value } : row
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={user.canUpload}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, canUpload: event.target.checked } : row
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={user.canVote}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, canVote: event.target.checked } : row
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    className="input"
                    value={user.voteQuota ?? ""}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, voteQuota: event.target.value ? Number(event.target.value) : null }
                            : row
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <button className="button-secondary" onClick={() => saveUser(user)}>
                    保存
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message ? <div className="success">{message}</div> : null}
    </div>
  );
}
