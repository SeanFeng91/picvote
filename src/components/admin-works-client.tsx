"use client";

import { App, Button, Card, Image, Input, Select, Space, Table, Tag } from "antd";
import { DeleteOutlined, EyeInvisibleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";

import { Work, WorkStatus } from "@/lib/types";

type AdminWorksClientProps = {
  initialWorks: Work[];
};

const statusOptions: { label: string; value: WorkStatus }[] = [
  { label: "正常", value: "active" },
  { label: "隐藏", value: "hidden" },
  { label: "已删除", value: "deleted" },
  { label: "下架", value: "rejected" }
];

function statusColor(status: WorkStatus) {
  if (status === "active") return "green";
  if (status === "hidden") return "orange";
  if (status === "rejected") return "red";
  return "default";
}

export function AdminWorksClient({ initialWorks }: AdminWorksClientProps) {
  const { message, modal } = App.useApp();
  const [works, setWorks] = useState(initialWorks);
  const [keyword, setKeyword] = useState("");

  const filteredWorks = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return works;
    }
    return works.filter((work) =>
      `${work.code} ${work.title} ${work.ownerEmployeeNo} ${work.ownerDisplayName} ${work.status}`.toLowerCase().includes(q)
    );
  }, [keyword, works]);

  async function updateStatus(work: Work, status: WorkStatus) {
    const response = await fetch(`/api/admin/works/${work.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const payload = await response.json();
    if (!response.ok) {
      message.error(payload.error || "更新失败");
      return;
    }
    setWorks((current) => current.map((item) => (item.id === work.id ? payload.work : item)));
    message.success(`已更新 ${work.code}`);
  }

  async function deleteWork(work: Work) {
    modal.confirm({
      title: `人工删除 ${work.code}`,
      content: "删除后作品会从相册移除，对应有效票会作废。此操作会保留审计记录。",
      okText: "确认删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      async onOk() {
        const response = await fetch(`/api/admin/works/${work.id}`, { method: "DELETE" });
        const payload = await response.json();
        if (!response.ok) {
          message.error(payload.error || "删除失败");
          return;
        }
        setWorks((current) => current.map((item) => (item.id === work.id ? payload.work : item)));
        message.success(`已删除作品 ${payload.work.code}`);
      }
    });
  }

  return (
    <Card
      title="作品管理"
      extra={<Input.Search allowClear placeholder="搜索编号 / 标题 / 工号 / 状态" onSearch={setKeyword} onChange={(e) => setKeyword(e.target.value)} />}
    >
      <Table<Work>
        className="compact-table"
        rowKey="id"
        size="small"
        dataSource={filteredWorks}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        columns={[
          { title: "编号", dataIndex: "code", width: 82, fixed: "left" },
          {
            title: "预览",
            width: 74,
            render: (_value, work) =>
              work.mediaType === "image" ? (
                <Image src={work.previewUrl} alt={work.title} width={48} height={48} style={{ objectFit: "cover", borderRadius: 6 }} />
              ) : (
                <video src={work.mediaUrl} muted playsInline style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
              )
          },
          {
            title: "作品",
            dataIndex: "title",
            render: (_value, work) => (
              <Space direction="vertical" size={0}>
                <strong>{work.title}</strong>
                <span className="hint">{work.originalFileName}</span>
              </Space>
            )
          },
          { title: "上传人工号", dataIndex: "ownerEmployeeNo", width: 110 },
          { title: "上传人", dataIndex: "ownerDisplayName", width: 110 },
          {
            title: "状态",
            dataIndex: "status",
            width: 120,
            render: (status: WorkStatus) => <Tag color={statusColor(status)}>{status}</Tag>
          },
          { title: "票数", dataIndex: "voteCountCache", width: 90, align: "right" },
          {
            title: "改状态",
            width: 150,
            render: (_value, work) => (
              <Select
                size="small"
                value={work.status}
                style={{ width: 118 }}
                options={statusOptions}
                onChange={(status) => updateStatus(work, status)}
              />
            )
          },
          {
            title: "操作",
            width: 190,
            render: (_value, work) => (
              <Space>
                <Button size="small" icon={<EyeInvisibleOutlined />} onClick={() => updateStatus(work, "hidden")}>
                  隐藏
                </Button>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => updateStatus(work, "active")}>
                  恢复
                </Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteWork(work)}>
                  删除
                </Button>
              </Space>
            )
          }
        ]}
        scroll={{ x: 1180 }}
      />
    </Card>
  );
}
