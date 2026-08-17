# AnimalVerse - FYP1 待办事项列表 (TODO List)

这份清单整理了为了顺利完成 FYP1 (静态网站与 AWS 云托管阶段) 需要做的最后几步核心任务。

## 1. 代码与配置优化 (代码层面)
- [ ] **添加 CDN 配置项**（可选）: 修改 `js/config.js`，增加一个 `assetsBaseUrl`。在本地开发时留空，在部署时填入 AWS CloudFront 域名。
  > ⚠️ 说明：如果按第 2 节的方案把**所有资源（HTML/JS/视频/图片）都传进同一个 Bucket、同一个 CloudFront 域名**，那么相对路径（`assets/...`）直接可用，**不需要** `assetsBaseUrl`。只有当你把视频单独放到另一个域名（如独立的 media CloudFront）时才需要它。**建议先跳过，部署验证后再决定。**
- [ ] **适配数据加载**（可选，同上）: 在 `js/data.js` 中修改加载 `videos.json` 的逻辑，如果在生产环境下，自动将 `videoUrl` 和 `posterUrl` 前面拼接上 `assetsBaseUrl`。
- [x] **检查资源完整性**: ✅ 已验�### 2.1 准备阶段
- [x] **登录 AWS 账号**: ✅ 已完成。
- [x] **选择区域**: ✅ 已选择 **ap-southeast-1（新加坡）**。
- [x] **设置成本告警**: 控制台搜索 "Budgets" → 创建预算（如 $1/月），防止意外扣费。
- [x] **安装 AWS CLI**: ✅ 已安装 `aws-cli/2.36.24`。
- [x] **配置凭证**: ✅ 已配置 Access Key / Secret Key / region `ap-southeast-1`。

### 2.2 创建 S3 Bucket（私有，配合 OAC）
- [x] 控制台 → S3 → Create bucket：`animal-verse-hosting-2401292`。
- [x] 区域：`Asia Pacific (Singapore) ap-southeast-1`。
- [x] 关闭 ACL；勾选 **"Block all public access"**（保持私有，靠 OAC 放行）。
- [x] Bucket → Properties → **Static website hosting → Enable**，Index document 填 **`home.html`**。

### 2.3 上传网站文件到 S3
- [x] 已通过 `aws s3 sync` 完整上传 2011 个文件（16.37 GB 全部媒体与前端代码）。

### 2.4 配置 CloudFront（CDN + HTTPS）
- [x] 创建 Distribution，绑定 S3 源 `animal-verse-hosting-2401292.s3.ap-southeast-1.amazonaws.com`。
- [x] 启用 OAC（源访问控制）并已在 S3 更新 Bucket Policy。
- [x] **Default root object** 设为 **`home.html`**。
- [x] Viewer protocol policy 设为 **Redirect HTTP to HTTPS**。
- [x] **线上访问地址**: 👉 **`https://dzz52qebch1m.cloudfront.net`** (已成功上线运行！)-exclude ".ua/*" --exclude "scripts/*" \
    --exclude "*.md" --exclude ".gitignore" --exclude ".htaccess" --exclude "web.config"
  ```
  > `scripts/`、`.git/`、`.ua/`、`*.md` 都不是网站内容，不上传；`.htaccess` / `web.config` 是 Apache/IIS 专用，S3 用不上。
- [ ] 等待上传完成（16.4 GB 依上传带宽约 1~3 小时；`aws s3 sync` 支持断点续传，中断后重跑同一命令即可）。确认命令末尾没有报错（`upload:` 行数为 0 即全部完成）。

### 2.4 配置 CloudFront（CDN + HTTPS）
- [ ] 控制台 → CloudFront → **Create Distribution**。
- [ ] Origin：选 **S3 bucket** `animal-verse-hosting`；**Origin access** 选 **Origin access control settings (OAC)** → 新建 OAC，创建时勾选自动更新 Bucket Policy（控制台会自己把 policy 写进 S3）。
  - 若手动填 policy，OAC 对应的 Bucket Policy 为（`ACCOUNT_ID` 和 `DISTRIBUTION_ID` 换成自己的）：
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": { "Service": "cloudfront.amazonaws.com" },
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::animal-verse-hosting/*",
          "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID" } }
        }
      ]
    }
    ```
- [ ] **Default root object** 填 **`home.html`**（关键！否则访问域名根路径会 404）。
- [ ] Viewer protocol policy：**Redirect HTTP to HTTPS**。
- [ ] Price class：选 **Asia**（只用亚洲节点，省流量费；演示完全够）。
- [ ] 其余保持默认，Create Distribution。
- [ ] 等待状态从 `In Progress` 变成 `Deployed`（约 5~15 分钟），记下分配的域名如 `d2xxxxxx.cloudfront.net`。

### 2.5 CORS 配置（备用，遇到跨域报错才需要）
- [ ] 如果线上页面出现视频/资源跨域加载失败（CORS 报错），在 S3 Bucket → Permissions → **Cross-origin resource sharing (CORS)** 填入：
  ```json
  [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": []
    }
  ]
  ```
  > 说明：全部资源同域部署在同一个 CloudFront 下时**不会**有跨域问题，这一步通常可跳过。

### 2.6 备选方案 B（S3 静态托管 + 公开读，不用 OAC）
- [ ] 如果不想用 CloudFront OAC：在 S3 Permissions → Bucket Policy 填公开读策略（`Principal: "*"`, `Action: "s3:GetObject"`, `Resource: "arn:aws:s3:::animal-verse-hosting/*"`），并关闭 Block public access；直接访问 S3 静态托管端点（http，无 HTTPS）。
  > 缺点：无 CDN 加速、无 HTTPS、控制台会一直显示"公开"警告；**仅当方案 A 卡住时才用**。

### 2.7 上线验证（部署后必做）
- [ ] 浏览器打开 `https://<你的域名>.cloudfront.net`，确认能打开首页（Home）。
- [ ] 逐个测试：Home / Gallery（筛选+无限滚动）/ Playback（**视频能播放**）/ Map（地图 + 标记）/ Categories / Favorites / Search / About / Contact。
- [ ] 用手机（同一网络）再开一次，确认移动端布局正常。
- [ ] 有问题的页面记到本文件 "问题记录" 或直接修。

### 2.8 截图素材（写报告用，顺手存到 `D:\Documents\!UTAR\FYP\screenshots\`）
- [ ] S3 控制台：Bucket 列表页 + Bucket 属性/权限页截图（证明用了 S3）。
- [ ] CloudFront：Distribution 列表页 + 详情页（Origin/OAC/域名）截图。
- [ ] 线上页面截图：Home、Gallery、Playback（播放中）、Map、Categories。
- [ ] AWS Budget / 账单页截图（证明成本可控，加分项）。

## 3. FYP1 报告与文档准备
- [ ] **系统架构图绘制**: 画一张简单的流程图（User -> CloudFront -> S3）。
- [ ] **系统截图 (UAT)**: 在 AWS 线上环境中测试所有页面，并把 Home, Gallery, Playback, Map 等页面截图保存，用于写报告。
- [ ] **AWS 证明截图**: 截取 S3 控制台和 CloudFront 设置页面，证明你确实使用了 AWS 技术栈，这符合你 Proposal 的要求。

---
*注：FYP2 才会涉及的功能（如 AWS Lambda, DynamoDB, Amazon Lex 聊天机器人, 用户登录与上传）不在本 TODO 列表中。*

---

## 4. 视频/照片下载进度

### 补漏视频（34 个动物） — 34/34 ✅ 已完成
> 进度记录 `scripts/remaining_pexels_progress.json` 中 34 个动物全部为 `done`，每个 3 个视频。
> 包含：Fish(6) + Invertebrates(6) + Mammals(9) + Reptiles(13)

### 下载照片（141 个动物，每动物 ≥5 张） — 141/141 ✅ 已完成
> 进度记录 `scripts/photo_download_progress.json` 中 141 个动物全部为 `done`；实际平均每动物 8.8 张照片。

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
