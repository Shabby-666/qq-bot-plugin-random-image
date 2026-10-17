# QQ Bot 随机图片插件（random-image）

基于 [qq-bot-plugin-sdk](https://github.com/MoeBotOfficial/MoeBot-Plugin-SDK) v1 的 QQ 机器人插件，按分类调用
[uapis.cn 随机图片接口](https://uapis.cn/docs/api-reference/get-random-image) 出图。

- 插件 ID：`random-image`
- 版本：`1.0.0`
- 命令前缀：`/`
- 依赖：Node.js 22+（仅构建期需要）

## 使用效果

| 发送 | 结果 |
| --- | --- |
| `/随机二次元图` | 只出二次元（`category=acg`）图片 |
| `/随机图片` | 全局随机（不传 `category`） |
| `/随机图片 猫猫` | 出表情包里的猫猫（`category=bq&type=maomao`） |
| `/图片分类` | 列出全部可用分类 |

## 命令一览

每条命令都可以在私聊与群聊使用，权限由核心的插件开关与范围设置控制。

| 命令 | 触发词 | 请求参数 |
| --- | --- | --- |
| 随机图片（可带分类） | `/随机图片`、`/随机图` | 依参数，见下 |
| 二次元 | `/随机二次元图`、`/随机动漫图` | `category=acg` |
| 二次元电脑壁纸 | `/随机二次元电脑壁纸` | `category=acg&type=pc` |
| 二次元手机壁纸 | `/随机二次元手机壁纸` | `category=acg&type=mb` |
| 风景 | `/随机风景图`、`/随机风景` | `category=landscape` |
| 混合动漫 | `/随机混合动漫图` | `category=anime` |
| 电脑壁纸 | `/随机电脑壁纸`、`/随机壁纸` | `category=pc_wallpaper` |
| 手机壁纸 | `/随机手机壁纸` | `category=mobile_wallpaper` |
| 综合动漫 | `/随机综合动漫图` | `category=general_anime` |
| AI 绘画 | `/随机AI绘画`、`/随机ai绘画` | `category=ai_drawing` |
| 表情包 | `/随机表情包`、`/随机梗图` | `category=bq` |
| 猫猫 | `/随机猫猫图`、`/随机猫咪图` | `category=bq&type=maomao` |
| 熊猫 | `/随机熊猫图` | `category=bq&type=xiongmao` |
| 外国人 | `/随机外国人` | `category=bq&type=waiguoren` |
| 爱坤 | `/随机爱坤图`、`/随机坤图` | `category=bq&type=ikun` |
| 二次元表情包 | `/随机二次元表情包` | `category=bq&type=eciyuan` |
| 福瑞 | `/随机福瑞图`、`/随机福瑞` | `category=furry` |
| 福瑞 4K | `/随机福瑞4K图`、`/随机4K图` | `category=furry&type=4k` |
| 分类帮助 | `/图片分类`、`/图库分类` | 只回文字 |

### `/随机图片` 的分类参数

`/随机图片` 是 prefix 模式，后面可跟一个分类词，支持中文别名、分类 key 与 `分类/子类` 写法：

```
/随机图片 二次元      → category=acg
/随机图片 动漫        → category=acg
/随机图片 风景        → category=landscape
/随机图片 壁纸        → category=pc_wallpaper
/随机图片 ai绘画      → category=ai_drawing
/随机图片 猫猫        → category=bq&type=maomao
/随机图片 4K          → category=furry&type=4k
/随机图片 bq/maomao   → category=bq&type=maomao
/随机图片 acg_pc      → category=acg&type=pc
/随机图片 全局        → 不加 category，全局随机
```

不写分类时走「默认分类」配置项，留空即全局随机。分类词无法识别时不会出图，只回一条带可用分类列表的提示。

## 配置项

安装后在 WebUI「插件管理」里配置；本插件只有 5 个一层字段。

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `apiBase` | string | `https://uapis.cn/api/v1/random/image` | 接口地址，仅接受不含凭据的 `https`，其它值回退到默认地址 |
| `defaultCategory` | string | 空 | `/随机图片` 不带分类时使用；留空为全局随机 |
| `disabledCategories` | string | 空 | 禁用的分类，逗号分隔，支持别名，如 `ikun,ai_drawing,福瑞` |
| `sendHint` | boolean | `false` | 出图前是否先发一条分类提示文字 |
| `hintTemplate` | string | `🖼️ {name}` | 提示模板，支持 `{name}` 分类名与 `{key}` 分类标识 |

`apiBase` 上的 `category` / `type` 参数会被命令覆盖（先清除再写入），所以把子分类写进 `apiBase` 不会
让 `/随机福瑞图` 这类命令串到别的子分类。

可写入 `disabledCategories` / `defaultCategory` 的分类标识：

```
global, acg, acg_pc, acg_mb, landscape, anime, pc_wallpaper,
mobile_wallpaper, general_anime, ai_drawing, bq, bq_maomao,
bq_xiongmao, bq_waiguoren, bq_ikun, bq_eciyuan, furry, furry_4k
```

**每个标识独立生效**：禁用 `acg` 只关掉 `/随机二次元图`，`/随机二次元电脑壁纸`、`/随机二次元手机壁纸`
仍可用；禁用 `bq` 也不会连带关掉 `bq_maomao`、`bq_ikun` 等。要整族关闭就把它们都写进去。

除上述标识外，中英文别名与接口原始子分类名同样可用，例如：

```
二次元 / 动漫 → acg                  风景 → landscape
壁纸 / 电脑壁纸 → pc_wallpaper        手机壁纸 → mobile_wallpaper
综合动漫 → general_anime             ai绘画 → ai_drawing
表情包 / 梗图 → bq                    pc → acg_pc
猫猫 / maomao → bq_maomao             mb → acg_mb
熊猫 / xiongmao → bq_xiongmao         爱坤 / ikun → bq_ikun
二次元表情包 / eciyuan → bq_eciyuan    福瑞 / furry → furry
福瑞4k / furry_4k → furry_4k
```

注意区分：`pc` / `mb` 是接口 `acg` 分类下的子分类名，对应 `/随机二次元电脑壁纸`、`/随机二次元手机壁纸`；
而「壁纸 / 电脑壁纸」指的是外部图床的 `pc_wallpaper` 分类，两者不是同一个图库。

## 接口行为与边界

- 接口 `GET /api/v1/random/image` **返回 302**，`Location` 指向真正的图片 URL。插件把带查询参数的接口地址交给
  `ctx.reply.image()`，**依赖机器人适配器拉图时跟随重定向**——这正是该接口文档给出的用法（可直接用于 `<img>`），
  但适配器行为无法在插件侧验证。若上线后发现所有命令都收不到图，就是这个假设不成立，需要改为服务端解析 302。
- 插件**不使用** `ctx.http`：SDK 的 HTTP 能力禁止重定向，无法用于解析 302，因此本插件不声明 `http` 权限，
  也不消耗每次处理的 4 次 HTTP 额度。
- 未指定 `category` 时接口的全局随机**不包含** `ikun` 与 `ai_drawing`。
- `type` 子分类只对 UapiPro 服务器分类生效（`acg`、`bq`、`furry`）；外部图床分类（`landscape`、`pc_wallpaper`、
  `mobile_wallpaper`、`general_anime`、`ai_drawing`）与 `anime` 混合分类不支持 `type`。
- 接口为免费公共接口，可能限流（429）或个别分类图库为空（404）。**失败不重试**：回复接口是「至多一次」语义，
  重发同一张图可能造成重复出图（SDK 也要求命令错误不要重试发送多条重复消息），插件只回一条
  「图片获取失败了」提示，让用户重发命令即可。

## 能力、数据与 CPU

- 权限：`reply.text`、`reply.image`。不申请 `storage`、`http`、`model.context`。
- 单次命令的 SDK 回复**调用次数**（核心约束的是调用次数，上限 3 次）：
  成功路径 = 图片 1 次（开启提示时 2 次）；失败路径 = 图片 1 次 + 错误提示 1 次（开启提示时 3 次）。
  最坏情况正好 3 次，不超限。
- 不读写存储、不开后台任务、不保留任何全局可变状态，插件不落任何用户数据；卸载即完全清空。
- 纯字符串拼接与 `URL` 解析，单次命令 CPU 开销可忽略。

## 开发、测试与构建

```sh
npm install          # 安装 SDK 与 TypeScript
npm run typecheck    # tsc --noEmit
npm test             # 先构建，再跑 node --test
npm run build        # 生成 dist/random-image-1.0.0.zip
```

`npm test` 覆盖：清单/schema 通过 SDK 校验、命令表与 `plugin.json` 不漂移、每个分类命令的 URL 参数与回复
调用次数上限、`apiBase` 残留 `category`/`type` 被覆盖、别名解析、禁用分类（含接口原始子分类名）、默认分类、
非法/带凭据 `apiBase` 回退、发送失败不重试且只回一条错误提示、帮助文本自入口、未知命令。

把 `dist/random-image-1.0.0.zip` 交给用户在 WebUI「插件管理」上传，启用后点击「保存并部署」。
不要上传 GitHub 自动生成的源码 ZIP。

## 目录结构

```
qq-bot-plugin-random-image/
├── plugin.json           # 身份、权限、19 条命令
├── config.schema.json    # WebUI 表单
├── src/index.ts          # 分类表、命令表、处理器
├── tests/                # node:test，使用 SDK testing 模拟
├── dist/                 # 构建产物：plugin.mjs、plugin-package.json、ZIP
└── README.md
```

`src/index.ts` 里的 `CATEGORIES` 与 `COMMANDS` 是唯一真相来源，测试会断言 `plugin.json`
的命令列表与之一致，避免两处手写漂移。

## 许可

MIT
