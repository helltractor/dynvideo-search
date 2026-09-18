/** 动态类型：原创视频动态 */
export const DYNAMIC_TYPE_AV = 'DYNAMIC_TYPE_AV';

/** 提取到的视频条目 */
export interface CollectedVideo {
  bv: string;
  title: string;
}

/** 带业务 code 的 API 错误 */
export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------- WBI ----------

export interface WbiImage {
  img_url: string;
  sub_url: string;
}

export interface NavResponse {
  code: number;
  message: string;
  data: { wbi_img?: WbiImage } | null;
}

// ---------- 空间动态 feed ----------

export interface DynArchive {
  bvid: string;
  title: string;
  badge?: { text: string } | null;
}

export interface DynMajor {
  type: string;
  archive?: DynArchive | null;
}

export interface DynItem {
  id_str: string;
  type: string;
  modules: {
    module_dynamic: {
      major?: DynMajor | null;
      /** 转发动态时存在原始内容 */
      orig?: unknown;
    } | null;
  } | null;
}

export interface SpaceFeedData {
  items: DynItem[] | null;
  has_more: boolean;
  offset: string;
}

export interface SpaceFeedResponse {
  code: number;
  message: string;
  data: SpaceFeedData | null;
}

// ---------- 用户卡片（UP 主头像） ----------

export interface UpCardResponse {
  code: number;
  message: string;
  data: {
    card?: {
      /** 头像图片地址 */
      face?: string;
    } | null;
  } | null;
}
