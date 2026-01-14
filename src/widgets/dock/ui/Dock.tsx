"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * モバイル向け底部ドックナビゲーション
 */
export function Dock() {
    const pathname = usePathname();

    return (
        <div
            className="dock dock-md fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-base-100 border-t border-base-300 pt-9"
            style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
            }}
        >
            <Link
                href="/home"
                className={`transition-transform ${
                    pathname === "/home" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M304 70.1C313.1 61.9 326.9 61.9 336 70.1L568 278.1C577.9 286.9 578.7 302.1 569.8 312C560.9 321.9 545.8 322.7 535.9 313.8L527.9 306.6L527.9 511.9C527.9 547.2 499.2 575.9 463.9 575.9L175.9 575.9C140.6 575.9 111.9 547.2 111.9 511.9L111.9 306.6L103.9 313.8C94 322.6 78.9 321.8 70 312C61.1 302.2 62 287 71.8 278.1L304 70.1zM320 120.2L160 263.7L160 512C160 520.8 167.2 528 176 528L224 528L224 424C224 384.2 256.2 352 296 352L344 352C383.8 352 416 384.2 416 424L416 528L464 528C472.8 528 480 520.8 480 512L480 263.7L320 120.3zM272 528L368 528L368 424C368 410.7 357.3 400 344 400L296 400C282.7 400 272 410.7 272 424L272 528z" />
                </svg>
            </Link>

            <Link
                href="/calendar"
                className={`transition-transform ${
                    pathname === "/calendar" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M216 64C229.3 64 240 74.7 240 88L240 128L400 128L400 88C400 74.7 410.7 64 424 64C437.3 64 448 74.7 448 88L448 128L480 128C515.3 128 544 156.7 544 192L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 192C96 156.7 124.7 128 160 128L192 128L192 88C192 74.7 202.7 64 216 64zM216 176L160 176C151.2 176 144 183.2 144 192L144 240L496 240L496 192C496 183.2 488.8 176 480 176L216 176zM144 288L144 480C144 488.8 151.2 496 160 496L480 496C488.8 496 496 488.8 496 480L496 288L144 288z" />
                </svg>
            </Link>

            <Link
                href="/tasks"
                className={`transition-transform ${
                    pathname === "/tasks" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M192 128C174.3 128 160 142.3 160 160L160 480C160 497.7 174.3 512 192 512L448 512C465.7 512 480 497.7 480 480L480 160C480 142.3 465.7 128 448 128L192 128zM112 160C112 115.8 147.8 80 192 80L448 80C492.2 80 528 115.8 528 160L528 480C528 524.2 492.2 560 448 560L192 560C147.8 560 112 524.2 112 480L112 160zM395.3 269.3L304 360.6L244.7 301.3C235.3 291.9 220.1 291.9 210.7 301.3C201.3 310.7 201.3 325.9 210.7 335.3L287 411.6C296.4 421 311.6 421 321 411.6L429.3 303.3C438.7 293.9 438.7 278.7 429.3 269.3C419.9 259.9 404.7 259.9 395.3 269.3z" />
                </svg>
            </Link>

            <Link
                href="/transit"
                className={`transition-transform ${
                    pathname === "/transit" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M96 0C43 0 0 43 0 96L0 352c0 48 35.2 87.7 81.1 94.9l-46 46C28.1 499.9 33.1 512 43 512l39 0c8.5 0 16.6-3.4 22.6-9.4L160 448l128 0 55.4 54.6c6 6 14.1 9.4 22.6 9.4l39 0c10 0 14.9-12.1 7.9-19.1l-46-46c46-7.1 81.1-46.9 81.1-94.9L448 96c0-53-43-96-96-96L96 0zM64 128c0-17.7 14.3-32 32-32l256 0c17.7 0 32 14.3 32 32l0 128c0 17.7-14.3 32-32 32L96 288c-17.7 0-32-14.3-32-32L64 128zM96 352a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm288 32a32 32 0 1 1 -64 0 32 32 0 1 1 64 0z" />
                </svg>
            </Link>

            <Link
                href="/bus"
                className={`transition-transform ${
                    pathname === "/bus" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 576 512"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M288 0C422.4 0 512 35.2 512 80L512 96l0 32c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32l0 160c0 17.7-14.3 32-32 32l0 32c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-32-192 0 0 32c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-32c-17.7 0-32-14.3-32-32l0-160c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l0-32 0-16C64 35.2 153.6 0 288 0zM128 160l0 96c0 17.7 14.3 32 32 32l112 0 0-160-112 0c-17.7 0-32 14.3-32 32zm192-32l0 160 112 0c17.7 0 32-14.3 32-32l0-96c0-17.7-14.3-32-32-32l-112 0zM112 352a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm352 32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
                </svg>
            </Link>

            <Link
                href="/forms"
                className={`transition-transform ${
                    pathname === "/forms" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 384 512"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z" />
                </svg>
            </Link>

            <Link
                href="/notices"
                className={`transition-transform ${
                    pathname === "/notices" ? "text-primary scale-110" : ""
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                        minHeight: "28px",
                    }}
                    fill="currentColor"
                >
                    <path d="M224 0c-17.7 0-32 14.3-32 32l0 19.2C119 66 64 130.6 64 208l0 18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416l384 0c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8l0-18.8c0-77.4-55-142-128-156.8L256 32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3l-136 0c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z" />
                </svg>
            </Link>
        </div>
    );
}
