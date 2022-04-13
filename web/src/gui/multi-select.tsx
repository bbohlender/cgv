import { HTMLProps, useState } from "react"
import { EndLabel, StartLabel } from "./label"

export function MultiSelect<T>({
    label,
    className,
    values,
    onChange,
    selectAll,
    unselectAll,
}: {
    label: string
    values: Array<[label: string, selected: boolean, value: T]>
    onChange: (value: T, selected: boolean, index: number) => void
    selectAll: () => void
    unselectAll: () => void
} & Omit<HTMLProps<HTMLDivElement>, "onChange">) {
    const [show, setShow] = useState(false)
    return (
        <div className={`${className} dropdown d-flex`}>
            <button
                onClick={() => setShow((show) => !show)}
                className="btn-sm btn-outline-secondary btn flex-grow-1 dropdown-toggle"
                type="button">
                {label}
            </button>
            {values.length > 0 && (
                <ul className={`dropdown-menu w-100 mt-4 ${show ? "show" : ""}`}>
                    <div className="btn-group w-100 px-3 mb-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={selectAll}>
                            Select All
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={unselectAll}>
                            Unselect All
                        </button>
                    </div>
                    {values.map(([label, selected, value], i) => (
                        <li className="mx-3 mb-2">
                            <EndLabel value={label}>
                                <input
                                    onChange={(e) => onChange(value, e.target.checked, i)}
                                    type="checkbox"
                                    checked={selected}
                                />
                            </EndLabel>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
