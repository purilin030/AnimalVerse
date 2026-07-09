# AnimalVerse - FYP1 待办事项列表 (TODO List)

这份清单整理了为了顺利完成 FYP1 (静态网站与 AWS 云托管阶段) 需要做的最后几步核心任务。

## 1. 代码与配置优化 (代码层面)
- [ ] **添加 CDN 配置项**: 修改 `js/config.js`，增加一个 `assetsBaseUrl`。在本地开发时留空，在部署时填入 AWS CloudFront 域名，以便未来方便地将视频和图片资源托管到云端。
- [ ] **适配数据加载**: 在 `js/data.js` 中修改加载 `videos.json` 的逻辑，如果在生产环境下，自动将 `videoUrl` 和 `posterUrl` 前面拼接上 `assetsBaseUrl`。
- [ ] **检查资源完整性**: 确保 `videos.json` 里提到的一些关键演示视频（如 `.mp4` 文件）确实存在于 `assets/images/library/...` 目录中，能够正常播放。

## 2. AWS 基础设施部署 (最关键的任务)
- [ ] **注册/登录 AWS 账号**: 确保能够访问 AWS 管理控制台。
- [ ] **配置 Amazon S3 存储桶**:
  - [ ] 创建一个新的 S3 Bucket（例如 `animal-verse-hosting`）。
  - [ ] 开启 **Static website hosting** (静态网站托管) 功能。
  - [ ] 修改 **Bucket Policy** (存储桶策略)，允许公开访问 (Public Read)，否则网站无法被外部访问。
  - [ ] 上传 `animal-verse` 文件夹中的所有前端代码（HTML, CSS, JS, assets）到该 Bucket。
- [ ] **配置 Amazon CloudFront (CDN)**:
  - [ ] 创建一个新的 CloudFront Distribution。
  - [ ] 将 Origin (源) 设置为你刚刚创建的 S3 Bucket 的静态托管网址。
  - [ ] 等待部署完成，获取最终的 `.cloudfront.net` 分发域名。
- [ ] **CORS 配置 (如果遇到跨域问题)**: 在 S3 中配置 CORS 规则，允许跨域读取，防止视频或地图加载失败。

## 3. FYP1 报告与文档准备
- [ ] **系统架构图绘制**: 画一张简单的流程图（User -> CloudFront -> S3）。
- [ ] **系统截图 (UAT)**: 在 AWS 线上环境中测试所有页面，并把 Home, Gallery, Playback, Map 等页面截图保存，用于写报告。
- [ ] **AWS 证明截图**: 截取 S3 控制台和 CloudFront 设置页面，证明你确实使用了 AWS 技术栈，这符合你 Proposal 的要求。

---
*注：FYP2 才会涉及的功能（如 AWS Lambda, DynamoDB, Amazon Lex 聊天机器人, 用户登录与上传）不在本 TODO 列表中。*

---

## 4. 视频/照片下载进度

### 补漏视频（34 个动物） — 0/34
```bash
# 分 10 个一批跑，每批 ~10 分钟 + 等 1h 限流重置
python scripts/download_remaining_pexels.py --batch-size 10

# 查看进度
python scripts/download_remaining_pexels.py --status

# 重置进度（重新下载）
python scripts/download_remaining_pexels.py --reset-progress
```
> 包含：Fish(6) + Invertebrates(6) + Mammals(9) + Reptiles(13)

### 下载照片（141 个动物，每动物 10 张） — 0/141
```bash
# 分 20 个一批跑，批间等 1h
python scripts/download_pexels_pixabay_photos.py --batch-size 20

# 查看进度
python scripts/download_pexels_pixabay_photos.py --status

# 重置进度
python scripts/download_pexels_pixabay_photos.py --reset-progress
```

### 收尾（两个都完成后）
```bash
python scripts/rebuild_videos_json.py
```

### 建议跑法

| 时段 | 操作 |
|---|---|
| **Day 1 上午** | 视频补漏 2 批（`--batch-size 10`，中间等 1h） |
| **Day 1 下午** | 照片 2 批（`--batch-size 20`，每次等 1h）|
| **Day 2~3** | 继续跑照片（~7 批 × 1h） |
| **完成后** | `python scripts/rebuild_videos_json.py` |

> 所有脚本都支持 Ctrl+C 暂停 + 断点续传。重新跑会自动跳过已完成的动物。
