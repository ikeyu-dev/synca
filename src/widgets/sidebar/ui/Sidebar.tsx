import { auth, signOut } from "@/auth";
import { SidebarNav } from "./SidebarNav";
import ThemeToggle from "@/features/theme-toggle/ui/ThemeToggle";

interface SidebarProps {
    children: React.ReactNode;
}

/**
 * サイドバー（Drawer）レイアウト
 */
export async function Sidebar({ children }: SidebarProps) {
    const session = await auth();

    return (
        <div className="drawer lg:drawer-open max-lg:hidden">
            <input
                id="drawer"
                type="checkbox"
                className="drawer-toggle"
            />
            <div className="drawer-content flex flex-col min-h-screen">
                {children}
            </div>
            <div className="drawer-side z-40">
                <label
                    htmlFor="drawer"
                    aria-label="サイドバーを閉じる"
                    className="drawer-overlay"
                />
                <div className="bg-base-100 min-h-full w-56 xl:w-64 2xl:w-80 flex flex-col">
                    {/* ロゴ */}
                    <div className="p-4 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                            Synca
                        </span>
                    </div>

                    {/* ナビゲーション */}
                    <SidebarNav />

                    {/* スペーサー */}
                    <div className="flex-1" />

                    {/* テーマトグル */}
                    <div className="p-2 border-t border-base-300">
                        <ThemeToggle showLabel />
                    </div>

                    {/* ユーザー情報 & ログアウト */}
                    {session?.user && (
                        <div className="p-4 border-t border-base-300 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="avatar placeholder">
                                    {session.user.image ? (
                                        <div className="rounded-full w-10">
                                            <img
                                                src={session.user.image}
                                                alt={session.user.name || "プロフィール画像"}
                                            />
                                        </div>
                                    ) : (
                                        <div className="bg-primary text-primary-content rounded-full w-10 flex items-center justify-center">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className="font-medium truncate"
                                        style={{
                                            fontSize: "clamp(0.75rem, 1.2vw, 0.875rem)",
                                        }}
                                    >
                                        {session.user.name}
                                    </p>
                                    <p
                                        className="text-base-content/60 truncate"
                                        style={{
                                            fontSize: "clamp(0.625rem, 1vw, 0.75rem)",
                                        }}
                                    >
                                        {session.user.email}
                                    </p>
                                </div>
                            </div>
                            <form
                                action={async () => {
                                    "use server";
                                    await signOut({ redirectTo: "/" });
                                }}
                            >
                                <button
                                    type="submit"
                                    className="btn btn-error btn-outline btn-sm w-full justify-start gap-2"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                        />
                                    </svg>
                                    ログアウト
                                </button>
                            </form>
                        </div>
                    )}

                    {/* バージョン情報 */}
                    <div className="p-2 text-xs text-base-content/50 text-center">
                        Synca v0.1.0
                    </div>
                </div>
            </div>
        </div>
    );
}
