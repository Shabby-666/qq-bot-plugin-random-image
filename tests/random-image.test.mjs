import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import plugin, {
  ALIASES,
  CATEGORIES,
  COMMANDS,
  buildImageUrl,
  disabledKeys,
  helpText,
  normalizeCategory,
  resolveBase,
} from '../dist/plugin.mjs';
import { createTestContext } from '@qq-bot/plugin-sdk/testing';
import { validateConfig, validateManifest, validateSchema } from '@qq-bot/plugin-sdk/protocol';

const manifest = JSON.parse(await readFile(new URL('../plugin.json', import.meta.url), 'utf8'));
const schema = JSON.parse(await readFile(new URL('../config.schema.json', import.meta.url), 'utf8'));
const defaults = validateConfig(schema, {});
const config = defaults;

const run = async (command, extra = {}) => {
  const t = createTestContext({ config, command, ...extra });
  await plugin.onCommand(t.context);
  return t;
};

/**
 * 统计 SDK 回复接口的**调用次数**（而不是最终送达条数），
 * 因为核心的上限约束的是调用次数：SDK README「每次命令最多 3 条 SDK 回复」。
 */
const runCounted = async (command, overrides = {}, { imageFails = false } = {}) => {
  const t = createTestContext({ config: { ...config, ...overrides }, command });
  const counters = { total: 0, text: 0, image: 0 };
  const text = t.context.reply.text.bind(t.context.reply);
  const image = t.context.reply.image.bind(t.context.reply);
  t.context.reply.text = async (value) => {
    counters.total += 1;
    counters.text += 1;
    return text(value);
  };
  t.context.reply.image = async (value) => {
    counters.total += 1;
    counters.image += 1;
    if (imageFails) throw new Error('boom');
    return image(value);
  };
  await plugin.onCommand(t.context);
  return { t, counters };
};

const queryOf = (url) => new URL(url).searchParams;

test('清单、配置 schema 通过 SDK 校验，且 plugin.json 与命令表不漂移', () => {
  validateManifest(manifest);
  validateSchema(schema);
  assert.equal(manifest.id, 'random-image');
  assert.equal(manifest.entry, 'plugin.mjs');
  assert.deepEqual([...manifest.permissions].sort(), ['reply.image', 'reply.text']);
  assert.deepEqual(
    manifest.commands,
    COMMANDS.map(({ id, triggers, mode, description }) => ({ id, triggers: [...triggers], mode, description })),
  );
  const triggers = manifest.commands.flatMap((c) => c.triggers);
  assert.equal(new Set(triggers).size, triggers.length, '触发词必须全局唯一');
  assert.ok(triggers.every((t) => t.startsWith('/')), '触发词统一使用 / 前缀，避免与其它插件冲突');
});

test('schema 默认值可直接运行，且默认走全局随机', async () => {
  const t = await run({ id: 'random', trigger: '/随机图片' }, { config: defaults });
  assert.deepEqual(t.images, ['https://uapis.cn/api/v1/random/image']);
});

test('/随机二次元图 只输出二次元分类的图片', async () => {
  const t = await run({ id: 'acg', trigger: '/随机二次元图' });
  assert.deepEqual(t.images, ['https://uapis.cn/api/v1/random/image?category=acg']);
  assert.deepEqual(t.replies, []);
});

test('每个分类命令都拼出正确的 category/type 参数，且回复调用不超过 3 次', async () => {
  for (const command of COMMANDS) {
    if (command.id === 'random' || command.id === 'categories') continue;
    const target = CATEGORIES.find((c) => c.key === command.target);
    assert.ok(target, `${command.id} 缺少对应的分类定义`);
    const { t, counters } = await runCounted({ id: command.id, trigger: command.triggers[0] });
    assert.equal(t.images.length, 1, `${command.id} 未发送图片`);
    const url = new URL(t.images[0]);
    assert.equal(url.origin + url.pathname, 'https://uapis.cn/api/v1/random/image', command.id);
    assert.equal(url.searchParams.get('category'), target.category ?? null, command.id);
    assert.equal(url.searchParams.get('type'), target.type ?? null, command.id);
    assert.ok(counters.total <= 3, `${command.id} SDK 回复调用 ${counters.total} 次，超过 3 次上限`);
  }
});

test('apiBase 上残留的 category/type 会被命令覆盖而不是叠加', async () => {
  const base = 'https://uapis.cn/api/v1/random/image?category=bq&type=ikun';
  // 不带 type 的命令必须把 apiBase 里的 type 清掉，否则福瑞命令会出爱坤图
  const furry = await run({ id: 'furry' }, { config: { ...config, apiBase: base } });
  assert.deepEqual(furry.images, ['https://uapis.cn/api/v1/random/image?category=furry']);
  const acg = await run({ id: 'acg' }, { config: { ...config, apiBase: base } });
  assert.deepEqual(acg.images, ['https://uapis.cn/api/v1/random/image?category=acg']);
  // 带 type 的命令用命令自己的 type
  const maomao = await run({ id: 'bq_maomao' }, { config: { ...config, apiBase: base } });
  assert.deepEqual(maomao.images, ['https://uapis.cn/api/v1/random/image?category=bq&type=maomao']);
  // 全局随机必须两个参数都不带
  const global = await run({ id: 'random' }, { config: { ...config, apiBase: base } });
  assert.deepEqual(global.images, ['https://uapis.cn/api/v1/random/image']);
  const globalTarget = CATEGORIES.find((c) => c.key === 'global');
  assert.equal(buildImageUrl(base, globalTarget), 'https://uapis.cn/api/v1/random/image');
});

test('/随机图片 支持分类别名、分类标识与 a/b 写法', async () => {
  const cases = [
    ['二次元', { category: 'acg', type: null }],
    ['动漫', { category: 'acg', type: null }],
    ['风景', { category: 'landscape', type: null }],
    ['壁纸', { category: 'pc_wallpaper', type: null }],
    ['ai绘画', { category: 'ai_drawing', type: null }],
    ['猫猫', { category: 'bq', type: 'maomao' }],
    ['4K', { category: 'furry', type: '4k' }],
    ['bq/maomao', { category: 'bq', type: 'maomao' }],
    ['ACG_PC', { category: 'acg', type: 'pc' }],
    ['福瑞', { category: 'furry', type: null }],
    ['全局', { category: null, type: null }],
  ];
  for (const [arg, expected] of cases) {
    const t = await run({ id: 'random', trigger: '/随机图片', args: arg });
    assert.equal(t.images.length, 1, `${arg} 未发送图片`);
    const q = queryOf(t.images[0]);
    assert.equal(q.get('category'), expected.category, `别名 ${arg}`);
    assert.equal(q.get('type'), expected.type, `别名 ${arg}`);
  }
});

test('未知分类不发图并回显可用分类', async () => {
  const t = await run({ id: 'random', trigger: '/随机图片', args: '不存在的分类' });
  assert.deepEqual(t.images, []);
  assert.equal(t.replies.length, 1);
  assert.match(t.replies[0], /没找到/);
  assert.match(t.replies[0], /二次元/);
  assert.match(t.replies[0], /猫猫/);
});

test('禁用分类后拒绝出图，且支持用别名配置禁用项', async () => {
  const disabled = createTestContext({ config: { ...config, disabledCategories: '二次元, ikun，ai_drawing' }, command: { id: 'acg' } });
  await plugin.onCommand(disabled.context);
  assert.deepEqual(disabled.images, []);
  assert.match(disabled.replies[0], /二次元.*已被管理员关闭/);

  const alias = await run({ id: 'bq_maomao' }, { config: { ...config, disabledCategories: '猫猫' } });
  assert.deepEqual(alias.images, []);
  assert.match(alias.replies[0], /关闭/);

  const allowed = await run({ id: 'bq_xiongmao' }, { config: { ...config, disabledCategories: '猫猫' } });
  assert.equal(allowed.images.length, 1);
});

test('defaultCategory 生效，且被禁用时同样拦截', async () => {
  const t = await run({ id: 'random' }, { config: { ...config, defaultCategory: 'furry_4k' } });
  assert.deepEqual(t.images, ['https://uapis.cn/api/v1/random/image?category=furry&type=4k']);

  const blocked = await run({ id: 'random' }, { config: { ...config, defaultCategory: 'furry_4k', disabledCategories: '4k' } });
  assert.deepEqual(blocked.images, []);
  assert.match(blocked.replies[0], /关闭/);
});

test('图片发送失败只尝试一次、只回一条错误提示、不重复发图', async () => {
  const { t, counters } = await runCounted({ id: 'acg' }, {}, { imageFails: true });
  assert.equal(counters.image, 1, '失败后不得重发同一张图（可能重复出图）');
  assert.equal(t.images.length, 0);
  assert.equal(t.replies.length, 1);
  assert.match(t.replies[0], /失败/);
  assert.ok(counters.total <= 3, `SDK 回复调用 ${counters.total} 次，超过 3 次上限`);
});

test('开启 sendHint 且发送失败时，回复调用仍不超过 3 次', async () => {
  const t = createTestContext({ config: { ...config, sendHint: true }, command: { id: 'acg' } });
  const counters = { total: 0, image: 0 };
  const text = t.context.reply.text.bind(t.context.reply);
  t.context.reply.text = async (v) => { counters.total += 1; return text(v); };
  t.context.reply.image = async () => { counters.total += 1; counters.image += 1; throw new Error('boom'); };
  await plugin.onCommand(t.context);
  assert.equal(counters.image, 1);
  assert.equal(counters.total, 3, '提示 + 图片 + 错误提示 = 3 次，正好等于上限');
  assert.match(t.replies.at(-1), /失败/);
});

test('发送成功时不发错误提示', async () => {
  const { t, counters } = await runCounted({ id: 'bq' });
  assert.equal(counters.image, 1);
  assert.equal(counters.text, 0);
  assert.deepEqual(t.images, ['https://uapis.cn/api/v1/random/image?category=bq']);
});

test('开启 sendHint 时先发分类提示再发图片', async () => {
  const t = await run({ id: 'bq_maomao' }, { config: { ...config, sendHint: true, hintTemplate: '{name}来啦（{key}）' } });
  assert.deepEqual(t.replies, ['猫猫来啦（bq_maomao）']);
  assert.deepEqual(t.images, ['https://uapis.cn/api/v1/random/image?category=bq&type=maomao']);
});

test('配置缺字段时按默认值运行', async () => {
  const empty = createTestContext({ config: {}, command: { id: 'acg' } });
  empty.context.reply.image = async (url) => {
    empty.images.push(url);
  };
  await plugin.onCommand(empty.context);
  assert.deepEqual(empty.images, ['https://uapis.cn/api/v1/random/image?category=acg']);
  assert.deepEqual(empty.replies, [], 'sendHint 缺失时不应额外发文字');

  const missing = createTestContext({ config: { sendHint: false }, command: { id: 'acg' } });
  let tries = 0;
  missing.context.reply.image = async () => {
    tries += 1;
    throw new Error('boom');
  };
  await plugin.onCommand(missing.context);
  assert.equal(tries, 1, '失败后不重试');
  assert.equal(missing.replies.length, 1);
});

test('禁用分类示例中的每个写法都能真正解析（含接口原始子分类名）', () => {
  assert.deepEqual([...disabledKeys('ikun,ai_drawing,福瑞')].sort(), ['ai_drawing', 'bq_ikun', 'furry'].sort());
  assert.deepEqual(
    [...disabledKeys('maomao,xiongmao,waiguoren,eciyuan,pc,mb')].sort(),
    ['bq_maomao', 'bq_xiongmao', 'bq_waiguoren', 'bq_eciyuan', 'acg_pc', 'acg_mb'].sort(),
  );
  // README 里列出的全部标识都必须能解析回自己
  const identifiers = [
    'global', 'acg', 'acg_pc', 'acg_mb', 'landscape', 'anime', 'pc_wallpaper', 'mobile_wallpaper',
    'general_anime', 'ai_drawing', 'bq', 'bq_maomao', 'bq_xiongmao', 'bq_waiguoren', 'bq_ikun',
    'bq_eciyuan', 'furry', 'furry_4k',
  ];
  for (const id of identifiers) assert.equal(normalizeCategory(id), id, `README 标识 ${id} 无法解析`);
  assert.equal(identifiers.length, CATEGORIES.length);
});

test('README 别名表与实现一致（防止文档漂移）', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const block = readme
    .split('```')
    .find((b) => b.includes('→') && b.includes('furry_4k') && !b.includes('category='));
  assert.ok(block, '未找到 README 别名表代码块');
  let checked = 0;
  for (const line of block.split('\n')) {
    const pattern = /([^\s/]+)\s*\/\s*([^\s/]+)\s*→\s*([a-z][a-z0-9_]*)|([^\s/]+)\s*→\s*([a-z][a-z0-9_]*)/g;
    for (const match of line.matchAll(pattern)) {
      const names = match[1] ? [match[1], match[2]] : [match[4]];
      const expected = match[3] ?? match[5];
      for (const name of names) {
        checked += 1;
        assert.equal(normalizeCategory(name), expected, `README 写的是 ${name} → ${expected}`);
      }
    }
  }
  assert.ok(checked >= 15, `README 别名表只解析出 ${checked} 条，可能已漂移或格式变化`);
});

test('apiBase 非法、非 https 或带凭据时回退到默认接口', async () => {
  const bad = [
    'http://evil.example/api',
    'not-a-url',
    '',
    '   ',
    null,
    undefined,
    42,
    'https://user:pw@evil.example/x',
    'https://user@evil.example/x',
  ];
  for (const apiBase of bad) {
    const t = await run({ id: 'acg' }, { config: { ...config, apiBase } });
    assert.equal(t.images.length, 1, `apiBase=${String(apiBase)} 未回退`);
    assert.ok(t.images[0].startsWith('https://uapis.cn/api/v1/random/image'), `apiBase=${String(apiBase)}`);
  }
  assert.equal(resolveBase('https://user:pw@evil.example/x'), 'https://uapis.cn/api/v1/random/image');
  assert.equal(resolveBase('https://user@evil.example/x'), 'https://uapis.cn/api/v1/random/image');
  assert.equal(resolveBase('https://ok.example/x?type=ikun'), 'https://ok.example/x?type=ikun', '带查询参数的地址仍可用');
});

test('apiBase 可替换为兼容的自建接口', async () => {
  const t = await run({ id: 'landscape' }, { config: { ...config, apiBase: 'https://mirror.example.com/random/image' } });
  assert.deepEqual(t.images, ['https://mirror.example.com/random/image?category=landscape']);
});

test('/图片分类 列出全部分类、包含自身入口且不发图', async () => {
  const t = await run({ id: 'categories' });
  assert.deepEqual(t.images, []);
  assert.equal(t.replies.length, 1);
  assert.match(t.replies[0], /随机图片分类一览/);
  for (const category of CATEGORIES) {
    if (category.key === 'global') continue;
    assert.ok(t.replies[0].includes(category.label), `缺少分类 ${category.label}`);
  }
  assert.ok(t.replies[0].includes('/图片分类'), '帮助面板必须告诉用户如何再次打开它');
  assert.ok(t.replies[0].length < 4000, '帮助文本不应超过存储/消息长度上限');
});

test('未声明的命令 id 不做任何事', async () => {
  const t = await run({ id: 'unknown-command' });
  assert.deepEqual(t.replies, []);
  assert.deepEqual(t.images, []);
});

test('分类表、别名表与纯函数保持一致', () => {
  const keys = new Set(CATEGORIES.map((c) => c.key));
  assert.equal(keys.size, CATEGORIES.length, '分类 key 必须唯一');
  assert.ok(keys.has('global'));
  for (const [alias, key] of Object.entries(ALIASES)) {
    assert.ok(keys.has(key), `别名 ${alias} 指向了不存在的分类 ${key}`);
    assert.equal(normalizeCategory(alias), key);
    if (/[a-zA-Z]/.test(alias)) assert.equal(normalizeCategory(alias.toUpperCase()), key, `别名 ${alias} 应大小写不敏感`);
  }
  for (const { key, category, type } of CATEGORIES) {
    assert.equal(normalizeCategory(key), key);
    if (category === undefined) assert.equal(type, undefined, `${key} 不应带 type`);
  }
  assert.equal(normalizeCategory('没有这个'), null);
  assert.equal(normalizeCategory('constructor'), null, '原型链键不能当别名');
  assert.equal(normalizeCategory('__proto__'), null, '原型链键不能当别名');
  assert.equal(normalizeCategory('toString'), null, '原型链键不能当别名');
  assert.equal(normalizeCategory(''), null);
  assert.equal(normalizeCategory(undefined), null);
  assert.equal(normalizeCategory('  A c G  '), 'acg');
  assert.equal(normalizeCategory('furry4k'), 'furry_4k', '分类 key 去掉下划线也应可识别');
  assert.equal(normalizeCategory('BQ/MAOMAO'), 'bq_maomao');
  assert.deepEqual([...disabledKeys('acg, 猫猫；bq')].sort(), ['acg', 'bq', 'bq_maomao'].sort());
  assert.equal(disabledKeys(undefined).size, 0);
  assert.equal(resolveBase('https://a.example/x'), 'https://a.example/x');
  assert.equal(resolveBase('javascript:alert(1)'), 'https://uapis.cn/api/v1/random/image');
  const acg = CATEGORIES.find((c) => c.key === 'acg');
  assert.equal(buildImageUrl('https://a.example/x', acg), 'https://a.example/x?category=acg');
  assert.equal(
    buildImageUrl('https://a.example/x?category=bq', acg),
    'https://a.example/x?category=acg',
    '应覆盖 base 里已有的 category 参数',
  );
  const global = CATEGORIES.find((c) => c.key === 'global');
  assert.equal(buildImageUrl('https://a.example/x', global), 'https://a.example/x', '全局随机不应带任何参数');
  assert.ok(helpText().includes('/随机二次元图'));
});
