import assert from "node:assert/strict";
import { test } from "node:test";
import jobsPayload from "../example.json" with { type: "json" };
import { buildJobGraph, classifyJob, cleanJobTitle, extractSkills } from "./jobGraph.js";

test("builds graph from example.json", () => {
  const graph = buildJobGraph(jobsPayload);

  assert.equal(graph.jobs.length, 490);
  assert.equal(graph.stats.completeJobs, 490);
  assert.ok(graph.categories.length >= 10);
  assert.ok(graph.skills.length > 20);
  assert.equal(graph.jobsByCategory.get("category:frontend").every((job) => job.categoryId === "category:frontend"), true);
});

test("classifies game development jobs as client", () => {
  assert.equal(classifyJob("抖音游戏研发专家", ""), "client");
  assert.equal(classifyJob("XR系统应用开发工程师", ""), "client");
});

test("classifies compiler infrastructure and high performance network jobs as systems", () => {
  assert.equal(classifyJob("RISC-V高级编译器工程师", ""), "systems");
  assert.equal(classifyJob("AI基础设施架构师/高级AI基础设施研究员", ""), "systems");
  assert.equal(classifyJob("高性能网络研发工程师", ""), "systems");
  assert.equal(classifyJob("AI性能优化工程师/专家", ""), "systems");
  assert.equal(classifyJob("系统内核工程师", ""), "systems");
  assert.equal(classifyJob("训练性能优化专家", ""), "systems");
  assert.equal(classifyJob("数据中心网络架构师", ""), "systems");
  assert.equal(classifyJob("弹性计算系统高级研发工程师/专家", ""), "systems");
  assert.equal(classifyJob("AI存储研发工程师", ""), "systems");
  assert.equal(classifyJob("高性能计算平台开发工程师", ""), "systems");
});

test("splits hardware jobs from system and network jobs", () => {
  assert.equal(classifyJob("GPU驱动开发工程师", ""), "hardware");
  assert.equal(classifyJob("芯片SoC硬件工程师", ""), "hardware");
  assert.equal(classifyJob("Linux内核系统软件工程师", ""), "systems");
});

test("classifies server-side test development jobs as testing", () => {
  assert.equal(classifyJob("测试开发工程师（服务端）", ""), "testing");
});

test("applies manual job category review overrides", () => {
  const graph = buildJobGraph({
    items: [
      { job_id: "7592888600183163141", title: "显示驱动工程师-PICO", description: "", requirement: "" },
      { job_id: "7582165993067874565", title: "高级测试开发工程师-AI芯片", description: "", requirement: "" },
    ],
  });

  assert.equal(graph.jobs[0].categoryKey, "systems");
  assert.equal(graph.jobs[1].categoryKey, "testing");
});

test("splits ai agent jobs from general algorithm", () => {
  assert.equal(classifyJob("大模型Agent算法工程师-火山方舟", ""), "ai_agent");
  assert.equal(classifyJob("后端开发工程师（AI Agent方向）-安全与风控", ""), "ai_agent");
  assert.equal(classifyJob("推荐算法工程师-番茄", ""), "algorithm");
});

test("classifies risk control algorithm engineer as algorithm", () => {
  assert.equal(classifyJob("信贷风控算法工程师-国际支付", ""), "algorithm");
  assert.equal(classifyJob("机器学习/检测算法高级工程师/专家-安全与风控", ""), "algorithm");
  assert.equal(classifyJob("机器流量反作弊算法工程师-Data", ""), "algorithm");
  assert.equal(classifyJob("高级算法工程师-抖音风控", ""), "algorithm");
});

test("merges database jobs into data category", () => {
  assert.equal(classifyJob("数据库管控资深架构师", ""), "data");
});

test("classifies CADD AI pharma jobs as other", () => {
  assert.equal(classifyJob("CADD专家-AI制药", ""), "other");
});

test("removes department suffix from displayed job titles", () => {
  assert.equal(cleanJobTitle("后端开发工程师-抖音直播"), "后端开发工程师");
  assert.equal(cleanJobTitle("机器流量反作弊算法工程师-Data"), "机器流量反作弊算法工程师");
  assert.equal(cleanJobTitle("前端开发工程师-TRAE"), "前端开发工程师");
  assert.equal(cleanJobTitle("AI-Agent 工程师"), "AI-Agent 工程师");
  assert.equal(cleanJobTitle("豆包后端开发工程师-抖音直播"), "后端开发工程师");
});

test("deduplicates aliases inside one job", () => {
  const skills = extractSkills("熟悉 Go / Golang / Go语言，了解 K8s 和 Kubernetes。");

  assert.equal(skills.filter((skill) => skill === "Go").length, 1);
  assert.equal(skills.filter((skill) => skill === "Kubernetes").length, 1);
});

test("extracts C separately from C++", () => {
  const slashSkills = extractSkills("熟悉 C/C++ 系统开发。");
  const cppOnlySkills = extractSkills("熟悉 C++ 系统开发。");

  assert.ok(slashSkills.includes("C"));
  assert.ok(slashSkills.includes("C++"));
  assert.equal(cppOnlySkills.includes("C"), false);
  assert.ok(cppOnlySkills.includes("C++"));
});

test("extracts ios swift and rust skills", () => {
  const skills = extractSkills("熟悉 IOS、Swift、Rust、Flutter 开发。");

  assert.ok(skills.includes("iOS"));
  assert.ok(skills.includes("Swift"));
  assert.ok(skills.includes("Rust"));
  assert.ok(skills.includes("Flutter"));
});

test("extracts mobile embedded and driver skills", () => {
  const skills = extractSkills("熟悉 Android/Linux/RTOS/Sensor/驱动开发。");

  assert.ok(skills.includes("Android"));
  assert.ok(skills.includes("Linux"));
  assert.ok(skills.includes("RTOS"));
  assert.ok(skills.includes("Sensor"));
  assert.ok(skills.includes("驱动开发"));
});

test("extracts hardware io skills", () => {
  const skills = extractSkills("熟悉 PCIe、RDMA、TCP/IP、BGP、VXLAN 高性能通信。");

  assert.ok(skills.includes("PCIe"));
  assert.ok(skills.includes("RDMA"));
  assert.ok(skills.includes("TCP/IP"));
  assert.ok(skills.includes("BGP"));
  assert.ok(skills.includes("VXLAN"));
});

test("keeps ReAct and React as separate skills", () => {
  assert.deepEqual(extractSkills("熟悉 ReAct Agent 推理范式。").filter((skill) => /React|ReAct/.test(skill)), ["ReAct"]);
  assert.deepEqual(extractSkills("熟悉 React 前端框架。").filter((skill) => /React|ReAct/.test(skill)), ["React"]);
});

test("extracts Svelte as a frontend skill", () => {
  assert.ok(extractSkills("熟悉 Svelte 和现代前端工程化。").includes("Svelte"));
});

test("extracts reverse engineering and profiling tools", () => {
  const skills = extractSkills("熟悉 IDA/WinDBG/XPERF 等调试和性能分析工具。");

  assert.ok(skills.includes("IDA"));
  assert.ok(skills.includes("WinDBG"));
  assert.ok(skills.includes("XPERF"));
});

test("extracts nvidia gpu debugging tools", () => {
  const skills = extractSkills("熟悉 Nvml/NVIDIA-smi/CUDA-gdb 等 GPU 调试工具。");

  assert.ok(skills.includes("NVML"));
  assert.ok(skills.includes("NVIDIA-SMI"));
  assert.ok(skills.includes("CUDA-GDB"));
});

test("extracts storage middleware from slash-separated text", () => {
  const skills = extractSkills("熟悉 Redis/RocksDB/pika/Ceph/NoSQL 等存储组件。");

  assert.ok(skills.includes("Redis"));
  assert.ok(skills.includes("RocksDB"));
  assert.ok(skills.includes("Pika"));
  assert.ok(skills.includes("Ceph"));
  assert.ok(skills.includes("NoSQL"));
});

test("extracts specific agent and AIGC skills independently", () => {
  const skills = extractSkills("负责 AIGC、Multi Agent、Agent Infra 和 Tool Use 能力建设。");

  assert.ok(skills.includes("AIGC"));
  assert.ok(skills.includes("Multi Agent"));
  assert.ok(skills.includes("Agent Infra"));
  assert.ok(skills.includes("Tool Use"));
  assert.ok(skills.includes("Agent"));
});

test("keeps RL and RLHF as separate skills", () => {
  const skills = extractSkills("熟悉 RL、RLHF 和强化学习训练流程。");

  assert.ok(skills.includes("RL"));
  assert.ok(skills.includes("RLHF"));
});

test("extracts Transformer skill", () => {
  const skills = extractSkills("熟悉 Transformer / Transformers 架构和训练优化。");

  assert.ok(skills.includes("Transformer"));
});

test("does not extract security risk control as a skill", () => {
  const skills = extractSkills("负责安全、风控、反作弊、反欺诈策略建设。");

  assert.equal(skills.includes("安全风控"), false);
});

test("extracts prompt and agent framework skills", () => {
  const skills = extractSkills("有 Prompt engineering、Fine-Tuning、Lang Graph、CrewAI、OpenClaw 实践经验。");

  assert.ok(skills.includes("Prompt Engineering"));
  assert.ok(skills.includes("Fine-Tuning"));
  assert.ok(skills.includes("LangGraph"));
  assert.ok(skills.includes("CrewAI"));
  assert.ok(skills.includes("OpenClaw"));
});

test("scales category and skill radii by frequency", () => {
  const graph = buildJobGraph(jobsPayload);
  const backend = graph.categories.find((category) => category.key === "backend");
  const frontend = graph.categories.find((category) => category.key === "frontend");
  const other = graph.categories.find((category) => category.key === "other");
  const backendCount = graph.jobs.filter((job) => job.categoryId === backend.id).length;
  const frontendCount = graph.jobs.filter((job) => job.categoryId === frontend.id).length;
  const topSkill = graph.skills[0];
  const bottomSkill = graph.skills.at(-1);

  assert.ok(backend.radius > other.radius);
  assert.ok(backend.radius ** 3 > frontend.radius ** 3 * (backendCount / frontendCount) * 0.9);
  assert.ok(topSkill.radius > bottomSkill.radius);
});

test("builds category-specific skill colors and radii", () => {
  const graph = buildJobGraph(jobsPayload);
  const category = [...graph.categories].sort(
    (a, b) => (graph.skillRankingByCategory.get(a.id)?.length || 0) - (graph.skillRankingByCategory.get(b.id)?.length || 0),
  )[0];
  const ranking = graph.skillRankingByCategory.get(category.id);
  const categoryVisuals = graph.skillVisualsByCategory.get(category.id);
  const topSkill = ranking[0];
  const rankedIds = new Set(ranking.map((skill) => skill.id));
  const missingSkill = graph.skills.find((skill) => !rankedIds.has(skill.id));

  assert.equal(categoryVisuals.get(topSkill.id).count, topSkill.count);
  assert.equal(categoryVisuals.get(topSkill.id).color, "#ff5f57");
  assert.ok(Math.abs(categoryVisuals.get(topSkill.id).radius - 1.47) < 0.0001);
  assert.ok(missingSkill);
  assert.equal(categoryVisuals.get(missingSkill.id).count, 0);
  assert.equal(categoryVisuals.get(missingSkill.id).color, "#6ee7a8");
  assert.equal(categoryVisuals.get(missingSkill.id).radius, 0.42);
  assert.ok(graph.globalSkillVisuals.get(missingSkill.id).radius > categoryVisuals.get(missingSkill.id).radius);
});

test("places category ring in descending job count order", () => {
  const graph = buildJobGraph(jobsPayload);
  const positionedCategories = [...graph.categories].sort((a, b) => {
    const normalizedA = (Math.atan2(a.z, a.x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
    const normalizedB = (Math.atan2(b.z, b.x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
    return normalizedA - normalizedB;
  });
  const expectedCategories = [...graph.categories].sort((a, b) => {
    const countDiff = (graph.jobsByCategory.get(b.id)?.length || 0) - (graph.jobsByCategory.get(a.id)?.length || 0);
    return countDiff || a.label.localeCompare(b.label);
  });

  assert.deepEqual(
    positionedCategories.map((category) => category.id),
    expectedCategories.map((category) => category.id),
  );
});

test("assigns skill colors by frequency level", () => {
  const graph = buildJobGraph(jobsPayload);
  const topSkill = graph.skills[0];
  const bottomSkill = graph.skills.at(-1);

  assert.equal(topSkill.level, 4);
  assert.equal(topSkill.color, "#ff5f57");
  assert.equal(bottomSkill.level, 1);
  assert.equal(bottomSkill.color, "#6ee7a8");
});

test("indexes jobs by skill and category", () => {
  const graph = buildJobGraph(jobsPayload);
  const python = graph.skills.find((skill) => skill.label === "Python");
  const pythonJobs = graph.jobsBySkill.get(python.id);
  const groupedCount = [...graph.jobsBySkillAndCategory.get(python.id).values()].reduce((total, jobs) => total + jobs.length, 0);

  assert.equal(pythonJobs.length, python.count);
  assert.equal(groupedCount, python.count);
});

test("adds JavaScript to every frontend job", () => {
  const graph = buildJobGraph(jobsPayload);
  const javascript = graph.skills.find((skill) => skill.label === "JavaScript");
  const frontendJobs = graph.jobsByCategory.get("category:frontend");
  const frontendJavaScriptJobs = graph.jobsBySkillAndCategory.get(javascript.id).get("category:frontend");

  assert.equal(frontendJavaScriptJobs.length, frontendJobs.length);
  assert.ok(javascript.count >= frontendJobs.length);
});

test("handles empty descriptions and requirements", () => {
  const graph = buildJobGraph({
    items: [{ title: "前端开发工程师", job_id: "1", url: "", description: "", requirement: "" }],
  });

  assert.equal(graph.jobs.length, 1);
  assert.equal(graph.jobs[0].categoryId, "category:frontend");
  assert.equal(graph.stats.completeRate, 0);
});
