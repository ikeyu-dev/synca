/**
 * ポータルサイトスクレイピングスクリプト
 * GitHub Actionsから実行される
 */

import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const PORTAL_URL = "https://portal.nit.ac.jp/uprx/up/bs/bsc005/Bsc00501.xhtml";
const CACHE_FILE = path.join(process.cwd(), ".cache", "portal-notices.json");

/**
 * ログイン処理
 */
async function login(page, userId, password) {
    try {
        await page.goto(PORTAL_URL, {
            waitUntil: "networkidle2",
            timeout: 30000,
        });

        await page.waitForSelector('input[id="loginForm:userId"]', { timeout: 10000 });
        await page.type('input[id="loginForm:userId"]', userId);
        await page.type('input[id="loginForm:password"]', password);
        await page.click('button[id="loginForm:loginButton"]');

        await page.waitForNavigation({
            waitUntil: "networkidle2",
            timeout: 30000,
        });

        const loginForm = await page.$('input[id="loginForm:userId"]');
        return loginForm === null;
    } catch (error) {
        console.error("[Portal] ログインエラー:", error);
        return false;
    }
}

/**
 * お知らせページに移動
 */
async function navigateToNoticesPage(page) {
    try {
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
            await page.waitForNavigation({
                waitUntil: "networkidle2",
                timeout: 15000,
            });
            return true;
        }

        return false;
    } catch (error) {
        console.error("[Portal] ナビゲーションエラー:", error);
        return false;
    }
}

/**
 * お知らせを取得
 */
async function fetchNoticesFromPage(page) {
    const notices = [];

    try {
        await page.waitForSelector("body", { timeout: 10000 });
        const bodyText = await page.evaluate(() => document.body.innerText);

        const lines = bodyText.split("\n");
        let id = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();
            const dateMatch = trimmedLine.match(/(\d{4}\/\d{2}\/\d{2})$/);
            if (!dateMatch) continue;

            const senderMatch = trimmedLine.match(/\[(.+?)\]/);
            if (!senderMatch) continue;

            const date = dateMatch[1];
            const sender = senderMatch[1];

            let title = trimmedLine
                .replace(/\[.+?\]/, "")
                .replace(/\d{4}\/\d{2}\/\d{2}$/, "")
                .trim();

            if (title.startsWith("フラグをつける") || title.startsWith("既読にする")) {
                continue;
            }

            if (!title || title.length < 5) continue;

            const isImportant = title.includes("重要") || title.includes("至急");

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
            });
        }

        // 重複を削除
        const uniqueNotices = notices.filter(
            (notice, index, self) =>
                index === self.findIndex((n) => n.title === notice.title)
        );

        return uniqueNotices;
    } catch (error) {
        console.error("[Portal] お知らせ取得エラー:", error);
    }

    return notices;
}

/**
 * メイン処理
 */
async function main() {
    const userId = process.env.NIT_PORTAL_USER_ID;
    const password = process.env.NIT_PORTAL_PASSWORD;

    if (!userId || !password) {
        console.error("[Portal] 認証情報が設定されていません");
        process.exit(1);
    }

    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(30000);

        console.log("[Portal] ログイン中...");
        const loginSuccess = await login(page, userId, password);

        if (!loginSuccess) {
            console.error("[Portal] ログインに失敗しました");
            process.exit(1);
        }

        console.log("[Portal] ログイン成功");

        const navigateSuccess = await navigateToNoticesPage(page);
        if (!navigateSuccess) {
            console.error("[Portal] お知らせページへの移動に失敗しました");
            process.exit(1);
        }

        console.log("[Portal] お知らせを取得中...");
        const notices = await fetchNoticesFromPage(page);

        // キャッシュディレクトリを作成
        const cacheDir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        // キャッシュファイルに保存
        const cacheData = {
            notices,
            timestamp: Date.now(),
        };

        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
        console.log(`[Portal] ${notices.length}件のお知らせを保存しました`);

    } catch (error) {
        console.error("[Portal] エラー:", error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main();
