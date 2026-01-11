import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardContent } from "./DashboardContent";

export const metadata = {
    title: "Dashboard | Synca",
    description: "ダッシュボード",
};

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

    return <DashboardContent accessToken={session.accessToken} />;
}
