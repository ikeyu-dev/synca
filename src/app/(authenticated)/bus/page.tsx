import { BusScheduleCard, fetchBusSchedule } from "@/features/bus";
import { ErrorMessage } from "@/shared/ui";

export default async function BusPage() {
    const result = await fetchBusSchedule();

    if (!result.success || !result.data) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">バス時刻表</h1>
                <ErrorMessage message={result.error || "時刻表の取得に失敗しました"} />
            </div>
        );
    }

    const { data } = result;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">バス時刻表</h1>
                {data.scheduleType && (
                    <span className="badge badge-primary">{data.scheduleType}</span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BusScheduleCard
                    schedule={data.tobu}
                    type="tobu"
                />
                <BusScheduleCard
                    schedule={data.jr}
                    type="jr"
                />
            </div>

            {(data.tobu.notices?.length || data.jr.notices?.length) && (
                <div className="alert alert-info">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="stroke-current shrink-0 w-6 h-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                    </svg>
                    <div>
                        {data.tobu.notices?.map((notice, i) => (
                            <p key={`tobu-${i}`}>{notice}</p>
                        ))}
                        {data.jr.notices?.map((notice, i) => (
                            <p key={`jr-${i}`}>{notice}</p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
