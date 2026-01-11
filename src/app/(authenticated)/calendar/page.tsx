import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CalendarPageContent } from "./CalendarPageContent";

export const metadata = {
    title: "カレンダー | Synca",
    description: "Googleカレンダーの予定",
};

export default async function CalendarPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

    return <CalendarPageContent accessToken={session.accessToken} />;
}
