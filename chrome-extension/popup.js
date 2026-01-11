/**
 * Synca Forms登録 ポップアップスクリプト
 */

const DEFAULT_API_URL = "https://synca-inky.vercel.app/api/forms";
let SYNCA_API_URL = DEFAULT_API_URL;

/**
 * 保存されたAPI URLを取得
 */
async function loadApiUrl() {
    const result = await chrome.storage.sync.get(["syncaApiUrl"]);
    SYNCA_API_URL = result.syncaApiUrl || DEFAULT_API_URL;
}

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

function isFormsUrl(url) {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return FORMS_URL_PATTERNS.some((pattern) => lowerUrl.includes(pattern));
}

function showMessage(text, isSuccess) {
    const messageEl = document.getElementById("message");
    messageEl.textContent = text;
    messageEl.className = `message ${isSuccess ? "success" : "error"}`;
}

async function registerForm(url, source) {
    try {
        const response = await fetch(SYNCA_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url, source }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showMessage("登録しました", true);
        } else if (response.status === 409) {
            showMessage("既に登録されています", false);
        } else {
            showMessage(result.error || "登録に失敗しました", false);
        }
    } catch (error) {
        showMessage("Syncaに接続できません (localhost:3001)", false);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // API URLを読み込み
    await loadApiUrl();

    const currentUrlEl = document.getElementById("currentUrl");
    const registerPageBtn = document.getElementById("registerPage");
    const urlInput = document.getElementById("urlInput");
    const registerUrlBtn = document.getElementById("registerUrl");

    // 現在のタブのURLを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab?.url || "";
    const currentTitle = tab?.title || "不明なページ";

    currentUrlEl.textContent = currentUrl;

    // 現在のページがFormsかどうかで登録ボタンの状態を変更
    if (isFormsUrl(currentUrl)) {
        registerPageBtn.disabled = false;
    } else {
        registerPageBtn.disabled = true;
        registerPageBtn.textContent = "Formsページではありません";
    }

    // 現在のページを登録
    registerPageBtn.addEventListener("click", async () => {
        if (!isFormsUrl(currentUrl)) return;
        registerPageBtn.disabled = true;
        registerPageBtn.textContent = "登録中...";
        await registerForm(currentUrl, currentTitle);
        registerPageBtn.textContent = "このページを登録";
        registerPageBtn.disabled = false;
    });

    // 入力されたURLを登録
    registerUrlBtn.addEventListener("click", async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showMessage("URLを入力してください", false);
            return;
        }
        if (!isFormsUrl(url)) {
            showMessage("FormsのURLではありません", false);
            return;
        }
        registerUrlBtn.disabled = true;
        registerUrlBtn.textContent = "登録中...";
        await registerForm(url, "手動入力");
        registerUrlBtn.textContent = "URLを登録";
        registerUrlBtn.disabled = false;
        urlInput.value = "";
    });
});
