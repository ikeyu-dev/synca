import { TransitPageContent } from "./TransitPageContent";
import { fetchTrainStatus } from "@/features/transit";

export default async function TransitPage() {
    const statusResult = await fetchTrainStatus();
    const operations = statusResult.success ? statusResult.data || [] : [];

    return <TransitPageContent initialOperations={operations} />;
}
