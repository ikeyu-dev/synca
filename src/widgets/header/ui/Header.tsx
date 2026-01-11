"use client";

import Link from "next/link";
import { ThemeToggle } from "@/features/theme-toggle";

interface HeaderProps {
    showBackButton?: boolean;
    title?: string;
}

/**
 * モバイル向けヘッダーコンポーネント
 */
export default function Header({ showBackButton = false, title }: HeaderProps) {
    return (
        <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-50 lg:hidden">
            <div className="flex-1">
                {showBackButton ? (
                    <button
                        onClick={() => window.history.back()}
                        className="btn btn-ghost btn-circle"
                        aria-label="戻る"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                ) : (
                    <Link
                        href="/home"
                        className="btn btn-ghost text-xl font-bold text-primary"
                    >
                        Synca
                    </Link>
                )}
                {title && (
                    <span className="text-lg font-semibold ml-2">{title}</span>
                )}
            </div>
            <div className="flex-none gap-2">
                <ThemeToggle />
            </div>
        </header>
    );
}
