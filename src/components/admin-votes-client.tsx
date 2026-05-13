"use client";

import { Card, Input, Space, Table, Tag } from "antd";
import { useMemo, useState } from "react";

import { Vote } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function AdminVotesClient({ initialVotes }: { initialVotes: Vote[] }) {
  const [keyword, setKeyword] = useState("");
  const filteredVotes = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return initialVotes;
    }
    return initialVotes.filter((vote) =>
      `${vote.voterEmployeeNo} ${vote.workCode} ${vote.status} ${vote.reason ?? ""}`.toLowerCase().includes(q)
    );
  }, [initialVotes, keyword]);

  return (
    <Card
      title="投票明细"
      extra={<Input.Search allowClear placeholder="搜索工号 / 作品编号 / 状态" onSearch={setKeyword} onChange={(e) => setKeyword(e.target.value)} />}
    >
      <Table<Vote>
        className="compact-table"
        size="small"
        rowKey="id"
        dataSource={filteredVotes}
        pagination={{ pageSize: 30, showSizeChanger: true }}
        columns={[
          { title: "时间", dataIndex: "createdAt", width: 170, render: (value: string) => formatDate(value) },
          { title: "投票人工号", dataIndex: "voterEmployeeNo", width: 120 },
          { title: "作品编号", dataIndex: "workCode", width: 100 },
          { title: "票数", dataIndex: "count", width: 80, align: "right" },
          {
            title: "状态",
            dataIndex: "status",
            width: 120,
            render: (status: Vote["status"], vote) => (
              <Space>
                <Tag color={status === "valid" ? "green" : "red"}>{status === "valid" ? "有效" : "作废"}</Tag>
                {vote.reason ? <span className="hint">{vote.reason}</span> : null}
              </Space>
            )
          }
        ]}
        scroll={{ x: 760 }}
      />
    </Card>
  );
}
