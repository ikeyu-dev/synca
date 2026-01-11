/**
 * Synca Forms登録 Chrome拡張機能
 * 右クリックメニューからMicrosoft FormsのURLをSyncaに登録する
 */

const DEFAULT_API_URL = "https://synca-inky.vercel.app/api/forms";

/**
 * 保存されたAPI URLを取得
 */
async function getApiUrl() {
    const result = await chrome.storage.sync.get(["syncaApiUrl"]);
    return result.syncaApiUrl || DEFAULT_API_URL;
}

/**
 * FormsのURLパターン（部分一致で判定）
 */
const FORMS_URL_PATTERNS = [
    // Microsoft Forms
    "forms.office.com",
    "forms.microsoft.com",
    "forms.cloud.microsoft.com",
    "forms.cloud.microsoft/",
    "forms.osi.office.net",
    // Google Forms
    "docs.google.com/forms",
    "forms.gle/",
];

/**
 * URLがFormsかどうかを判定
 */
function isFormsUrl(url) {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return FORMS_URL_PATTERNS.some((pattern) => lowerUrl.includes(pattern));
}

/**
 * コンテキストメニューを作成
 */
chrome.runtime.onInstalled.addListener(() => {
    // リンク上での右クリックメニュー（すべてのリンク）
    chrome.contextMenus.create({
        id: "registerFormsLink",
        title: "Syncaに登録",
        contexts: ["link"],
    });

    // ページ上での右クリックメニュー（すべてのページ）
    chrome.contextMenus.create({
        id: "registerCurrentPage",
        title: "このFormsをSyncaに登録",
        contexts: ["page"],
    });
});

/**
 * 通知を表示
 */
function showNotification(title, message, isError = false) {
    console.log(`[Synca] ${title}: ${message}`);
}

/**
 * FormsをSyncaに登録
 */
async function registerForm(url, source) {
    try {
        const apiUrl = await getApiUrl();
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: url,
                source: source || "Chrome拡張機能",
            }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification("登録完了", "FormsをSyncaに登録しました");
            return { success: true, message: "FormsをSyncaに登録しました" };
        } else if (response.status === 409) {
            showNotification("重複", "このFormsは既に登録されています");
            return { success: false, message: "このFormsは既に登録されています" };
        } else {
            showNotification("エラー", result.error || "登録に失敗しました", true);
            return { success: false, message: result.error || "登録に失敗しました" };
        }
    } catch (error) {
        console.error("[Synca] 登録エラー:", error);
        const errorMessage =
            "Syncaに接続できません。localhost:3001で起動していることを確認してください。";
        showNotification("接続エラー", errorMessage, true);
        return { success: false, message: errorMessage };
    }
}

/**
 * コンテキストメニューのクリックハンドラー
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    let url = null;
    let source = null;

    if (info.menuItemId === "registerFormsLink") {
        url = info.linkUrl;
        source = `リンク (${tab?.title || "不明なページ"})`;
    } else if (info.menuItemId === "registerCurrentPage") {
        url = info.pageUrl || tab?.url;
        source = tab?.title || "Formsページ";
    }

    if (!url) {
        return;
    }

    // URLがFormsかどうかを検証
    if (!isFormsUrl(url)) {
        const result = {
            success: false,
            message: "FormsのURLではありません（Microsoft Forms / Google Forms）",
        };
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: "SYNCA_NOTIFICATION",
                ...result,
            }).catch(() => {});
        }
        return;
    }

    const result = await registerForm(url, source);

    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
            type: "SYNCA_NOTIFICATION",
            ...result,
        }).catch(() => {});
    }
});
