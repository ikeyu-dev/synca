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
 * お知らせページに移動してデータを取得
 */
async function fetchNoticesFromPage(page: Page): Promise<PortalNotice[]> {
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
                isRead: true,  // 既読/未読の判定は現状では困難
                isImportant,
            });
        }

        // 重複を削除（タイトルが同じものは除外）
        const uniqueNotices = notices.filter(
            (notice, index, self) =>
                index === self.findIndex((n) => n.title === notice.title)
        );

        console.log("[NIT Portal] 抽出したお知らせ数:", uniqueNotices.length);
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
 */
export async function fetchPortalNotices(forceRefresh = false): Promise<{
    success: boolean;
    data?: PortalNotice[];
    error?: string;
}> {
    // キャッシュをチェック
    if (!forceRefresh) {
        const cachedNotices = readCache();
        if (cachedNotices) {
            return {
                success: true,
                data: cachedNotices,
            };
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

        // お知らせを取得
        const notices = await fetchNoticesFromPage(page);

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
