interface LoadingProps {
    size?: "sm" | "md" | "lg";
    text?: string;
}

/**
 * ローディングスピナーコンポーネント
 */
export function Loading({ size = "md", text }: LoadingProps) {
    const sizeClass = {
        sm: "loading-sm",
        md: "loading-md",
        lg: "loading-lg",
    }[size];

    return (
        <div className="flex flex-col items-center justify-center gap-2 p-4">
            <span className={`loading loading-spinner ${sizeClass} text-primary`} />
            {text && <span className="text-base-content/60 text-sm">{text}</span>}
        </div>
    );
}
