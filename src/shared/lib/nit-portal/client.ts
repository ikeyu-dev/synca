/**
 * NIT Portal スクレイピングクライアント
 * 大学ポータルサイトからお知らせを取得
 */

import puppeteer, { type Browser, type Page } from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const PORTAL_URL = "https://portal.nit.ac.jp/uprx/up/bs/bsc005/Bsc00501.xhtml";
const CACHE_FILE = path.join(process.cwd(), ".cache", "portal-notices.json");
const CACHE_TTL = 30 * 60 * 1000; // 30分

/**
 * お知らせの型定義
 */
export interface PortalNotice {
    id: string;
    title: string;
    category: string;
    date: string;
    isRead: boolean;
    isImportant: boolean;
    content?: string;
    sender?: string;
}

/**
 * キャッシュデータの型
 */
interface CacheData {
    notices: PortalNotice[];
    timestamp: number;
}

/**
 * キャッシュを読み込む
 */
function readCache(): PortalNotice[] | null {
    try {
        if (!fs.existsSync(CACHE_FILE)) {
            return null;
        }

        const data = fs.readFileSync(CACHE_FILE, "utf-8");
        const cache: CacheData = JSON.parse(data);

        // キャッシュが有効期限内か確認
        if (Date.now() - cache.timestamp < CACHE_TTL) {
            console.log("[NIT Portal] キャッシュから読み込み");
            return cache.notices;
        }

        console.log("[NIT Portal] キャッシュ期限切れ");
        return null;
    } catch (error) {
        console.error("[NIT Portal] キャッシュ読み込みエラー:", error);
        return null;
    }
}

/**
 * キャッシュに書き込む
 */
function writeCache(notices: PortalNotice[]): void {
    try {
        const cacheDir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const cache: CacheData = {
            notices,
            timestamp: Date.now(),
        };

        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
        console.log("[NIT Portal] キャッシュに保存");
    } catch (error) {
        console.error("[NIT Portal] キャッシュ書き込みエラー:", error);
    }
}

/**
 * 認証情報を取得
 */
function getCredentials(): { userId: string; password: string } | null {
    const userId = process.env.NIT_PORTAL_USER_ID;
    const password = process.env.NIT_PORTAL_PASSWORD;

    if (!userId || !password) {
        return null;
    }

    return { userId, password };
}

/**
 * ブラウザを起動
 */
async function launchBrowser(): Promise<Browser> {
    return puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ],
    });
}

/**
 * ログイン処理
 */
async function login(page: Page, userId: string, password: string): Promise<boolean> {
    try {
        // ログインページに移動
        await page.goto(PORTAL_URL, {
            waitUntil: "networkidle2",
            timeout: 30000,
        });

        // ユーザーIDを入力
        await page.waitForSelector('input[id="loginForm:userId"]', { timeout: 10000 });
        await page.type('input[id="loginForm:userId"]', userId);

        // パスワードを入力
        await page.type('input[id="loginForm:password"]', password);

        // ログインボタンをクリック
        await page.click('button[id="loginForm:loginButton"]');

        // ページ遷移を待機
        await page.waitForNavigation({
            waitUntil: "networkidle2",
            timeout: 30000,
        });

        // ログイン成功の確認（ログインフォームがなくなっていることを確認）
        const loginForm = await page.$('input[id="loginForm:userId"]');
        return loginForm === null;
    } catch (error) {
        console.error("[NIT Portal] ログインエラー:", error);
        return false;
    }
}

/**
 * モーダルから本文を抽出
 */
async function extractContentFromModal(page: Page): Promise<string | null> {
    try {
        const content = await page.evaluate(() => {
            // 要素からテキストを抽出（改行を保持）
            function getTextWithBreaks(el: Element): string {
                if (el instanceof HTMLElement) {
                    return el.innerText.trim();
                }
                const html = el.innerHTML;
                return html
                    .replace(/<br\s*\/?>/gi, "\n")
                    .replace(/<\/p>/gi, "\n")
                    .replace(/<\/div>/gi, "\n")
                    .replace(/<\/li>/gi, "\n")
                    .replace(/<[^>]+>/g, "")
                    .replace(/&nbsp;/g, " ")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim();
            }

            // モーダル/ダイアログを探す
            const modalSelectors = [
                ".ui-dialog",
                ".ui-dialog-content",
                "[role='dialog']",
                ".modal",
                ".modal-content",
                ".dialog",
                ".dialog-content",
                ".popup",
                ".overlay",
                "[class*='dialog']",
                "[class*='modal']",
                "[class*='popup']",
            ];

            let modalElement: Element | null = null;
            for (const selector of modalSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    // 表示されているモーダルを探す
                    const style = window.getComputedStyle(el);
                    if (
                        style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        el.textContent &&
                        el.textContent.length > 50
                    ) {
                        modalElement = el;
                        break;
                    }
                }
                if (modalElement) break;
            }

            if (!modalElement) {
                return null;
            }

            // モーダル内から本文を探す
            const contentSelectors = [
                "textarea",
                ".ui-outputtext",
                "[id*='honbun']",
                "[id*='naiyou']",
                "[id*='content']",
                "[class*='honbun']",
                "[class*='body']",
                "pre",
                ".message",
            ];

            for (const selector of contentSelectors) {
                const element = modalElement.querySelector(selector);
                if (element) {
                    const text = getTextWithBreaks(element);
                    if (text.length > 10) {
                        return text;
                    }
                }
            }

            // テーブル行から本文を探す
            const rows = modalElement.querySelectorAll("tr");
            for (const row of rows) {
                const cells = row.querySelectorAll("td, th");
                for (let i = 0; i < cells.length - 1; i++) {
                    const label = cells[i]?.textContent?.trim() || "";
                    const valueCell = cells[i + 1];
                    if (
                        valueCell &&
                        (label === "本文" ||
                            label === "内容" ||
                            label === "メッセージ" ||
                            label.includes("本文"))
                    ) {
                        const value = getTextWithBreaks(valueCell);
                        if (value.length > 5) {
                            return value;
                        }
                    }
                }
            }

            // モーダル全体のテキストから本文部分を抽出（innerTextで改行保持）
            const modalText = modalElement instanceof HTMLElement
                ? modalElement.innerText
                : modalElement.textContent || "";
            const lines = modalText.split("\n");
            const contentLines: string[] = [];
            let inContent = false;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === "本文" || trimmed === "内容") {
                    inContent = true;
                    continue;
                }
                if (
                    inContent &&
                    (trimmed === "添付ファイル" ||
                        trimmed === "閉じる" ||
                        trimmed === "戻る" ||
                        trimmed === "OK")
                ) {
                    break;
                }
                if (inContent) {
                    // 空行も保持
                    contentLines.push(trimmed);
                }
            }

            if (contentLines.length > 0) {
                // 先頭と末尾の空行を除去しつつ、中間の空行は保持
                const result = contentLines.join("\n").trim();
                if (result.length > 0) {
                    return result;
                }
            }

            // 最終手段: モーダル内の長いテキストを返す
            const allText = modalElement instanceof HTMLElement
                ? modalElement.innerText.trim()
                : modalElement.textContent?.trim() || "";
            if (allText.length > 100) {
                // 最初と最後の部分（ヘッダー/フッター）を除外
                const textLines = allText.split("\n");
                if (textLines.length > 4) {
                    return textLines.slice(2, -2).join("\n").trim();
                }
            }

            return null;
        });

        return content;
    } catch (error) {
        console.error("[NIT Portal] モーダル本文抽出エラー:", error);
        return null;
    }
}

/**
 * モーダルを閉じる
 */
async function closeModal(page: Page): Promise<void> {
    try {
        await page.evaluate(() => {
            // 閉じるボタンを探してクリック
            const closeSelectors = [
                ".ui-dialog-titlebar-close",
                "[aria-label='Close']",
                ".close",
                ".modal-close",
                ".dialog-close",
                "button[class*='close']",
                ".ui-icon-closethick",
            ];

            for (const selector of closeSelectors) {
                const closeBtn = document.querySelector(selector) as HTMLElement;
                if (closeBtn) {
                    closeBtn.click();
                    return;
                }
            }

            // 閉じるボタンがなければ、「閉じる」「OK」テキストのボタンを探す
            const buttons = document.querySelectorAll("button, a, span");
            for (const btn of buttons) {
                const text = btn.textContent?.trim() || "";
                if (text === "閉じる" || text === "OK" || text === "Close") {
                    (btn as HTMLElement).click();
                    return;
                }
            }

            // ESCキーを送信
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        });

        // モーダルが閉じるのを待つ
        await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
        console.error("[NIT Portal] モーダルを閉じるエラー:", error);
    }
}

/**
 * お知らせ詳細を取得（モーダル対応版）
 */
async function fetchNoticeDetail(
    page: Page,
    noticeTitle: string
): Promise<string | null> {
    try {
        // お知らせのタイトルをクリック
        const clicked = await page.evaluate((title) => {
            // タイトルの先頭20文字で検索
            const searchText = title.substring(0, 20);

            // リンクテキストでお知らせを探す
            const links = Array.from(document.querySelectorAll("a"));
            for (const link of links) {
                const text = link.textContent?.trim() || "";
                if (text.includes(searchText)) {
                    link.click();
                    return true;
                }
            }

            // テーブル行でも探す
            const rows = Array.from(document.querySelectorAll("tr"));
            for (const row of rows) {
                const text = row.textContent || "";
                if (text.includes(searchText)) {
                    // 行内のリンクをクリック
                    const link = row.querySelector("a");
                    if (link) {
                        link.click();
                        return true;
                    }
                    // クリック可能な要素を探す
                    const clickable = row.querySelector("[onclick], [data-ri], button");
                    if (clickable) {
                        (clickable as HTMLElement).click();
                        return true;
                    }
                    // 行自体をクリック
                    (row as HTMLElement).click();
                    return true;
                }
            }

            return false;
        }, noticeTitle);

        if (!clicked) {
            console.log(`[NIT Portal] クリック対象が見つかりません: ${noticeTitle.substring(0, 30)}...`);
            return null;
        }

        // モーダルが表示されるのを待つ
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // モーダルが表示されたか確認
        const modalVisible = await page.evaluate(() => {
            const modalSelectors = [
                ".ui-dialog:not([style*='display: none'])",
                "[role='dialog']",
                ".modal.show",
                ".modal[style*='display: block']",
            ];
            for (const selector of modalSelectors) {
                if (document.querySelector(selector)) {
                    return true;
                }
            }
            return false;
        });

        if (!modalVisible) {
            // ページ遷移の可能性があるので少し待つ
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // 本文を抽出
        const content = await extractContentFromModal(page);

        // モーダルを閉じる
        await closeModal(page);

        // 少し待機
        await new Promise((resolve) => setTimeout(resolve, 500));

        return content;
    } catch (error) {
        console.error("[NIT Portal] 詳細取得エラー:", error);
        return null;
    }
}

/**
 * お知らせページに移動してデータを取得
 */
async function fetchNoticesFromPage(
    page: Page,
    withContent = false
): Promise<PortalNotice[]> {
    const notices: PortalNotice[] = [];

    try {
        // ページの読み込みを待機
        await page.waitForSelector("body", { timeout: 10000 });

        // ページのテキスト全体を取得
        const bodyText = await page.evaluate(() => document.body.innerText);

        // お知らせ行のパターンを抽出
        // フォーマット: "タイトル [差出人] YYYY/MM/DD"
        const lines = bodyText.split("\n");
        let id = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // 日付パターン（YYYY/MM/DD）を含む行を探す
            const dateMatch = trimmedLine.match(/(\d{4}\/\d{2}\/\d{2})$/);
            if (!dateMatch) continue;

            // [差出人] パターンを探す
            const senderMatch = trimmedLine.match(/\[(.+?)\]/);
            if (!senderMatch) continue;

            const date = dateMatch[1];
            const sender = senderMatch[1];

            // タイトルを抽出（[差出人] より前の部分）
            let title = trimmedLine
                .replace(/\[.+?\]/, "")  // [差出人]を削除
                .replace(/\d{4}\/\d{2}\/\d{2}$/, "")  // 日付を削除
                .trim();

            // 不要な文字を除去
            if (title.startsWith("フラグをつける") || title.startsWith("既読にする")) {
                continue;
            }

            // 空のタイトルはスキップ
            if (!title || title.length < 5) continue;

            // 重要かどうか
            const isImportant = title.includes("重要") || title.includes("至急");

            // カテゴリを判定
            let category = "掲示";
            if (title.includes("授業") || sender.includes("教務") || sender.includes("教育")) {
                category = "授業";
            } else if (title.includes("就職") || sender.includes("就職")) {
                category = "就職";
            } else if (title.includes("アンケート")) {
                category = "アンケート";
            }

            notices.push({
                id: `notice-${id++}`,
                title,
                category,
                date,
                isRead: true,
                isImportant,
                sender,
            });
        }

        // 重複を削除（タイトルが同じものは除外）
        const uniqueNotices = notices.filter(
            (notice, index, self) =>
                index === self.findIndex((n) => n.title === notice.title)
        );

        console.log("[NIT Portal] 抽出したお知らせ数:", uniqueNotices.length);

        // 詳細内容を取得（オプション）
        if (withContent && uniqueNotices.length > 0) {
            console.log("[NIT Portal] 本文を取得中...");
            // 最新の15件の本文を取得
            const maxDetails = Math.min(uniqueNotices.length, 15);
            for (let i = 0; i < maxDetails; i++) {
                const notice = uniqueNotices[i];
                console.log(`[NIT Portal] 本文取得 ${i + 1}/${maxDetails}: ${notice.title.substring(0, 30)}...`);
                const content = await fetchNoticeDetail(page, notice.title);
                if (content) {
                    notice.content = content;
                    console.log(`[NIT Portal] 本文取得成功 (${content.length}文字)`);
                } else {
                    console.log(`[NIT Portal] 本文取得失敗`);
                }
                // レート制限のため待機
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        return uniqueNotices;
    } catch (error) {
        console.error("[NIT Portal] お知らせ取得エラー:", error);
    }

    return notices;
}

/**
 * お知らせ一覧ページに移動（メニューからクリック）
 */
async function navigateToNoticesPage(page: Page): Promise<boolean> {
    try {
        // 現在のページ内容をデバッグ
        const currentUrl = page.url();
        console.log("[NIT Portal] 現在のURL:", currentUrl);

        // 「掲示板」リンクをテキストで探してクリック
        const clicked = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll("a"));
            const noticeLink = links.find((a) => {
                const text = a.textContent?.trim() || "";
                return text === "掲示板" || text.includes("掲示板");
            });

            if (noticeLink) {
                noticeLink.click();
                return true;
            }
            return false;
        });

        if (clicked) {
            console.log("[NIT Portal] 掲示板リンクをクリック");

            // ページ遷移を待機
            await page.waitForNavigation({
                waitUntil: "networkidle2",
                timeout: 15000,
            });

            console.log("[NIT Portal] お知らせページに移動:", page.url());
            return true;
        }

        console.log("[NIT Portal] 掲示板リンクが見つかりませんでした");
        return false;
    } catch (error) {
        console.error("[NIT Portal] お知らせページへの移動エラー:", error);
        return false;
    }
}

/**
 * ポータルサイトからお知らせを取得
 * @param forceRefresh - trueの場合、キャッシュを無視して再取得
 * @param withContent - trueの場合、各お知らせの詳細内容も取得
 */
export async function fetchPortalNotices(
    forceRefresh = false,
    withContent = true
): Promise<{
    success: boolean;
    data?: PortalNotice[];
    error?: string;
}> {
    // キャッシュをチェック（詳細取得時はキャッシュに詳細があるか確認）
    if (!forceRefresh) {
        const cachedNotices = readCache();
        if (cachedNotices) {
            // 詳細が必要な場合、キャッシュに詳細があるか確認
            const hasContent = cachedNotices.some((n) => n.content);
            if (!withContent || hasContent) {
                return {
                    success: true,
                    data: cachedNotices,
                };
            }
        }
    }

    const credentials = getCredentials();
    if (!credentials) {
        return {
            success: false,
            error: "ポータルサイトの認証情報が設定されていません",
        };
    }

    let browser: Browser | null = null;

    try {
        browser = await launchBrowser();
        const page = await browser.newPage();

        // タイムアウトを設定
        page.setDefaultTimeout(30000);

        // ログイン
        const loginSuccess = await login(
            page,
            credentials.userId,
            credentials.password
        );

        if (!loginSuccess) {
            return {
                success: false,
                error: "ログインに失敗しました",
            };
        }

        console.log("[NIT Portal] ログイン成功");

        // お知らせ一覧ページに移動
        const navigateSuccess = await navigateToNoticesPage(page);
        if (!navigateSuccess) {
            return {
                success: false,
                error: "お知らせページへの移動に失敗しました",
            };
        }

        // お知らせを取得（詳細内容も取得）
        const notices = await fetchNoticesFromPage(page, withContent);

        // キャッシュに保存
        writeCache(notices);

        console.log("[NIT Portal] 取得したお知らせ数:", notices.length);

        return {
            success: true,
            data: notices,
        };
    } catch (error) {
        console.error("[NIT Portal] エラー:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "お知らせの取得に失敗しました",
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * 接続テスト
 */
export async function checkPortalConnection(): Promise<{
    connected: boolean;
    error?: string;
}> {
    const credentials = getCredentials();
    if (!credentials) {
        return {
            connected: false,
            error: "認証情報が設定されていません",
        };
    }

    let browser: Browser | null = null;

    try {
        browser = await launchBrowser();
        const page = await browser.newPage();

        const loginSuccess = await login(
            page,
            credentials.userId,
            credentials.password
        );

        return {
            connected: loginSuccess,
            error: loginSuccess ? undefined : "ログインに失敗しました",
        };
    } catch (error) {
        return {
            connected: false,
            error:
                error instanceof Error
                    ? error.message
                    : "接続テストに失敗しました",
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
