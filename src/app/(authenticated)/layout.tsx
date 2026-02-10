import { Header } from "@/widgets/header";
import { Sidebar } from "@/widgets/sidebar";
import { Dock } from "@/widgets/dock";

export default function AuthenticatedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {/* デスクトップ: サイドバー付きレイアウト */}
            <Sidebar>
                <main className="flex-1 p-6 bg-base-100">{children}</main>
            </Sidebar>

            {/* モバイル: ヘッダー + コンテンツ + ドック */}
            <div className="min-h-screen bg-base-100 lg:hidden pb-20">
                <Header />
                <main className="container mx-auto px-4 py-6">{children}</main>
                <Dock />
            </div>
        </>
    );
}
