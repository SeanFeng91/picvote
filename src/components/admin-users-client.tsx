"use client";

import { App, Button, Card, Form, Input, InputNumber, Space, Switch, Table, Tag } from "antd";
import { UploadOutlined, UserAddOutlined } from "@ant-design/icons";
import { FormEvent, useMemo, useState } from "react";

import { User } from "@/lib/types";

type AdminUsersClientProps = {
  initialUsers: User[];
};

export function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const { message } = App.useApp();
  const [users, setUsers] = useState(initialUsers);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csv, setCsv] = useState("");
  const [form] = Form.useForm();

  const filteredUsers = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter((user) => `${user.employeeNo} ${user.displayName} ${user.role}`.toLowerCase().includes(q));
  }, [keyword, users]);

  async function refreshUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    setUsers(payload.users);
  }

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
      message.error(payload.error || "保存失败");
      return;
    }
    message.success(`已更新 ${payload.user.employeeNo}`);
  }

  async function createUser(values: {
    employeeNo: string;
    displayName: string;
    accessCode: string;
    voteQuota?: number | null;
    canUpload: boolean;
    canVote: boolean;
  }) {
    setCreating(true);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const payload = await response.json();
    setCreating(false);
    if (!response.ok) {
      message.error(payload.error || "创建失败");
      return;
    }
    setUsers((current) => [...current, payload.user]);
    form.resetFields();
    message.success(`已新增账号 ${payload.user.employeeNo}`);
  }

  async function importUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImporting(true);
    const response = await fetch("/api/admin/users/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv })
    });
    const payload = await response.json();
    setImporting(false);
    if (!response.ok) {
      message.error(payload.error || "导入失败");
      return;
    }
    message.success(`导入完成：新增 ${payload.created}，更新 ${payload.updated}`);
    setCsv("");
    refreshUsers();
  }

  return (
    <div className="stack">
      <div className="dashboard-grid">
        <Card title="新增账号">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ accessCode: "demo123", canUpload: true, canVote: true }}
            onFinish={createUser}
          >
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Form.Item name="employeeNo" label="工号" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="displayName" label="姓名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="accessCode" label="登录口令" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="voteQuota" label="票数额度">
                <InputNumber min={0} style={{ width: "100%" }} placeholder="留空默认 5" />
              </Form.Item>
            </div>
            <Space wrap>
              <Form.Item name="canUpload" valuePropName="checked" noStyle>
                <Switch checkedChildren="允许上传" unCheckedChildren="禁止上传" />
              </Form.Item>
              <Form.Item name="canVote" valuePropName="checked" noStyle>
                <Switch checkedChildren="允许投票" unCheckedChildren="禁止投票" />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<UserAddOutlined />} loading={creating}>
                新增账号
              </Button>
            </Space>
          </Form>
        </Card>

        <Card title="批量导入 CSV">
          <form className="stack" onSubmit={importUsers}>
            <Input.TextArea
              rows={7}
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              placeholder={"工号,姓名,口令,票数,允许上传,允许投票\n10006,王然,demo123,5,是,是"}
            />
            <Button type="primary" htmlType="submit" icon={<UploadOutlined />} loading={importing}>
              导入 / 更新账号
            </Button>
          </form>
        </Card>
      </div>

      <Card
        title="账号与票数"
        extra={<Input.Search allowClear placeholder="搜索工号 / 姓名 / 角色" onSearch={setKeyword} onChange={(e) => setKeyword(e.target.value)} />}
      >
        <Table<User>
          className="compact-table"
          size="small"
          rowKey="id"
          dataSource={filteredUsers}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          columns={[
            { title: "工号", dataIndex: "employeeNo", width: 100, fixed: "left" },
            {
              title: "姓名",
              dataIndex: "displayName",
              render: (_value, user, index) => (
                <Input
                  value={user.displayName}
                  onChange={(event) =>
                    setUsers((current) =>
                      current.map((row) => (row.id === user.id ? { ...row, displayName: event.target.value } : row))
                    )
                  }
                  aria-label={`姓名 ${index + 1}`}
                />
              )
            },
            {
              title: "角色",
              dataIndex: "role",
              width: 110,
              render: (role) => <Tag color={role === "admin" ? "red" : role === "special" ? "purple" : "blue"}>{role}</Tag>
            },
            {
              title: "上传",
              dataIndex: "canUpload",
              width: 110,
              render: (_value, user) => (
                <Switch
                  checked={user.canUpload}
                  onChange={(canUpload) =>
                    setUsers((current) => current.map((row) => (row.id === user.id ? { ...row, canUpload } : row)))
                  }
                />
              )
            },
            {
              title: "投票",
              dataIndex: "canVote",
              width: 110,
              render: (_value, user) => (
                <Switch
                  checked={user.canVote}
                  onChange={(canVote) =>
                    setUsers((current) => current.map((row) => (row.id === user.id ? { ...row, canVote } : row)))
                  }
                />
              )
            },
            {
              title: "票数",
              dataIndex: "voteQuota",
              width: 130,
              render: (_value, user) => (
                <InputNumber
                  min={0}
                  value={user.voteQuota}
                  placeholder="默认"
                  onChange={(voteQuota) =>
                    setUsers((current) =>
                      current.map((row) =>
                        row.id === user.id ? { ...row, voteQuota: typeof voteQuota === "number" ? voteQuota : null } : row
                      )
                    )
                  }
                />
              )
            },
            {
              title: "操作",
              width: 100,
              render: (_value, user) => <Button onClick={() => saveUser(user)}>保存</Button>
            }
          ]}
          scroll={{ x: 980 }}
        />
      </Card>
    </div>
  );
}
