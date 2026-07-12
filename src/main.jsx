import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Analytics, track } from "@vercel/analytics/react";
import { Activity, ArrowDownRight, BriefcaseBusiness, Layers3, Search, Sparkles } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import jobsPayload from "../bytedance_jobs.json";
import { buildJobGraph } from "./jobGraph.js";
import { JobGalaxy } from "./JobGalaxy.jsx";
import "./styles.css";

function App() {
  const graph = useMemo(() => buildJobGraph(jobsPayload), []);
  const [selected, setSelected] = useState(() => {
    const backend = graph.categories.find((category) => category.key === "backend");
    return backend ? { id: backend.id, type: backend.type } : null;
  });
  const handleSelect = useCallback((nextSelection) => {
    const node = graph.nodeById.get(nextSelection.id);
    track("graph_node_selected", {
      node_type: nextSelection.type,
      node_label: node?.label || nextSelection.id,
    });
    setSelected((current) =>
      current?.type === "category" && nextSelection?.type === "category" && current.id === nextSelection.id
        ? null
        : nextSelection,
    );
  }, [graph]);

  const selectedNode = selected ? graph.nodeById.get(selected.id) : null;
  const selectedCategory =
    selectedNode?.type === "category"
      ? selectedNode
      : selectedNode?.type === "job"
        ? graph.nodeById.get(selectedNode.categoryId)
        : null;

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="JobCloud 首页">
          <span className="brand-mark"><Sparkles size={16} /></span>
          <strong>JobCloud</strong>
          <small>岗位技能情报站</small>
        </a>
        <a className="header-link" href="#explore">
          探索图谱 <ArrowDownRight size={15} />
        </a>
      </header>

      <section className="hero-panel" id="top">
        <div className="title-block">
          <span className="eyebrow"><span /> 真实岗位数据 · 动态技能图谱</span>
          <h1>看见岗位之间的<br /><em>隐形连接</em></h1>
          <p>
            把分散的职位描述变成一张可探索的技能星图。快速比较岗位大类、技能热度与职业方向，找到下一步最值得投入的能力。
          </p>
          <a className="hero-cta" href="#explore" onClick={() => track("explore_started")}>
            开始探索 <ArrowDownRight size={17} />
          </a>
        </div>
        <div className="metric-grid" aria-label="数据概览">
          <Metric icon={<BriefcaseBusiness />} label="岗位" value={graph.stats.totalJobs} />
          <Metric icon={<Layers3 />} label="大类" value={graph.categories.length} />
          <Metric icon={<Activity />} label="技能" value={graph.skills.length} />
          <Metric icon={<Search />} label="完整度" value={`${graph.stats.completeRate}%`} />
        </div>
      </section>

      <section className="workspace" id="explore">
        <div className="scene-wrap">
          <JobGalaxy graph={graph} selected={selected} onSelect={handleSelect} />
        </div>
        <InfoPanel graph={graph} selectedNode={selectedNode} selectedCategory={selectedCategory} />
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <span className="metric-icon">{React.cloneElement(icon, { size: 18 })}</span>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function InfoPanel({ graph, selectedNode, selectedCategory }) {
  if (!selectedNode) {
    return (
      <InfoShell graph={graph}>
        <div className="panel-section">
          <p className="panel-kicker">默认视图</p>
          <h2>所有大类技能频次</h2>
          <p className="muted">
            当前为全链接状态，展示全部大类下技能提及次数的汇总排序。点击大类或职位可以进入局部关系视图。
          </p>
        </div>
        <TopSkillList title="全部技能频次" skills={graph.globalSkillRanking} />
      </InfoShell>
    );
  }

  if (selectedNode.type === "category") {
    return <CategoryPanel graph={graph} category={selectedNode} />;
  }

  if (selectedNode.type === "job") {
    const job = selectedNode;
    const ranking = graph.skillRankingByCategory.get(job.categoryId) || [];
    const categoryFrequency = new Map(ranking.map((item) => [item.id, item.count]));
    const sortedSkills = job.skillIds
      .map((id) => graph.nodeById.get(id))
      .filter(Boolean)
      .sort((a, b) => (categoryFrequency.get(b.id) || 0) - (categoryFrequency.get(a.id) || 0));

    return (
      <InfoShell graph={graph} activeCategoryId={selectedCategory?.id}>
        <div className="panel-section">
          <p className="panel-kicker">职位</p>
          <h2>{job.label}</h2>
          <p className="muted">所属大类：{selectedCategory?.label || "其他"}</p>
          <a
            className="primary-link"
            href={job.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackJobLink(job)}
          >
            查看原始岗位
          </a>
        </div>
        <div className="panel-section">
          <h3>技能要求</h3>
          {sortedSkills.length > 0 ? (
            <div className="skill-cloud">
              {sortedSkills.map((skill) => (
                <span key={skill.id}>
                  {skill.label}
                  <b>{categoryFrequency.get(skill.id) || 1}</b>
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">这条岗位没有命中当前技能词典，可在词典配置中补充关键词。</p>
          )}
        </div>
        <div className="panel-section">
          <h3>职位要求摘要</h3>
          <p className="requirement-text">{job.requirement || "暂无职位要求文本。"}</p>
        </div>
      </InfoShell>
    );
  }

  if (selectedNode.type === "skill") {
    return <SkillPanel graph={graph} skill={selectedNode} />;
  }

  return null;
}

function CategoryPanel({ graph, category }) {
  const jobs = graph.jobsByCategory.get(category.id) || [];
  const ranking = graph.skillRankingByCategory.get(category.id) || [];
  const [activeJobId, setActiveJobId] = useState(null);

  useEffect(() => {
    setActiveJobId(null);
  }, [category.id]);

  return (
    <InfoShell graph={graph} activeCategoryId={category.id}>
      <div className="panel-section">
        <p className="panel-kicker">岗位大类</p>
        <h2>{category.label}</h2>
        <p className="muted">
          共 {jobs.length} 个细分岗位，命中 {ranking.length} 个技能关键词。
        </p>
      </div>
      <TopSkillList title="该类技能频次" skills={ranking.slice(0, 10)} />
      <div className="panel-section">
        <h3>关联职位</h3>
        <div className="job-list">
          {jobs.slice(0, 30).map((job) => (
            <JobListItem
              key={job.id}
              job={job}
              category={category}
              active={job.id === activeJobId}
              onToggle={() => setActiveJobId((current) => (current === job.id ? null : job.id))}
            />
          ))}
        </div>
      </div>
    </InfoShell>
  );
}

function SkillPanel({ graph, skill }) {
  const jobs = graph.jobsBySkill.get(skill.id) || [];
  const groupedJobs = graph.categories
    .map((category) => ({
      category,
      jobs: graph.jobsBySkillAndCategory.get(skill.id)?.get(category.id) || [],
    }))
    .filter((group) => group.jobs.length > 0)
    .sort((a, b) => b.jobs.length - a.jobs.length || a.category.label.localeCompare(b.category.label));
  const [activeJobId, setActiveJobId] = useState(null);

  useEffect(() => {
    setActiveJobId(null);
  }, [skill.id]);

  return (
    <InfoShell graph={graph}>
      <div className="panel-section">
        <p className="panel-kicker">技能</p>
        <h2>{skill.label}</h2>
        <p className="muted">该技能被 {jobs.length} 个岗位提到。</p>
      </div>

      <div className="panel-section">
        <h3>相关岗位</h3>
        <div className="category-job-groups">
          {groupedJobs.map((group, index) => (
            <details key={group.category.id} className="category-job-group" open={index === 0}>
              <summary className="group-title">
                <span>{group.category.label}</span>
                <b>{group.jobs.length}</b>
              </summary>
              <div className="job-list">
                {group.jobs.map((job) => (
                  <JobListItem
                    key={job.id}
                    job={job}
                    category={group.category}
                    active={job.id === activeJobId}
                    onToggle={() => setActiveJobId((current) => (current === job.id ? null : job.id))}
                  />
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </InfoShell>
  );
}

function InfoShell({ graph, activeCategoryId, children }) {
  return (
    <aside className="info-panel">
      <CategoryPieChart graph={graph} activeCategoryId={activeCategoryId} />
      {children}
    </aside>
  );
}

const CategoryPieChart = React.memo(function CategoryPieChart({ graph, activeCategoryId }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const rows = useMemo(() => {
    const total = graph.stats.totalJobs || 1;
    return graph.categories
      .map((category) => {
        const count = graph.jobsByCategory.get(category.id)?.length || 0;
        return {
          id: category.id,
          label: category.label,
          name: category.label,
          color: category.color,
          count,
          value: count,
          percent: count / total,
        };
      })
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [graph]);

  useEffect(() => {
    const nextIndex = rows.findIndex((row) => row.id === activeCategoryId);
    setActiveIndex(nextIndex >= 0 ? nextIndex : null);
  }, [activeCategoryId, rows]);

  return (
    <div className="panel-section pie-section">
      <p className="panel-kicker">岗位分布</p>
      <div className="pie-layout">
        <div className="pie-chart" aria-label="岗位大类分布饼图">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                outerRadius="72%"
                paddingAngle={1}
                stroke="none"
                labelLine={false}
                label={renderCategoryPieLabel}
                shape={(props) => <ZoomablePieSector {...props} active={props.index === activeIndex} />}
                onClick={(_, index) => setActiveIndex((current) => (current === index ? null : index))}
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell key={row.id} fill={row.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pie-legend">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={`pie-row${index === activeIndex ? " active" : ""}`}
              style={{ "--pie-row-accent": row.color }}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <i style={{ background: row.color }} />
              <span>{row.label}</span>
              <b>{row.count}</b>
              <em>{formatPercent(row.percent)}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

function ZoomablePieSector({ active, cx, cy, ...props }) {
  return (
    <Sector
      {...props}
      cx={cx}
      cy={cy}
      className={`pie-sector${active ? " is-active" : ""}`}
      stroke={active ? "rgba(255, 255, 255, 0.9)" : "none"}
      strokeWidth={active ? 2 : 0}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    />
  );
}

const PIE_LABEL_Y_OFFSET = {
  其他: -9,
  "产品/项目": 7,
  运维: 10,
};

function renderCategoryPieLabel({ cx, cy, midAngle, outerRadius, name, payload }) {
  const angle = (-midAngle * Math.PI) / 180;
  const side = Math.cos(angle) >= 0 ? 1 : -1;
  const color = payload?.color || "#dce8f4";
  const edgeX = cx + Math.cos(angle) * (outerRadius + 2);
  const edgeY = cy + Math.sin(angle) * (outerRadius + 2);
  const bendX = cx + Math.cos(angle) * (outerRadius + 14);
  const labelY = cy + Math.sin(angle) * (outerRadius + 22) + (PIE_LABEL_Y_OFFSET[name] || 0);
  const lineEndX = bendX + side * 10;
  const textX = lineEndX + side * 3;

  return (
    <g>
      <polyline
        points={`${edgeX},${edgeY} ${bendX},${labelY} ${lineEndX},${labelY}`}
        fill="none"
        stroke={color}
        strokeOpacity="0.62"
      />
      <text
        className="pie-slice-label"
        x={textX}
        y={labelY}
        fill={color}
        textAnchor={side > 0 ? "start" : "end"}
        dominantBaseline="central"
      >
        {name}
      </text>
    </g>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="pie-tooltip">
      <strong>{row.label}</strong>
      <span>
        {row.count} 个岗位 · {formatPercent(row.percent)}
      </span>
    </div>
  );
}

function formatPercent(value) {
  return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

function JobListItem({ job, category, active, onToggle }) {
  return (
    <div className="job-list-item">
      <button className={active ? "active" : ""} type="button" onClick={onToggle}>
        {job.label}
      </button>
      {active ? <JobInfoCard job={job} category={category} embedded /> : null}
    </div>
  );
}

function JobInfoCard({ job, category, embedded = false }) {
  return (
    <div className={embedded ? "selected-job-card embedded" : "panel-section selected-job-card"}>
      <p className="panel-kicker">岗位信息</p>
      <h3>{job.label}</h3>
      <p className="muted">所属大类：{category?.label || "其他"}</p>
      <a
        className="primary-link"
        href={job.url}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackJobLink(job)}
      >
        查看原始岗位
      </a>
      <div className="job-detail-block">
        <h4>职位描述</h4>
        <p>{job.description || "暂无职位描述文本。"}</p>
      </div>
      <div className="job-detail-block">
        <h4>职位要求</h4>
        <p>{job.requirement || "暂无职位要求文本。"}</p>
      </div>
    </div>
  );
}

function TopSkillList({ title, skills }) {
  return (
    <div className="panel-section">
      <h3>{title}</h3>
      <div className="ranking">
        {skills.map((skill, index) => (
          <div key={skill.id} className="rank-row">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{skill.label}</strong>
            <em>{skill.count}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function trackJobLink(job) {
  track("job_link_opened", {
    job_id: job.id,
    job_title: job.label,
  });
}

createRoot(document.getElementById("root")).render(
  <>
    <App />
    <Analytics />
  </>,
);
