/**
 * Synca Forms登録 コンテンツスクリプト
 * 登録結果の通知をページ上に表示する
 */

/**
 * 通知トーストを表示
 */
function showToast(message, isSuccess = true) {
    // 既存のトーストを削除
    const existingToast = document.getElementById("synca-toast");
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = "synca-toast";
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: white;
        background-color: ${isSuccess ? "#22c55e" : "#ef4444"};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
        animation: synca-slide-in 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    const icon = isSuccess ? "✓" : "✕";
    toast.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${message}</span>`;

    // アニメーション用のスタイルを追加
    const style = document.createElement("style");
    style.textContent = `
        @keyframes synca-slide-in {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        @keyframes synca-fade-out {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // 3秒後にフェードアウト
    setTimeout(() => {
        toast.style.animation = "synca-fade-out 0.3s ease-out forwards";
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 300);
    }, 3000);
}

/**
 * バックグラウンドスクリプトからのメッセージを受信
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SYNCA_NOTIFICATION") {
        showToast(message.message, message.success);
    }
    return true;
});
