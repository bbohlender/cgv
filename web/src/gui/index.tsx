import {
    AbstractParsedOperation,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    serializeStepString,
    StepDescriptor,
} from "cgv"
import { HTMLProps } from "react"
import { UseBaseStore, useBaseStore } from "../global"
import { CheckIcon } from "../icons/check"
import { DeleteIcon } from "../icons/delete"
import { GUINounStep } from "./noun"
import { GUIOperation } from "./operation"
import { GUIRandomStep } from "./random"
import { GUIRawStep } from "./raw"
import { GUISwitchStep } from "./switch"
import { GUISymbolStep } from "./symbol"

export type OperationGUIMap = {
    [name in string]?: (props: { value: AbstractParsedOperation<HierarchicalInfo> }) => JSX.Element | null
}

export function getLabel(descriptor: StepDescriptor | { type: "symbol" }) {
    if (descriptor.type === "operation") {
        return descriptor.identifier
    }
    return descriptor.type
}

function requestAdd(store: UseBaseStore, type: "parallel" | "before" | "after") {
    store.getState().request("create-step", (step) => store.getState().add(type, step))
}

function requestReplace(store: UseBaseStore, at: HierarchicalParsedSteps) {
    store.getState().request("create-step", (step) => store.getState().replace(at, step))
}

export function GUI({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const selected = store((state) => (state.type === "gui" && state.requested == null ? state.selected : undefined))
    if (selected == null) {
        return null
    }
    return (
        <div {...rest} className={`${className} d-flex flex-column px-0 pt-2 overflow-hidden`}>
            <div className="d-flex flex-column">
                <h3 className="p-0 mx-3 mb-3">
                    {typeof selected === "string"
                        ? selected
                        : selected.type === "symbol"
                        ? "symbol"
                        : getLabel(selected)}
                </h3>
                <div className="btn-group mx-3 mb-2 d-flex">
                    <button
                        onClick={requestAdd.bind(null, store, "before")}
                        className="btn btn-sm btn-outline-success flex-grow-1 flex-basis-0">
                        + Before
                    </button>
                    <button
                        onClick={requestAdd.bind(null, store, "parallel")}
                        className="btn btn-sm btn-outline-success flex-grow-1 flex-basis-0">
                        + Parllel
                    </button>
                    <button
                        onClick={requestAdd.bind(null, store, "after")}
                        className="btn btn-sm btn-outline-success flex-grow-1 flex-basis-0">
                        + After
                    </button>
                </div>
                <div className="btn-group mx-3 mb-3 d-flex">
                    <button
                        onClick={store.getState().select.bind(null, undefined)}
                        className="d-flex align-items-center justify-content-center btn btn-sm btn-outline-primary flex-grow-1 flex-basis-0">
                        <CheckIcon />
                    </button>
                    {typeof selected !== "string" && (
                        <button
                            onClick={requestReplace.bind(null, store, selected)}
                            className="btn btn-sm btn-outline-secondary flex-grow-1 flex-basis-0">
                            Replace
                        </button>
                    )}
                    <button
                        onClick={store.getState().remove.bind(null, undefined)}
                        className="d-flex align-items-center justify-content-center btn btn-sm btn-outline-danger flex-grow-1 flex-basis-0">
                        <DeleteIcon />
                    </button>
                </div>
                <GUISteps value={selected} />
            </div>
        </div>
    )
}

function GUISteps({ value }: { value: HierarchicalParsedSteps | string }): JSX.Element | null {
    if (typeof value === "string") {
        return <GUINounStep value={value} />
    }
    switch (value.type) {
        case "raw":
            return <GUIRawStep value={value} />
        case "symbol":
            return <GUISymbolStep value={value} />
        case "operation":
            return <GUIOperation value={value} />
        case "random":
            return <GUIRandomStep value={value} />
        case "switch":
            return <GUISwitchStep value={value} />
        default:
            return <GUIDefaultStep value={value} />
    }
}

function GUIDefaultStep({ value }: { value: HierarchicalParsedSteps }) {
    const store = useBaseStore()
    if (value.children == null) {
        return null
    }
    return (
        <div className="d-flex flex-column mx-3 mb-3">
            {value.children.map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center border-bottom">
                    <div className="flex-grow-1 p-3 pointer" onClick={store.getState().select.bind(null, child)}>
                        {serializeStepString(child)}
                    </div>
                    <div
                        onClick={() => store.getState().remove(child)}
                        className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </div>
            ))}
        </div>
    )
}
