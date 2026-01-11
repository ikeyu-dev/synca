import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NoticesPageContent } from "./NoticesPageContent";

export default async function NoticesPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

    return <NoticesPageContent />;
}
