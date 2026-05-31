# watchme 工作区

这个目录用于承载当前半成品项目的分析材料，以及之后要新建的重构项目。

## 文档索引

- [项目分析报告](./PROJECT_ANALYSIS.md)：当前项目的结构、数据流、优缺点、风险点和验证记录。
- [重构路线图](./REFACTORING_ROADMAP.md)：建议的新项目边界、目标架构、目录设计和分阶段实施方案。
- [当前 API 与数据模型](./CURRENT_API_AND_DATA.md)：旧系统端点、环境变量、表结构和公开数据契约。
- [上游分支分析](./UPSTREAM_BRANCH_ANALYSIS.md)：已下载的上游分支、可复用内容和取舍建议。
- [分支策略](./BRANCH_STRATEGY.md)：为什么当前阶段集中在一个 `main` 分支工作。
- [references/upstream-branches/](./references/upstream-branches/)：原仓库有用分支的源码快照，不包含嵌套 `.git`。
- [refactor/](./refactor/)：之后新重构项目建议放在这里。

## 当前结论速览

这个项目不是纯概念稿，后端、前端、Docker 和部分部署配置已经成形；但它也不是完整产品仓库。当前主分支只包含网页和后端，README 提到的 Windows/macOS/Android Agent 源码并不在这个目录内，`start.sh` 还引用了缺失的 `agents/macos` 路径。它更像一个可部署 Dashboard 核心，加上一些来自其他分支或发布包的外部 Agent 假设。

重构时建议优先处理三件事：

1. 明确仓库边界：Dashboard 核心、Agent、移动端是否纳入同一个重构仓库。
2. 抽出共享契约：API 类型、隐私策略、应用映射、健康数据 schema 不要继续散落在前后端。
3. 建立验证体系：至少补上 schema 单测、API 集成测试、前端构建和 Docker 构建验证。
