"use client";

import { useState } from "react";
import type { Station, RailwayOperator } from "@/entities/station";

interface AddStationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (station: Station, label?: string) => void;
}

/**
 * 駅追加モーダル
 */
export function AddStationModal({ isOpen, onClose, onAdd }: AddStationModalProps) {
    const [name, setName] = useState("");
    const [line, setLine] = useState("");
    const [operator, setOperator] = useState<RailwayOperator>("JR");
    const [label, setLabel] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) return;

        const station: Station = {
            id: `custom-${name}-${Date.now()}`,
            name: name.trim(),
            operator,
            line: line.trim() || "不明",
        };

        onAdd(station, label.trim() || undefined);

        setName("");
        setLine("");
        setOperator("JR");
        setLabel("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <dialog
            className="modal modal-open"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">駅を追加</h3>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">駅名</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="例: 池袋"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">路線名</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="例: 山手線"
                            value={line}
                            onChange={(e) => setLine(e.target.value)}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">鉄道会社</span>
                        </label>
                        <select
                            className="select select-bordered"
                            value={operator}
                            onChange={(e) =>
                                setOperator(e.target.value as RailwayOperator)
                            }
                        >
                            <option value="JR">JR</option>
                            <option value="Tobu">東武鉄道</option>
                            <option value="Seibu">西武鉄道</option>
                            <option value="Metro">東京メトロ</option>
                            <option value="Other">その他</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">ラベル（任意）</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="例: バイト先"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                    </div>

                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn"
                            onClick={onClose}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!name.trim()}
                        >
                            追加
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
}
