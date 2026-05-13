"use client";

import { useState } from "react";

import { Work } from "@/lib/types";

type AdminWorksClientProps = {
  initialWorks: Work[];
};

export function AdminWorksClient({ initialWorks }: AdminWorksClientProps) {
  const [works, setWorks] = useState(initialWorks);
  const [message, setMessage] = useState("");

  async function deleteWork(workId: string) {
    const response = await fetch(`/api/admin/works/${workId}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "删除失败");
      return;
    }
    setWorks((current) => current.filter((work) => work.id !== workId));
    setMessage(`已删除作品 ${payload.work.code}`);
  }

  return (
    <div className="panel card stack">
      <table className="table">
        <thead>
          <tr>
            <th>编号</th>
            <th>作品</th>
            <th>上传人工号</th>
            <th>状态</th>
            <th>票数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {works.map((work) => (
            <tr key={work.id}>
              <td>{work.code}</td>
              <td>
                <strong>{work.title}</strong>
                <div className="hint">{work.originalFileName}</div>
              </td>
              <td>{work.ownerEmployeeNo}</td>
              <td>{work.status}</td>
              <td>{work.voteCountCache}</td>
              <td>
                <button className="button-danger" onClick={() => deleteWork(work.id)}>
                  人工删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {message ? <div className="success">{message}</div> : null}
    </div>
  );
}
