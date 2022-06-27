import { HTMLProps, useRef, useState } from "react"
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
    const [ref, setRef] = useState<HTMLButtonElement | null>()
    const rect = ref?.getBoundingClientRect()
    return (
        <div className={`${className} d-flex`}>
            <button
                ref={setRef}
                onClick={() => setShow((show) => !show)}
                className="btn-sm btn-outline-secondary btn flex-grow-1 dropdown-toggle"
                type="button">
                {label}
            </button>
            {values.length > 0 && (
                <div
                    style={{ width: rect?.width, top: (rect?.top ?? 0) + (rect?.height ?? 0), bottom: "4rem" }}
                    className={`d-flex flex-column overflow-hidden position-absolute ${
                        show ? "" : "visually-hidden"
                    }`}>
                    <div className="overflow-hidden d-flex flex-column w-100 pt-2 bg-light rounded border">
                        <div className="btn-group w-100 px-2 mb-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={selectAll}>
                                Select All
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={unselectAll}>
                                Unselect All
                            </button>
                        </div>
                        <div className="d-flex flex-column scroll">
                            {values.map(([label, selected, value], i) => (
                                <div key={label} className="mx-3 mb-2">
                                    <EndLabel value={label}>
                                        <input
                                            onChange={(e) => onChange(value, e.target.checked, i)}
                                            type="checkbox"
                                            checked={selected}
                                        />
                                    </EndLabel>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
