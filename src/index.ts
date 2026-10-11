import { definePlugin } from '@qq-bot/plugin-sdk';

/** 一个可请求的分类目标：全局随机没有 category/type。 */
export interface CategoryTarget {
  readonly key: string;
  readonly label: string;
  readonly category?: string;
  readonly type?: string;
}

/**
 * uapis.cn 随机图片接口的权威分类表（见 docs/api-reference/get-random-image）。
 * - acg / bq / furry 由 UapiPro 服务器提供，支持 type 子分类；
 * - landscape / anime / pc_wallpaper / mobile_wallpaper / general_anime / ai_drawing 为外部图床，不支持 type；
 * - 不传 category 时为全局随机（不含 ikun 与 ai_drawing）。
 */
export const CATEGORIES: readonly CategoryTarget[] = [
  { key: 'global', label: '全局随机' },
  { key: 'acg', label: '二次元', category: 'acg' },
  { key: 'acg_pc', label: '二次元电脑壁纸', category: 'acg', type: 'pc' },
  { key: 'acg_mb', label: '二次元手机壁纸', category: 'acg', type: 'mb' },
  { key: 'landscape', label: '风景', category: 'landscape' },
  { key: 'anime', label: '混合动漫', category: 'anime' },
  { key: 'pc_wallpaper', label: '电脑壁纸', category: 'pc_wallpaper' },
  { key: 'mobile_wallpaper', label: '手机壁纸', category: 'mobile_wallpaper' },
  { key: 'general_anime', label: '综合动漫', category: 'general_anime' },
  { key: 'ai_drawing', label: 'AI 绘画', category: 'ai_drawing' },
  { key: 'bq', label: '表情包', category: 'bq' },
  { key: 'bq_maomao', label: '猫猫', category: 'bq', type: 'maomao' },
  { key: 'bq_xiongmao', label: '熊猫', category: 'bq', type: 'xiongmao' },
  { key: 'bq_waiguoren', label: '外国人', category: 'bq', type: 'waiguoren' },
  { key: 'bq_ikun', label: '爱坤', category: 'bq', type: 'ikun' },
  { key: 'bq_eciyuan', label: '二次元表情包', category: 'bq', type: 'eciyuan' },
  { key: 'furry', label: '福瑞', category: 'furry' },
  { key: 'furry_4k', label: '福瑞 4K', category: 'furry', type: '4k' },
];

/** 「/随机图片 <分类名>」支持的中英文别名，键统一小写。 */
export const ALIASES: Readonly<Record<string, string>> = {
  随机: 'global',
  全局: 'global',
  全部: 'global',
  all: 'global',
  二次元: 'acg',
  动漫: 'acg',
  二次元图: 'acg',
  动漫图: 'acg',
  二次元电脑壁纸: 'acg_pc',
  二次元pc: 'acg_pc',
  pc: 'acg_pc',
  二次元手机壁纸: 'acg_mb',
  二次元mb: 'acg_mb',
  mb: 'acg_mb',
  风景: 'landscape',
  风景图: 'landscape',
  混合动漫: 'anime',
  电脑壁纸: 'pc_wallpaper',
  壁纸: 'pc_wallpaper',
  pc壁纸: 'pc_wallpaper',
  手机壁纸: 'mobile_wallpaper',
  综合动漫: 'general_anime',
  动漫图库: 'general_anime',
  ai绘画: 'ai_drawing',
  ai画: 'ai_drawing',
  绘画: 'ai_drawing',
  表情包: 'bq',
  梗图: 'bq',
  趣图: 'bq',
  猫猫: 'bq_maomao',
  猫咪: 'bq_maomao',
  maomao: 'bq_maomao',
  熊猫: 'bq_xiongmao',
  xiongmao: 'bq_xiongmao',
  外国人: 'bq_waiguoren',
  waiguoren: 'bq_waiguoren',
  爱坤: 'bq_ikun',
  坤坤: 'bq_ikun',
  ikun: 'bq_ikun',
  二次元表情包: 'bq_eciyuan',
  eciyuan: 'bq_eciyuan',
  福瑞: 'furry',
  兽人: 'furry',
  福瑞4k: 'furry_4k',
  '4k': 'furry_4k',
};

export type CommandMode = 'exact' | 'prefix';

export interface CommandSpec {
  readonly id: string;
  readonly triggers: readonly string[];
  readonly mode: CommandMode;
  readonly description: string;
  /** 固定分类；random 命令由参数决定，categories 命令为帮助面板。 */
  readonly target?: string;
}

/**
 * 命令表是唯一的真相来源：plugin.json 由它派生，并由测试保证两者不漂移。
 * 触发词按「第一个空白前的词」匹配，因此 /随机图片 用 prefix 以便携带分类参数。
 */
export const COMMANDS: readonly CommandSpec[] = [
  { id: 'random', triggers: ['/随机图片', '/随机图'], mode: 'prefix', description: '随机图片，可带分类名，如 /随机图片 二次元' },
  { id: 'acg', triggers: ['/随机二次元图', '/随机动漫图'], mode: 'exact', description: '随机二次元（动漫）图片', target: 'acg' },
  { id: 'acg_pc', triggers: ['/随机二次元电脑壁纸'], mode: 'exact', description: '随机二次元电脑壁纸', target: 'acg_pc' },
  { id: 'acg_mb', triggers: ['/随机二次元手机壁纸'], mode: 'exact', description: '随机二次元手机壁纸', target: 'acg_mb' },
  { id: 'landscape', triggers: ['/随机风景图', '/随机风景'], mode: 'exact', description: '随机风景图片', target: 'landscape' },
  { id: 'anime', triggers: ['/随机混合动漫图'], mode: 'exact', description: '随机混合动漫图片', target: 'anime' },
  { id: 'pc_wallpaper', triggers: ['/随机电脑壁纸', '/随机壁纸'], mode: 'exact', description: '随机电脑壁纸', target: 'pc_wallpaper' },
  { id: 'mobile_wallpaper', triggers: ['/随机手机壁纸'], mode: 'exact', description: '随机手机壁纸', target: 'mobile_wallpaper' },
  { id: 'general_anime', triggers: ['/随机综合动漫图'], mode: 'exact', description: '随机综合动漫图片', target: 'general_anime' },
  { id: 'ai_drawing', triggers: ['/随机AI绘画', '/随机ai绘画'], mode: 'exact', description: '随机 AI 绘画图片', target: 'ai_drawing' },
  { id: 'bq', triggers: ['/随机表情包', '/随机梗图'], mode: 'exact', description: '随机表情包与趣图', target: 'bq' },
  { id: 'bq_maomao', triggers: ['/随机猫猫图', '/随机猫咪图'], mode: 'exact', description: '随机猫猫图片', target: 'bq_maomao' },
  { id: 'bq_xiongmao', triggers: ['/随机熊猫图'], mode: 'exact', description: '随机熊猫图片', target: 'bq_xiongmao' },
  { id: 'bq_waiguoren', triggers: ['/随机外国人'], mode: 'exact', description: '随机外国人表情包', target: 'bq_waiguoren' },
  { id: 'bq_ikun', triggers: ['/随机爱坤图', '/随机坤图'], mode: 'exact', description: '随机爱坤（ikun）图片', target: 'bq_ikun' },
  { id: 'bq_eciyuan', triggers: ['/随机二次元表情包'], mode: 'exact', description: '随机二次元表情包', target: 'bq_eciyuan' },
  { id: 'furry', triggers: ['/随机福瑞图', '/随机福瑞'], mode: 'exact', description: '随机福瑞（furry）图片', target: 'furry' },
  { id: 'furry_4k', triggers: ['/随机福瑞4K图', '/随机4K图'], mode: 'exact', description: '随机福瑞 4K 图片', target: 'furry_4k' },
  { id: 'categories', triggers: ['/图片分类', '/图库分类'], mode: 'exact', description: '查看随机图片支持的全部分类' },
];

export interface RandomImageConfig {
  apiBase: string;
  defaultCategory: string;
  disabledCategories: string;
  sendHint: boolean;
  hintTemplate: string;
}

const DEFAULT_BASE = 'https://uapis.cn/api/v1/random/image';
const MAX_ARG_LENGTH = 20;
const MAX_LABEL_LENGTH = 24;

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c] as const));

/** 只把分类名裁短用于回显，避免把超长用户输入原样发出去。 */
const clamp = (text: string, size: number): string => (text.length > size ? `${text.slice(0, size)}…` : text);

/** 接口地址必须是 HTTPS 且不含凭据，否则回退到默认地址（SDK 要求图片为 HTTPS）。 */
export function resolveBase(value: unknown): string {
  if (typeof value === 'string' && value) {
    try {
      const url = new URL(value);
      // 带 username/password 的地址会把凭据写进配置并透传给图片适配器，直接拒绝。
      if (url.protocol === 'https:' && !url.username && !url.password) return value;
    } catch {
      /* 非法地址回退到默认值 */
    }
  }
  return DEFAULT_BASE;
}

/**
 * 按分类拼接最终请求地址；302 目标由 QQ 侧拉取，插件只负责给出接口 URL。
 * 先删掉 base 上可能残留的 category/type，否则管理员把子分类写进 apiBase 后，
 * 像「/随机福瑞图」这种不带 type 的命令会被带偏成别的子分类。
 */
export function buildImageUrl(base: string, target: CategoryTarget): string {
  const url = new URL(base);
  url.searchParams.delete('category');
  url.searchParams.delete('type');
  if (target.category) url.searchParams.set('category', target.category);
  if (target.type) url.searchParams.set('type', target.type);
  return url.toString();
}

/** 把用户输入/配置里的分类写法（别名、大小写、a/b 形式）归一成分类 key。 */
export function normalizeCategory(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase().replace(/[\s/]+/g, '_').replace(/^_+|_+$/g, '');
  if (!value) return null;
  if (BY_KEY.has(value)) return value;
  // 只查自有属性，避免 'constructor' 等原型链键被当成别名。
  if (Object.prototype.hasOwnProperty.call(ALIASES, value)) return ALIASES[value];
  const compact = value.replace(/_/g, '');
  if (BY_KEY.has(compact)) return compact;
  for (const category of CATEGORIES) {
    if (category.key.replace(/_/g, '') === compact) return category.key;
  }
  for (const [name, key] of Object.entries(ALIASES)) {
    if (name.replace(/_/g, '') === compact) return key;
  }
  return null;
}

/** 解析禁用的分类列表，支持逗号、中文逗号与空格分隔，也接受别名。 */
export function disabledKeys(raw: unknown): Set<string> {
  const result = new Set<string>();
  if (typeof raw !== 'string' || !raw.trim()) return result;
  for (const piece of raw.split(/[,，、;；\s]+/)) {
    const key = normalizeCategory(piece);
    if (key) result.add(key);
  }
  return result;
}

const renderHint = (template: unknown, target: CategoryTarget): string => {
  const source = typeof template === 'string' && template ? template : '{name}';
  return source.replace(/\{name\}/g, target.label).replace(/\{key\}/g, target.key);
};

export function helpText(): string {
  const lines = ['🖼️ 随机图片分类一览'];
  for (const command of COMMANDS) {
    const label =
      command.id === 'random'
        ? '全局随机 / 自选分类'
        : command.id === 'categories'
          ? '查看本列表'
          : BY_KEY.get(command.target!)?.label ?? '';
    lines.push(`${command.triggers[0]} — ${label}`);
  }
  lines.push('也可以写「/随机图片 分类名」，例如 /随机图片 猫猫');
  return lines.join('\n');
}

export function unknownCategoryText(raw: string): string {
  const names = CATEGORIES.filter((c) => c.key !== 'global').map((c) => c.label).join('、');
  return `没找到「${clamp(raw.trim(), MAX_ARG_LENGTH)}」这个分类。\n可用分类：${names}\n例如：/随机图片 二次元`;
}

export default definePlugin<RandomImageConfig>({
  async onCommand(ctx) {
    const spec = COMMANDS.find((c) => c.id === ctx.command.id);
    if (!spec) return;

    if (spec.id === 'categories') {
      await ctx.reply.text(helpText());
      return;
    }

    let key: string;
    if (spec.id === 'random') {
      const arg = (ctx.command.args ?? '').trim().split(/\s+/)[0] ?? '';
      if (!arg) {
        key = normalizeCategory(ctx.config.defaultCategory) ?? 'global';
      } else {
        const parsed = normalizeCategory(arg);
        if (!parsed) {
          await ctx.reply.text(unknownCategoryText(arg));
          return;
        }
        key = parsed;
      }
    } else {
      key = spec.target!;
    }

    const target = BY_KEY.get(key);
    if (!target) return;

    if (disabledKeys(ctx.config.disabledCategories).has(key)) {
      await ctx.reply.text(`「${target.label}」分类已被管理员关闭。`);
      return;
    }

    if (ctx.config.sendHint) {
      await ctx.reply.text(clamp(renderHint(ctx.config.hintTemplate, target), MAX_LABEL_LENGTH + 40));
    }

    const url = buildImageUrl(resolveBase(ctx.config.apiBase), target);
    try {
      await ctx.reply.image(url);
    } catch {
      // 不重试：回复接口是「至多一次」语义，重发同一张图可能造成重复出图，
      // SDK 也要求命令错误不要重试发送多条重复消息。让用户重发命令即可。
      ctx.log.error(`获取「${key}」分类图片失败`);
      await ctx.reply.text('图片获取失败了，稍后再试试吧。');
    }
  },
});
