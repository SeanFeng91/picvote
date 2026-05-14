"use client";

import { RollbackOutlined } from "@ant-design/icons";
import { App, Button, Card, Space, Table, Tag } from "antd";
import Link from "next/link";
import { useState, useTransition } from "react";

import { formatDate } from "@/lib/format";
import { Vote } from "@/lib/types";

export function MyVotesClient({ initialVotes }: { initialVotes: Vote[] }) {
  const { message } = App.useApp();
  const [votes, setVotes] = useState(initialVotes);
  const [pending, startTransition] = useTransition();

  function revoke(vote: Vote) {
    startTransition(async () => {
      const response = await fetch("/api/votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteId: vote.id })
      });
      const payload = await response.json();
      if (!response.ok) {
        message.error(payload.error || "撤回失败");
        return;
      }
      setVotes((current) => current.map((item) => (item.id === vote.id ? payload.vote : item)));
      message.success(`已撤回 ${vote.count} 票`);
    });
  }

  return (
    <Card
      title="我的投票记录"
      extra={
        <Space wrap>
          <Link href="/">
            <Button>首页</Button>
          </Link>
          <Link href="/gallery">
            <Button>相册</Button>
          </Link>
        </Space>
      }
    >
      <Table<Vote>
        className="compact-table"
        size="small"
        rowKey="id"
        dataSource={votes}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        columns={[
          { title: "时间", dataIndex: "createdAt", width: 168, render: (value: string) => formatDate(value) },
          {
            title: "作品",
            dataIndex: "workCode",
            width: 110,
            render: (code: string) => (
              <Link href={`/works/${code}`}>
                <Button size="small" type="link">
                  {code}
                </Button>
              </Link>
            )
          },
          { title: "票数", dataIndex: "count", width: 80, align: "right" },
          {
            title: "状态",
            dataIndex: "status",
            width: 150,
            render: (_status: Vote["status"], vote) => (
              <Space>
                <Tag color={vote.status === "valid" ? "green" : "default"}>
                  {vote.status === "valid" ? "有效" : "已撤回"}
                </Tag>
                {vote.reason ? <span className="hint">{vote.reason}</span> : null}
              </Space>
            )
          },
          {
            title: "操作",
            width: 120,
            render: (_value, vote) => (
              <Button
                size="small"
                icon={<RollbackOutlined />}
                loading={pending}
                disabled={vote.status !== "valid"}
                onClick={() => revoke(vote)}
              >
                撤回
              </Button>
            )
          }
        ]}
        scroll={{ x: 620 }}
      />
    </Card>
  );
}
