import { ParsedRaw, ParsedSteps } from "cgv"
import { HTMLProps, useEffect, useState } from "react"
import { useStore } from "../pages/editor"

export function GUI({ className, style, ...rest }: HTMLProps<HTMLDivElement>) {
    const selected = useStore(({ selected }) => selected)
    const unselect = useStore(({ unselect }) => unselect)
    if (selected == null) {
        return null
    }
    const { steps, onChange } = selected
    return (
        <div
            {...rest}
            className={`${className} w-100 d-flex flex-column m-3 px-0 py-3 bg-light position-absolute border shadow`}
            style={{ ...style, maxWidth: "16rem" }}>
            <div className="d-flex flex-column">
                <h3 className="p-0 mx-3 mb-3">{capitalize(steps.type)}</h3>
                <div className="d-flex flex-row space-between justify-content-between mx-3">
                    <button onClick={unselect} className="btn btn-sm btn-outline-primary">
                        Done
                    </button>
                    <div className="mb-3">
                        <GUISteps
                            value={steps}
                            onChange={() => {
                                onChange()
                                useStore.getState().reinterprete()
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function capitalize(type: string): string {
    return `${type.charAt(0).toUpperCase()}${type.substring(1)}`
}

function GUISteps({ value, onChange }: { value: ParsedSteps; onChange: () => void }): JSX.Element | null {
    switch (value.type) {
        case "raw":
            return GUIRawStep({
                value,
                onChange,
            })
        default:
            return null
    }
}

function GUIRawStep({ value, onChange }: { value: ParsedRaw; onChange: () => void }): JSX.Element {
    const [raw, setRaw] = useState(value.value)
    useEffect(() => void setRaw(value.value), [value.value])
    return (
        <input
            value={raw}
            onChange={(e) => {
                const integer = parseInt(e.target.value)
                if (!isNaN(integer)) {
                    value.value = integer
                } else if (e.target.value === "true" || e.target.value === "false") {
                    value.value = e.target.value === "true"
                } else {
                    value.value = e.target.value
                }
                setRaw(value.value)
                onChange()
            }}
        />
    )
}
