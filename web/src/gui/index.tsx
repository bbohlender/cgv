import {
    AbstractParsedOperation,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    SelectionsList,
    serializeStepString,
} from "cgv"
import { HTMLProps } from "react"
import { UseBaseStore, useBaseStore } from "../global"
import { CheckIcon } from "../icons/check"
import { DeleteIcon } from "../icons/delete"
import { MultiSelect } from "./multi-select"
import { GUINounStep } from "./noun"
import { GUIOperation } from "./operation"
import { GUIRandomStep } from "./random"
import { GUIRawStep } from "./raw"
import { GUISwitchStep } from "./switch"
import { GUISymbolStep } from "./symbol"

export type OperationGUIMap = {
    [name in string]?: (props: { value: AbstractParsedOperation<HierarchicalInfo> }) => JSX.Element | null
}

export function getSelectionTitle(selections: Array<SelectionsList[number] & { selected: Array<Array<number>> }>) {
    if (selections.length === 1) {
        const steps = selections[0].steps
        return steps.type === "operation" ? steps.identifier : steps.type
    }
    return `${selections.length} steps selected`
}

function requestAdd(store: UseBaseStore, type: "parallel" | "before" | "after") {
    store.getState().request("create-step", (stepGenerator) => store.getState().insert(type, stepGenerator))
}

function requestReplace(store: UseBaseStore) {
    store.getState().request("create-step", (stepGenerator) => store.getState().replace(stepGenerator))
}

export function GUI({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const selectionsList = store((state) =>
        state.type === "gui" && state.requested == null ? state.selectionsList : undefined
    )
    if (selectionsList == null || selectionsList.length === 0) {
        return null
    }
    return (
        <div {...rest} className={`${className} d-flex flex-column px-0 pt-2`}>
            <div className="d-flex flex-column">
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
                        onClick={() => {
                            store.getState().unselectAll()
                        }}
                        className="d-flex align-items-center justify-content-center btn btn-sm btn-outline-primary flex-grow-1 flex-basis-0">
                        <CheckIcon />
                    </button>
                    <button
                        onClick={requestReplace.bind(null, store)}
                        className="btn btn-sm btn-outline-secondary flex-grow-1 flex-basis-0">
                        Replace
                    </button>
                    <button
                        onClick={store.getState().removeStep.bind(null, undefined)}
                        className="d-flex align-items-center justify-content-center btn btn-sm btn-outline-danger flex-grow-1 flex-basis-0">
                        <DeleteIcon />
                    </button>
                </div>
                {selectionsList.map((selections) => (
                    <GUISelection selections={selections} />
                ))}
            </div>
        </div>
    )
}

function GUISelection({ selections }: { selections: SelectionsList[number] }) {
    const store = useBaseStore()
    const path = selections.steps.path.join(",")
    const all = store((state) => (state.type === "gui" ? state.indicesMap[path] : undefined))

    return (
        <div className="d-flex flex-column">
            <label className="mb-3 mx-3">
                {selections.steps.type === "operation" ? selections.steps.identifier : selections.steps.type}
            </label>
            {all != null && (
                <MultiSelect<string>
                    selectAll={() => store.getState().select(selections.steps, undefined, "add")}
                    unselectAll={() => store.getState().select(selections.steps, undefined, "remove")}
                    className="mb-3 mx-3"
                    label={`${selections.indices.length} selected`}
                    onChange={(index, selected) => {
                        store.getState().select(selections.steps, index, selected ? "add" : "remove")
                    }}
                    values={getValues(selections, all)}
                />
            )}
            <GUISteps value={selections.steps} />
        </div>
    )
}

function getValues(
    selection: SelectionsList[number],
    all: Array<string>
): Array<[label: string, selected: boolean, value: string]> {
    return all.map((index) => [index, selection.indices.includes(index), index])
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
                    <div
                        className="flex-grow-1 p-3 pointer"
                        onClick={(e) => store.getState().select(child)}>
                        {serializeStepString(child)}
                    </div>
                </div>
            ))}
        </div>
    )
}
