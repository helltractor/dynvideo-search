import { CONFIG } from './config';
import { fetchSpaceFeed, describeApiError } from './api';
import { ApiError, DYNAMIC_TYPE_AV } from './types';
import type { CollectedVideo, DynItem, SpaceFeedResponse } from './types';

export type StatusKind = 'running' | 'paused' | 'done' | 'error';

export interface CollectProgress {
  page: number;
  added: number;
  total: number;
}

export interface CollectorHooks {
  onStatus?: (kind: StatusKind, message: string) => void;
  onProgress?: (progress: CollectProgress) => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 采集器：通过官方 API 分页拉取 UP 主空间动态，
 * 过滤出原创「动态视频」并去重，支持暂停 / 继续 / 停止。
 */
export class Collector {
  private readonly videos = new Map<string, string>();
  private running = false;
  private paused = false;

  get count(): number {
    return this.videos.size;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** 当前已提取结果 */
  list(): CollectedVideo[] {
    return [...this.videos.entries()].map(([bv, title]) => ({ bv, title }));
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  stop(): void {
    this.running = false;
    this.paused = false;
  }

  /** 开始采集；返回的 Promise 在采集完成或失败时结束 */
  async start(uid: string, hooks: CollectorHooks = {}): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    hooks.onStatus?.('running', '正在初始化 WBI 签名...');

    try {
      let offset = '';
      let hasMore = true;
      let page = 0;

      while (this.running && hasMore && page < CONFIG.MAX_PAGES) {
        await this.waitWhilePaused();
        if (!this.running) break;

        const resp = await this.fetchWithRetry(uid, offset);
        if (!this.running) break; // 请求期间被停止

        const items = resp.data?.items ?? [];
        const added = this.addItems(items);
        hasMore = Boolean(resp.data?.has_more);
        offset = resp.data?.offset || (items.length > 0 ? items[items.length - 1].id_str : offset);
        page++;

        hooks.onProgress?.({ page, added, total: this.videos.size });
        console.log(`📄 第 ${page} 页：新增 ${added} 个，累计 ${this.videos.size} 个`);

        if (this.running && hasMore) {
          await this.waitWhilePaused();
          await sleep(CONFIG.PAGE_DELAY);
        }
      }

      if (this.running) {
        hooks.onStatus?.('done', `采集完成：共 ${this.videos.size} 个动态视频`);
      }
    } finally {
      this.running = false;
      this.paused = false;
    }
  }

  /** 暂停感知的等待 */
  private async waitWhilePaused(): Promise<void> {
    while (this.running && this.paused) {
      await sleep(300);
    }
  }

  /** 带重试的拉取：风控 -352 与网络瞬时错误可重试 */
  private async fetchWithRetry(uid: string, offset: string): Promise<SpaceFeedResponse> {
    let riskRetries = 0;
    let netRetries = 0;
    for (;;) {
      try {
        return await fetchSpaceFeed(uid, offset);
      } catch (err) {
        if (err instanceof ApiError && err.code === -352 && riskRetries < CONFIG.RISK_RETRY) {
          riskRetries++;
          console.warn(
            `⚠️ 触发风控，${riskRetries * 5} 秒后重试（${riskRetries}/${CONFIG.RISK_RETRY}）`
          );
          await sleep(5000 * riskRetries);
          continue;
        }
        if (!(err instanceof ApiError) && netRetries < CONFIG.NETWORK_RETRY) {
          netRetries++;
          await sleep(2000);
          continue;
        }
        if (err instanceof ApiError) {
          throw new Error(describeApiError(err.code));
        }
        throw err;
      }
    }
  }

  /** 从一页数据中提取并去重原创「动态视频」 */
  private addItems(items: DynItem[]): number {
    let added = 0;
    for (const item of items) {
      if (item.type !== DYNAMIC_TYPE_AV) continue;
      const dyn = item.modules?.module_dynamic;
      if (!dyn || dyn.orig) continue; // 跳过转发动态
      const archive = dyn.major?.archive;
      if (!archive?.bvid) continue;
      if (CONFIG.REQUIRE_BADGE && archive.badge?.text?.trim() !== '动态视频') continue;
      const title = archive.title?.trim() || '未知标题';
      if (this.videos.has(archive.bvid)) continue;
      this.videos.set(archive.bvid, title);
      added++;
      console.log(`🆕 ${archive.bvid} | ${title}`);
    }
    return added;
  }
}
