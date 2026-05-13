"use client";

import { BarChartOutlined, FileSearchOutlined, TeamOutlined, TrophyOutlined } from "@ant-design/icons";
import { App, Button, Card, Select, Space, Statistic, Switch, Table, Tag, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";

import { Activity, Work } from "@/lib/types";

type AdminSummary = {
  activity: Activity;
  worksCount: number;
  totalVotes: number;
  votersCount: number;
  hiddenWorksCount: number;
  deletedWorksCount: number;
  ranking: Work[];
};

export function AdminDashboardClient({ summary }: { summary: AdminSummary }) {
  const { message } = App.useApp();
  const [activity, setActivity] = useState(summary.activity);
  const [saving, setSaving] = useState(false);

  async function saveActivity() {
    setSaving(true);
    const response = await fetch("/api/admin/activity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: activity.status,
        allowSelfVote: activity.allowSelfVote,
        showPublicVotes: activity.showPublicVotes
      })
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      message.error(payload.error || "保存失败");
      return;
    }
    setActivity(payload.activity);
    message.success("活动配置已更新");
  }

  return (
    <div className="stack">
      <div className="stats-grid">
        <Card size="small">
          <Statistic title="活动状态" value={activity.status} />
        </Card>
        <Card size="small">
          <Statistic title="有效作品" value={summary.worksCount} suffix="件" />
        </Card>
        <Card size="small">
          <Statistic title="有效投票" value={summary.totalVotes} suffix="票" />
        </Card>
        <Card size="small">
          <Statistic title="投票人数" value={summary.votersCount} suffix="人" />
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card title="活动控制" extra={<Button loading={saving} type="primary" onClick={saveActivity}>保存</Button>}>
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Space wrap>
              <Typography.Text strong>阶段</Typography.Text>
              <Select
                value={activity.status}
                style={{ width: 180 }}
                onChange={(status) => setActivity((current) => ({ ...current, status }))}
                options={[
                  { label: "未开始", value: "draft" },
                  { label: "上传中", value: "uploading" },
                  { label: "投票中", value: "voting" },
                  { label: "已截止", value: "closed" },
                  { label: "结果公示", value: "published" }
                ]}
              />
              <Switch
                checkedChildren="允许自投"
                unCheckedChildren="禁止自投"
                checked={activity.allowSelfVote}
                onChange={(allowSelfVote) => setActivity((current) => ({ ...current, allowSelfVote }))}
              />
              <Switch
                checkedChildren="公开票数"
                unCheckedChildren="隐藏票数"
                checked={activity.showPublicVotes}
                onChange={(showPublicVotes) => setActivity((current) => ({ ...current, showPublicVotes }))}
              />
            </Space>
            <Space wrap>
              <Link href="/admin/users">
                <Button icon={<TeamOutlined />}>账号配置</Button>
              </Link>
              <Link href="/admin/works">
                <Button icon={<FileSearchOutlined />}>作品管理</Button>
              </Link>
              <Link href="/admin/votes">
                <Button icon={<BarChartOutlined />}>投票明细</Button>
              </Link>
              <Link href="/display?mode=ranking">
                <Button icon={<TrophyOutlined />}>大屏排名</Button>
              </Link>
            </Space>
            <Space wrap>
              <Tag color="orange">隐藏作品 {summary.hiddenWorksCount}</Tag>
              <Tag color="red">已删除作品 {summary.deletedWorksCount}</Tag>
              <Tag color="blue">默认票数 {activity.defaultVoteQuota}</Tag>
            </Space>
          </Space>
        </Card>

        <Card title="实时前五">
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={summary.ranking}
            columns={[
              { title: "#", render: (_value, _record, index) => index + 1, width: 48 },
              { title: "编号", dataIndex: "code", width: 80 },
              { title: "作品", dataIndex: "title" },
              { title: "票数", dataIndex: "voteCountCache", align: "right", width: 90 }
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
