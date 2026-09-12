/**
 * 核心逻辑功能测试（不依赖测试框架，构建后由 node 直接运行）：
 *
 *   npx vite build -c vite.test.config.ts
 *   node dist-test/functional.test.mjs
 *
 * 覆盖范围：wbi 签名（含官方测试向量）、uid 校验、api 封装、
 * collector 的过滤 / 去重 / 分页 / 暂停 / 重试 / 页数上限。
 * 面向 DOM 的 panel / ui / main 不在此覆盖。
 */
import SparkMD5 from 'spark-md5';
import { API, CONFIG } from '../src/config';
import { signParams } from '../src/wbi';
import { Collector } from '../src/collector';
import type { StatusKind } from '../src/collector';
import { fetchSpaceFeed, describeApiError } from '../src/api';
import { isValidUid, getUidFromLocation } from '../src/utils/uid';
import { ApiError, DYNAMIC_TYPE_AV } from '../src/types';
import type { DynItem, SpaceFeedResponse } from '../src/types';

// ---------- 断言与用例登记 ----------

type TestFn = () => void | Promise<void>;
const tests: { name: string; fn: TestFn }[] = [];
const test = (name: string, fn: TestFn) => tests.push({ name, fn });

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}
function assertEq<T>(actual: T, expected: T, label = ''): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label ? label + '：' : ''}期望 ${e}，实际 ${a}`);
}

// ---------- mock 基建 ----------

/** 压缩所有 sleep（PAGE_DELAY=800ms、风控退避 5s 等），逻辑不变、跑得快 */
const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realSleep = (ms: number) => new Promise<void>((r) => realSetTimeout(r, ms));
(globalThis as unknown as { setTimeout: typeof setTimeout }).setTimeout = ((
  fn: (...args: unknown[]) => void,
  ms?: number,
  ...rest: unknown[]
) => realSetTimeout(fn, (ms ?? 0) / 100, ...rest)) as unknown as typeof setTimeout;

const jsonOk = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

/** 官方文档测试向量（bilibili-API-collect / docs / misc / sign / wbi.md） */
const OFFICIAL = {
  imgKey: '7cd084941338484aae1ad9425b84077c',
  subKey: '4932caff0ff746eab6f01bf08b70ac45',
  mixinKey: 'ea1db124af3c7062474693fa704f4ff8',
  wts: 1702204169,
  wRid: '8f6f2b5b3d485fe1886cec6a0be8c5d4'
} as const;

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52
] as const;

let navCount = 0;
let feedHandler: ((url: string) => Promise<unknown>) | null = null;

(globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
  const url = typeof input === 'string' ? input : String((input as { url: string }).url);
  if (url.startsWith(API.NAV)) {
    navCount++;
    return jsonOk({
      code: 0,
      message: '0',
      data: {
        wbi_img: {
          img_url: `https://i0.hdslb.com/bfs/wbi/${OFFICIAL.imgKey}.png`,
          sub_url: `https://i0.hdslb.com/bfs/wbi/${OFFICIAL.subKey}.jpg`
        }
      }
    });
  }
  if (url.startsWith(API.SPACE_FEED)) {
    if (!feedHandler) throw new Error('mock feed：本用例未设置 feed handler');
    return feedHandler(url);
  }
  throw new Error('mock fetch：未预期的 URL ' + url);
};

/** 队列式 feed mock：按序返回响应，记录全部请求 URL */
function queueFeed(pages: SpaceFeedResponse[]): { calls: string[] } {
  const calls: string[] = [];
  let i = 0;
  feedHandler = (url) => {
    calls.push(url);
    const page = pages[i++];
    if (!page) throw new Error('mock feed：队列耗尽');
    return Promise.resolve(jsonOk(page));
  };
  return { calls };
}

const feedPage = (items: DynItem[], hasMore: boolean, offset: string): SpaceFeedResponse => ({
  code: 0,
  message: '0',
  data: { items, has_more: hasMore, offset }
});
const apiErr = (code: number, message: string): SpaceFeedResponse => ({
  code,
  message,
  data: null
});

// ---------- 动态条目构造器 ----------

const avItem = (id: string, bvid: string, title: string, badgeText: string | null): DynItem => ({
  id_str: id,
  type: DYNAMIC_TYPE_AV,
  modules: {
    module_dynamic: {
      major: {
        type: 'MAJOR_TYPE_ARCHIVE',
        archive: { bvid, title, badge: badgeText ? { text: badgeText } : null }
      }
    }
  }
});
const repostItem = (id: string): DynItem => ({
  id_str: id,
  type: DYNAMIC_TYPE_AV,
  modules: { module_dynamic: { major: null, orig: { item: '原始动态' } } }
});
const drawItem = (id: string): DynItem => ({
  id_str: id,
  type: 'DYNAMIC_TYPE_DRAW',
  modules: { module_dynamic: { major: { type: 'MAJOR_TYPE_DRAW' } } }
});

// ---------- WBI 签名 ----------

test('WBI：mixinKey 重排与官方向量一致', () => {
  const raw = OFFICIAL.imgKey + OFFICIAL.subKey;
  const mixinKey = MIXIN_KEY_ENC_TAB.map((i) => raw[i]).join('').slice(0, 32);
  assertEq(mixinKey, OFFICIAL.mixinKey, 'mixinKey');
});

test('WBI：signParams 端到端命中官方 w_rid 向量', async () => {
  const realNow = Date.now;
  const navBefore = navCount;
  (Date as unknown as { now: () => number }).now = () => OFFICIAL.wts * 1000;
  try {
    const out = await signParams({ foo: '114', bar: '514', zab: '1919810' });
    assertEq(out.get('w_rid'), OFFICIAL.wRid, 'w_rid');
    assertEq(out.get('wts'), String(OFFICIAL.wts), 'wts');
    assertEq(out.get('foo'), '114', 'foo');
    assertEq(navCount, navBefore + 1, '首次签名应请求一次 nav');
  } finally {
    (Date as unknown as { now: () => number }).now = realNow;
  }
});

test('WBI：空值参数被过滤、值经 encodeURIComponent 编码', async () => {
  const out = await signParams({
    keep: 'one one four',
    cn: '五一四',
    empty: '',
    undef: undefined
  } as unknown as Record<string, string>);
  assertEq(out.get('keep'), 'one one four', 'keep');
  assertEq(out.get('cn'), '五一四', 'cn');
  assertEq(out.get('empty'), null, '空字符串应被过滤');
  assertEq(out.get('undef'), null, 'undefined 应被过滤');
  assertEq(out.get('w_rid')?.length, 32, 'w_rid 应为 32 位 md5');
});

test('WBI：mixinKey 命中缓存时不再请求 nav', async () => {
  const before = navCount;
  await signParams({ a: '1' });
  await signParams({ a: '2' });
  assertEq(navCount, before, '12 小时 TTL 内重复签名不应再请求 nav');
});

// ---------- 错误文案与 api 封装 ----------

test('describeApiError：业务码映射', () => {
  assert(describeApiError(-101).includes('登录'), '-101 应提示登录');
  assert(describeApiError(-352).includes('风控'), '-352 应提示风控');
  assert(describeApiError(-111).includes('CSRF'), '-111 应提示 CSRF');
  assert(describeApiError(-404).includes('接口不存在'), '-404 应提示接口不存在');
  assert(describeApiError(-9999).includes('-9999'), '未知码应带原始 code');
});

test('fetchSpaceFeed：注入签名参数与 offset 分页', async () => {
  const { calls } = queueFeed([feedPage([], true, 'OFFSET-NEXT'), feedPage([], false, '')]);
  await fetchSpaceFeed('946974', '');
  await fetchSpaceFeed('946974', 'OFFSET-NEXT');
  assertEq(calls.length, 2, '请求数');

  const first = new URL(calls[0]);
  assertEq(first.pathname, '/x/polymer/web-dynamic/v1/feed/space', '接口路径');
  assertEq(first.searchParams.get('host_mid'), '946974', 'host_mid');
  assertEq(first.searchParams.get('timezone_offset'), '-480', 'timezone_offset');
  assertEq(first.searchParams.get('platform'), 'web', 'platform');
  assertEq(first.searchParams.get('features'), 'itemOpusStyle', 'features');
  assertEq(first.searchParams.get('offset'), null, '首页不应带 offset');
  assert(first.searchParams.get('wts') !== null, '应带 wts');
  assert(/^[0-9a-f]{32}$/.test(first.searchParams.get('w_rid') ?? ''), '应带 32 位 w_rid');

  const second = new URL(calls[1]);
  assertEq(second.searchParams.get('offset'), 'OFFSET-NEXT', '次页应带 offset');
});

test('fetchSpaceFeed：非零 code 抛 ApiError', async () => {
  queueFeed([apiErr(-101, '账号未登录')]);
  let caught: unknown;
  try {
    await fetchSpaceFeed('1', '');
  } catch (err) {
    caught = err;
  }
  assert(caught instanceof ApiError, '应抛出 ApiError');
  assertEq((caught as ApiError).code, -101, 'code');
});

test('fetchSpaceFeed：HTTP 非 2xx 抛网络错误', async () => {
  feedHandler = () => Promise.resolve({ ok: false, status: 502, json: async () => ({}) });
  let message = '';
  try {
    await fetchSpaceFeed('1', '');
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes('502'), `应包含 HTTP 状态码，实际：${message}`);
});

// ---------- uid ----------

test('uid：isValidUid 只接受纯数字', () => {
  assertEq(isValidUid('946974'), true, '普通 UID');
  assertEq(isValidUid('2'), true, '个位数 UID');
  assertEq(isValidUid('BV1xx411c7mD'), false, 'BV 号');
  assertEq(isValidUid('12a3'), false, '含字母');
  assertEq(isValidUid(''), false, '空串');
  assertEq(isValidUid(' 946974'), false, '带空格');
});

test('uid：getUidFromLocation 从路径解析', () => {
  const g = globalThis as unknown as { window?: unknown };
  const realWindow = g.window;
  g.window = { location: { pathname: '/946974/dynamic' } };
  try {
    assertEq(getUidFromLocation(), '946974', '空间动态页');
    (g.window as { location: { pathname: string } }).location.pathname = '/';
    assertEq(getUidFromLocation(), '', '非空间页');
  } finally {
    g.window = realWindow;
  }
});

// ---------- Collector ----------

test('Collector：类型过滤 / 转发过滤 / badge 校验 / BV 去重 / 标题修剪', async () => {
  const { calls } = queueFeed([
    feedPage(
      [
        avItem('101', 'BV1AAA1111', '带徽标视频A', '动态视频'),
        avItem('102', 'BV1BBB2222', '无徽标视频B', null),
        avItem('103', 'BV1CCC3333', '充电专属视频C', '充电专属'),
        drawItem('104'),
        repostItem('105')
      ],
      true,
      'OFFSET-2'
    ),
    feedPage(
      [
        avItem('201', 'BV1AAA1111', '重复BV应去重', '动态视频'),
        avItem('202', 'BV1DDD4444', '  标题需要修剪  ', '动态视频'),
        avItem('203', 'BV1EEE5555', '', '动态视频')
      ],
      false,
      ''
    )
  ]);

  const c = new Collector();
  const statuses: { kind: StatusKind; message: string }[] = [];
  const progresses: { page: number; added: number; total: number }[] = [];
  await c.start('946974', {
    onStatus: (kind, message) => statuses.push({ kind, message }),
    onProgress: (p) => progresses.push(p)
  });

  assertEq(c.list(), [
    { bv: 'BV1AAA1111', title: '带徽标视频A' },
    { bv: 'BV1DDD4444', title: '标题需要修剪' },
    { bv: 'BV1EEE5555', title: '未知标题' }
  ], '最终结果');
  assertEq(progresses, [
    { page: 1, added: 1, total: 1 },
    { page: 2, added: 2, total: 3 }
  ], '进度回调');
  assertEq(statuses[0]?.kind, 'running', '首个状态');
  assertEq(statuses[statuses.length - 1]?.kind, 'done', '末个状态');
  assert(statuses[statuses.length - 1]?.message.includes('3 个'), '完成文案应含总数');
  assertEq(calls.length, 2, '请求数');
  assertEq(new URL(calls[1]).searchParams.get('offset'), 'OFFSET-2', '游标透传');
  assert(!c.isRunning, '结束后不再处于运行态');
});

test('Collector：响应 offset 为空时回退到末条 id_str', async () => {
  queueFeed([
    feedPage([avItem('701', 'BV1FFF6666', '视频F', '动态视频')], true, ''),
    feedPage([], false, '')
  ]);
  const { calls } = { calls: [] as string[] };
  const c = new Collector();
  feedHandler = (url) => {
    calls.push(url);
    return Promise.resolve(
      calls.length === 1
        ? jsonOk(feedPage([avItem('701', 'BV1FFF6666', '视频F', '动态视频')], true, ''))
        : jsonOk(feedPage([], false, ''))
    );
  };
  await c.start('1');
  assertEq(c.list(), [{ bv: 'BV1FFF6666', title: '视频F' }], '结果');
  assertEq(new URL(calls[1]).searchParams.get('offset'), '701', 'offset 应取末条 id_str');
});

test('Collector：暂停后不再翻页，继续后完成', async () => {
  queueFeed([
    feedPage([avItem('801', 'BV1GGG7777', '视频G1', '动态视频')], true, 'P2'),
    feedPage([avItem('802', 'BV1HHH8888', '视频G2', '动态视频')], true, 'P3'),
    feedPage([], false, '')
  ]);
  const c = new Collector();
  const progresses: { page: number }[] = [];
  const done = c.start('1', { onProgress: (p) => progresses.push({ page: p.page }) });

  c.pause();
  assert(c.isPaused, '应处于暂停态');
  assert(c.isRunning, '暂停时仍应处于运行态');
  await realSleep(50);
  assertEq(progresses.length, 1, '暂停期间不应推进到下一页');

  c.resume();
  await done;
  assertEq(progresses.length, 3, '继续后应完成全部页');
  assert(!c.isPaused && !c.isRunning, '结束后状态复位');
});

test('Collector：风控 -352 自动退避重试后成功', async () => {
  const c = new Collector();
  let attempts = 0;
  feedHandler = () => {
    attempts++;
    return Promise.resolve(
      attempts === 1
        ? jsonOk(apiErr(-352, '请求被拦截'))
        : jsonOk(feedPage([avItem('901', 'BV1III9999', '视频I', '动态视频')], false, ''))
    );
  };
  await c.start('1');
  assertEq(attempts, 2, '首次 + 一次风控重试');
  assertEq(c.list(), [{ bv: 'BV1III9999', title: '视频I' }], '重试后成功');
});

test('Collector：网络瞬时错误自动重试后成功', async () => {
  const c = new Collector();
  let attempts = 0;
  feedHandler = () => {
    attempts++;
    if (attempts === 1) return Promise.reject(new TypeError('fetch failed'));
    return Promise.resolve(jsonOk(feedPage([], false, '')));
  };
  await c.start('1');
  assertEq(attempts, 2, '首次 + 一次网络重试');
});

test('Collector：风控重试耗尽后按描述文案失败', async () => {
  const c = new Collector();
  let attempts = 0;
  feedHandler = () => {
    attempts++;
    return Promise.resolve(jsonOk(apiErr(-352, '请求被拦截')));
  };
  const statuses: StatusKind[] = [];
  let rejected = false;
  let message = '';
  await c.start('1', { onStatus: (kind) => statuses.push(kind) }).catch((err: Error) => {
    rejected = true;
    message = err.message;
  });
  assert(rejected, 'start 应以失败告终');
  assertEq(attempts, 1 + CONFIG.RISK_RETRY, '重试次数应为 1 + RISK_RETRY');
  assert(message.includes('风控'), `错误文案应提示风控，实际：${message}`);
  assert(!statuses.includes('done'), '失败不应报告 done');
  assert(!c.isRunning, '失败后不再处于运行态');
});

test('Collector：达到 MAX_PAGES 上限自动停止', async () => {
  const calls: string[] = [];
  feedHandler = (url) => {
    calls.push(url);
    return Promise.resolve(jsonOk(feedPage([], true, '')));
  };
  const c = new Collector();
  const statuses: { kind: StatusKind; message: string }[] = [];
  await c.start('1', { onStatus: (kind, message) => statuses.push({ kind, message }) });
  assertEq(calls.length, CONFIG.MAX_PAGES, '请求数应止步于 MAX_PAGES');
  assertEq(statuses[statuses.length - 1]?.kind, 'done', '应正常完成而非报错');
});

// ---------- 运行器 ----------

async function main(): Promise<void> {
  let failed = 0;
  const started = Date.now();
  for (const { name, fn } of tests) {
    feedHandler = null;
    try {
      await fn();
      console.log(`PASS  ${name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL  ${name}`);
      console.error(`      ${(err as Error).message}`);
    }
  }
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${tests.length - failed}/${tests.length} 项通过（${secs}s）`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
