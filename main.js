// ==UserScript==
// @name         B站动态视频BV号提取器
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  自动滚动加载UP主动态，提取原创动态视频（带"动态视频"badge）的BV号和标题，支持启动/暂停控制
// @author       You
// @match        https://space.bilibili.com/*/dynamic*
// @match        https://space.bilibili.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ========== 配置常量 ==========
    const CONFIG = {
        SCROLL_DELAY: 2000,
        EXTRA_WAIT: 2000,
        MAX_NO_CHANGE: 2,
    };

    // ========== DOM 选择器常量 ==========
    const SELECTORS = {
        DYN_ITEM: '.bili-dyn-item',
        FORWARD: '.bili-dyn-content__forward',
        VIDEO_LINK: '.bili-dyn-content__orig a.bili-dyn-card-video',
        BADGE: '.bili-dyn-card-video__badge',
        TITLE: '.bili-dyn-card-video__title',
        DYN_LIST: '.bili-dyn-list',
    };

    // ========== UI 样式常量 ==========
    const STYLES = {
        PANEL: `position: fixed; bottom: 20px; right: 20px; width: 380px; max-height: 500px; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; z-index: 99999; font-family: Arial, sans-serif; font-size: 14px; display: flex; flex-direction: column; gap: 8px;`,
        TEXTAREA: `width: 100%; height: 180px; resize: vertical; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; font-family: Consolas, monospace;`,
        BTN_PRIMARY: `flex: 1; padding: 8px 12px; background: #00a1d6; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;`,
        BTN_SECONDARY: `flex: 1; padding: 8px 12px; background: #f0f0f0; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 14px;`,
    };

    // ========== 状态管理 ==========
    const state = {
        videoMap: new Map(),
        panel: null,
        statusDiv: null,
        outputTextarea: null,
        copyBtn: null,
        toggleBtn: null,
        running: false,
        paused: false,
    };

    // ========== 辅助函数 ==========

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const extractBV = (url) => {
        const match = url.match(/BV[0-9A-Za-z]+/);
        return match ? match[0] : null;
    };

    const getVideoArray = () => 
        [...state.videoMap.entries()].map(([bv, title]) => ({ bv, title }));

    const updatePanel = () => {
        const status = state.paused ? '已暂停' : (state.running ? '运行中...' : '未启动');
        state.statusDiv.textContent = `状态：${status} | 已发现视频：${state.videoMap.size} 个`;
        state.outputTextarea.value = JSON.stringify(getVideoArray(), null, 2);
    };

    // ========== 核心逻辑 ==========

    const extractNewBVids = () => {
        const items = document.querySelectorAll(SELECTORS.DYN_ITEM);
        let foundCount = 0;

        items.forEach(item => {
            // 跳过转发动态
            if (item.querySelector(SELECTORS.FORWARD)) return;

            const links = item.querySelectorAll(SELECTORS.VIDEO_LINK);
            links.forEach(link => {
                // 验证 badge
                const badge = link.querySelector(SELECTORS.BADGE);
                if (!badge || badge.textContent.trim() !== '动态视频') return;

                // 提取 BV 号
                const bv = extractBV(link.href);
                if (!bv) return;

                // 防重复
                if (state.videoMap.has(bv)) return;

                // 获取标题
                const titleEl = link.querySelector(SELECTORS.TITLE);
                const title = titleEl ? titleEl.textContent.trim() : '未知标题';

                // 保存
                state.videoMap.set(bv, title);
                foundCount++;
                console.log(`🆕 ${bv} | ${title}`);
            });
        });

        return foundCount;
    };

    const scrollAndExtract = async () => {
        console.log('🚀 开始采集...');
        let lastHeight = 0;
        let noChangeCount = 0;

        extractNewBVids();
        updatePanel();

        while (state.running) {
            // 等待暂停解除
            while (state.paused && state.running) {
                await sleep(500);
            }
            if (!state.running) break;

            // 滚动页面
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(CONFIG.SCROLL_DELAY);

            // 检查暂停
            while (state.paused && state.running) {
                await sleep(500);
            }
            if (!state.running) break;

            // 检测是否加载了新内容
            const newHeight = document.body.scrollHeight;
            if (newHeight === lastHeight) {
                noChangeCount++;
                await sleep(CONFIG.EXTRA_WAIT);
                if (document.body.scrollHeight === newHeight) {
                    noChangeCount++;
                    if (noChangeCount >= CONFIG.MAX_NO_CHANGE) break;
                } else {
                    noChangeCount = 0;
                }
            } else {
                noChangeCount = 0;
            }
            lastHeight = newHeight;

            // 提取新视频
            extractNewBVids();
            updatePanel();
        }

        // 最后一次提取
        extractNewBVids();
        updatePanel();

        console.log('✅ 采集完成');
        state.statusDiv.textContent = `状态：已完成 ✅ 共 ${state.videoMap.size} 个视频`;
        state.running = false;
        state.toggleBtn.textContent = '▶ 启动';
    };

    // ========== UI 创建 ==========

    const createButton = (text, style, onClick) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = style;
        btn.addEventListener('click', onClick);
        return btn;
    };

    const createPanel = () => {
        state.panel = document.createElement('div');
        state.panel.style.cssText = STYLES.PANEL;

        // 标题
        const title = document.createElement('div');
        title.textContent = '📡 动态视频BV号提取器';
        title.style.cssText = 'font-weight: bold; font-size: 16px;';
        state.panel.appendChild(title);

        // 状态
        state.statusDiv = document.createElement('div');
        state.statusDiv.textContent = '状态：未启动';
        state.statusDiv.style.color = '#555';
        state.panel.appendChild(state.statusDiv);

        // 文本框
        state.outputTextarea = document.createElement('textarea');
        state.outputTextarea.placeholder = '序列化后的数据将显示在这里...';
        state.outputTextarea.style.cssText = STYLES.TEXTAREA;
        state.panel.appendChild(state.outputTextarea);

        // 按钮容器
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 8px;';

        // 启动/暂停按钮
        state.toggleBtn = createButton('▶ 启动', STYLES.BTN_PRIMARY, onToggleClick);
        btnContainer.appendChild(state.toggleBtn);

        // 复制按钮
        state.copyBtn = createButton('复制JSON', STYLES.BTN_SECONDARY, onCopyClick);
        btnContainer.appendChild(state.copyBtn);

        state.panel.appendChild(btnContainer);
        document.body.appendChild(state.panel);
    };

    // ========== 事件处理 ==========

    const onToggleClick = () => {
        if (!state.running) {
            state.running = true;
            state.paused = false;
            state.toggleBtn.textContent = '⏸ 暂停';
            state.statusDiv.textContent = '状态：运行中...';
            scrollAndExtract().catch(err => {
                console.error('错误：', err);
                state.statusDiv.textContent = '❌ 出错：' + err.message;
                state.running = false;
                state.toggleBtn.textContent = '▶ 启动';
            });
        } else if (!state.paused) {
            state.paused = true;
            state.toggleBtn.textContent = '▶ 继续';
            state.statusDiv.textContent = '状态：已暂停';
        } else {
            state.paused = false;
            state.toggleBtn.textContent = '⏸ 暂停';
            state.statusDiv.textContent = '状态：运行中...';
        }
    };

    const onCopyClick = () => {
        navigator.clipboard.writeText(state.outputTextarea.value).then(() => {
            state.copyBtn.textContent = '已复制✅';
            setTimeout(() => state.copyBtn.textContent = '复制JSON', 1500);
        }).catch(() => {
            alert('复制失败，请手动复制');
        });
    };

    // ========== 初始化 ==========

    const isDynamicPage = () => {
        return window.location.pathname.includes('/dynamic') ||
               document.querySelector(SELECTORS.DYN_LIST) !== null;
    };

    const init = () => {
        const checkExist = setInterval(() => {
            if (document.body && isDynamicPage()) {
                clearInterval(checkExist);
                createPanel();
                console.log('💡 脚本已就绪，点击"启动"按钮开始提取');
            }
        }, 500);

        setTimeout(() => clearInterval(checkExist), 10000);
    };

    init();
})();
