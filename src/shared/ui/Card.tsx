import { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
    icon?: ReactNode;
    color?: string;
}

/**
 * 共通のカードコンポーネント
 */
export function Card({ children, className = "", title, icon, color }: CardProps) {
    return (
        <div className={`card bg-base-100 shadow-sm ${className}`}>
            <div className="card-body">
                {(title || icon) && (
                    <div className="flex items-center gap-3 mb-4">
                        {icon && (
                            <div className={`p-2 rounded-lg ${color || "bg-primary/10"}`}>
                                {icon}
                            </div>
                        )}
                        {title && <h3 className="font-bold text-lg">{title}</h3>}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}
