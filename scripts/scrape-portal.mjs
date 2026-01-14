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
 * モーダルから本文を抽出
 */
async function extractContentFromModal(page) {
    try {
        const content = await page.evaluate(() => {
            // 要素からテキストを抽出（改行を保持）
            function getTextWithBreaks(el) {
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

            let modalElement = null;
            for (const selector of modalSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
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

            // モーダル全体のテキストから本文部分を抽出
            const modalText = modalElement instanceof HTMLElement
                ? modalElement.innerText
                : modalElement.textContent || "";
            const lines = modalText.split("\n");
            const contentLines = [];
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
                    contentLines.push(trimmed);
                }
            }

            if (contentLines.length > 0) {
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
                const textLines = allText.split("\n");
                if (textLines.length > 4) {
                    return textLines.slice(2, -2).join("\n").trim();
                }
            }

            return null;
        });

        return content;
    } catch (error) {
        console.error("[Portal] モーダル本文抽出エラー:", error);
        return null;
    }
}

/**
 * モーダルを閉じる
 */
async function closeModal(page) {
    try {
        await page.evaluate(() => {
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
                const closeBtn = document.querySelector(selector);
                if (closeBtn) {
                    closeBtn.click();
                    return;
                }
            }

            const buttons = document.querySelectorAll("button, a, span");
            for (const btn of buttons) {
                const text = btn.textContent?.trim() || "";
                if (text === "閉じる" || text === "OK" || text === "Close") {
                    btn.click();
                    return;
                }
            }

            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
        console.error("[Portal] モーダルを閉じるエラー:", error);
    }
}

/**
 * お知らせの詳細を取得
 */
async function fetchNoticeDetail(page, noticeTitle) {
    try {
        const clicked = await page.evaluate((title) => {
            const searchText = title.substring(0, 20);

            const links = Array.from(document.querySelectorAll("a"));
            for (const link of links) {
                const text = link.textContent?.trim() || "";
                if (text.includes(searchText)) {
                    link.click();
                    return true;
                }
            }

            const rows = document.querySelectorAll("tr");
            for (const row of rows) {
                if (row.textContent?.includes(searchText)) {
                    const clickable = row.querySelector("a, button, [onclick]");
                    if (clickable) {
                        clickable.click();
                        return true;
                    }
                    row.click();
                    return true;
                }
            }

            return false;
        }, noticeTitle);

        if (!clicked) {
            console.log(`[Portal] クリック対象が見つかりません: ${noticeTitle.substring(0, 30)}...`);
            return null;
        }

        // モーダルが表示されるのを待つ
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 本文を抽出
        const content = await extractContentFromModal(page);

        // モーダルを閉じる
        await closeModal(page);

        // 少し待機
        await new Promise((resolve) => setTimeout(resolve, 500));

        return content;
    } catch (error) {
        console.error("[Portal] 詳細取得エラー:", error);
        return null;
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
                sender,
                isRead: true,
                isImportant,
            });
        }

        // 重複を削除
        const uniqueNotices = notices.filter(
            (notice, index, self) =>
                index === self.findIndex((n) => n.title === notice.title)
        );

        // 各お知らせの詳細を取得
        console.log(`[Portal] ${uniqueNotices.length}件のお知らせの詳細を取得中...`);
        for (const notice of uniqueNotices) {
            console.log(`[Portal] 詳細取得: ${notice.title.substring(0, 30)}...`);
            const content = await fetchNoticeDetail(page, notice.title);
            if (content) {
                notice.content = content;
                console.log(`[Portal] 本文取得成功 (${content.length}文字)`);
            } else {
                console.log(`[Portal] 本文取得失敗`);
            }
            // レート制限のため待機
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

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

        const noticesWithContent = notices.filter(n => n.content).length;
        console.log(`[Portal] ${notices.length}件のお知らせを保存しました（詳細: ${noticesWithContent}件）`);

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
