import {
    AbstractParsedOperation,
    getLabel,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    replaceStep,
    ParsedRaw,
    ParsedSteps,
} from "cgv"
import { HTMLProps, useEffect, useState } from "react"
import { useStore } from "../pages/editor"

export const operationGuiMap: {
    [name in string]?: (props: { value: AbstractParsedOperation<HierarchicalInfo> }) => JSX.Element
} = {
    color: GUIColorStep,
}

export function GUI({ className, style, ...rest }: HTMLProps<HTMLDivElement>) {
    const selected = useStore(({ selected }) => selected)
    if (selected == null) {
        return null
    }
    return (
        <div
            {...rest}
            className={`${className} w-100 d-flex flex-column m-3 px-0 pt-2 bg-light position-absolute rounded border overflow-hidden shadow`}
            style={{ ...style, maxWidth: "16rem" }}>
            <div className="d-flex flex-column">
                <h3 className="p-0 mx-3 mb-3">{typeof selected === "string" ? selected : getLabel(selected)}</h3>
                <div className="btn-group mx-3 mb-2 d-flex">
                    <button
                        onClick={useStore.getState().stepDescriptorDialog.bind(null, "before")}
                        className="btn btn-sm btn-outline-success flex-grow-1 flex-basis-0">
                        + Before
                    </button>
                    <button
                        onClick={useStore.getState().stepDescriptorDialog.bind(null, "parallel")}
                        className="btn btn-sm btn-outline-success flex-grow-1 flex-basis-0">
                        + Parllel
                    </button>
                    <button
                        onClick={useStore.getState().stepDescriptorDialog.bind(null, "after")}
                        className="btn btn-sm btn-outline-success flex-grow-1 flex-basis-0">
                        + After
                    </button>
                </div>
                <div className="btn-group mx-3 mb-3 d-flex">
                    <button
                        onClick={useStore.getState().select.bind(null, undefined)}
                        className="btn btn-sm btn-outline-primary flex-grow-1 flex-basis-0">
                        Done
                    </button>
                    {typeof selected !== "string" && (
                        <button
                            onClick={useStore.getState().stepDescriptorDialog.bind(null, "replace")}
                            className="btn btn-sm btn-outline-secondary flex-grow-1 flex-basis-0">
                            Replace
                        </button>
                    )}
                    <button
                        onClick={useStore.getState().remove}
                        className="btn btn-sm btn-outline-danger flex-grow-1 flex-basis-0">
                        Remove
                    </button>
                </div>
                <GUISteps value={selected} />
            </div>
        </div>
    )
}

function GUISteps({ value }: { value: HierarchicalParsedSteps | string }): JSX.Element | null {
    if (typeof value === "string") {
        return GUINounStep({ value })
    }
    switch (value.type) {
        case "raw":
            return GUIRawStep({
                value,
            })
        case "operation": {
            const OperationGUI = operationGuiMap[value.identifier]
            if (OperationGUI == null) {
                return null
            }
            return OperationGUI({ value })
        }
        default:
            return null
    }
}

function GUINounStep({ value }: { value: string }) {
    const [name, setName] = useState(value)
    useEffect(() => void setName(value), [value])
    return (
        <input
            value={name}
            className="mx-3 mb-3 w-auto form-control"
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => useStore.getState().rename(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
    )
}

function GUIRawStep({ value }: { value: ParsedRaw }): JSX.Element {
    const [raw, setRaw] = useState(value.value)
    useEffect(() => setRaw(value.value), [value.value])
    return (
        <input
            value={raw}
            className="mx-3 mb-3 w-auto form-control"
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => {
                const integer = parseInt(e.target.value)
                if (!isNaN(integer)) {
                    value.value = integer
                } else if (e.target.value === "true" || e.target.value === "false") {
                    value.value = e.target.value === "true"
                } else {
                    value.value = e.target.value
                }
                useStore.getState().invalidate()
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
    )
}

function GUIOperationStep() {}

function GUIRandomStep() {}

function GUISwitchStep() {}

function getValue(parsed: ParsedSteps): any {
    if (parsed.type === "raw") {
        return parsed.value
    }
    return undefined
}

function GUIColorStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    return (
        <input
            value={getValue(value.children[0]) ?? 0xff0000}
            type="color"
            className="mx-3 mb-3 w-auto form-control"
            onChange={(e) => {
                replaceStep(
                    value.children[0],
                    {
                        type: "raw",
                        value: e.target.value,
                    },
                    useStore.getState().grammar
                )
                useStore.getState().invalidate()
            }}
        />
    )
}
