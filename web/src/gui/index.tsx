import {
    AbstractParsedOperation,
    FullIndex,
    getIndirectParentsSteps,
    getPredecessorSelections,
    getSelectedStepsJoinedPath,
    getSuccessorSelections,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    SelectedSteps,
    SelectionsList,
    getSelectedLabel,
} from "cgv"
import { HTMLProps, useMemo } from "react"
import { useBaseGlobal, UseBaseStore, useBaseStore } from "../global"
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

export function childrenSelectable(operationGuiMap: OperationGUIMap, steps: SelectedSteps): boolean {
    return typeof steps == "string" || steps.type !== "operation" || operationGuiMap[steps.identifier] == null
}

function requestAdd(store: UseBaseStore, type: "parallel" | "before" | "after") {
    store.getState().request("create-step", (stepGenerator) => store.getState().insert(type, stepGenerator))
}

function requestReplace(store: UseBaseStore) {
    store.getState().request("create-step", (stepGenerator) => store.getState().replace(stepGenerator))
}

function requestSetName(store: UseBaseStore, descriptionName: string) {
    store.getState().request("set-name", (name) => store.getState().setName(name, descriptionName))
}

export function GUI({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const descriptionName = store((state) => state.selectedDescription)
    const selectionsList = store((state) =>
        state.type === "gui" && state.requested == null ? state.selectionsList : undefined
    )
    if (selectionsList == null || selectionsList.length === 0 || descriptionName == null) {
        return null
    }
    return (
        <div {...rest} className={`${className} d-flex flex-column px-0 pt-3`}>
            <div className="d-flex flex-column">
                <div className="btn-group mx-3 mb-1 d-flex">
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

                <div className="btn-group mx-3 mb-1 d-flex">
                    <button
                        onClick={requestReplace.bind(null, store)}
                        className="btn btn-sm btn-outline-secondary flex-grow-1 flex-basis-0">
                        Replace
                    </button>
                    <button
                        onClick={requestSetName.bind(null, store, descriptionName)}
                        className="btn btn-sm btn-outline-secondary flex-grow-1 flex-basis-0">
                        Set-Name
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
                        onClick={store.getState().removeStep.bind(null, undefined)}
                        className="d-flex align-items-center justify-content-center btn btn-sm btn-outline-danger flex-grow-1 flex-basis-0">
                        <DeleteIcon />
                    </button>
                </div>
                {selectionsList.map((selections) => (
                    <GUISelection
                        descriptionName={descriptionName}
                        key={getSelectedStepsJoinedPath(selections.steps)}
                        selections={selections}
                    />
                ))}
            </div>
        </div>
    )
}

function GUISelection({
    selections,
    descriptionName,
}: {
    descriptionName: string
    selections: SelectionsList[number]
}) {
    const store = useBaseStore()
    const path = getSelectedStepsJoinedPath(selections.steps)
    const indicesMap = store((state) => (state.type === "gui" ? state.indicesMap : undefined))
    const all = useMemo(() => (indicesMap != null ? indicesMap[path] : undefined), [indicesMap])

    return (
        <div className="d-flex flex-column">
            <label className="mb-3 mx-3">{getSelectedLabel(selections.steps, descriptionName)}</label>
            <GUISteps descriptionName={descriptionName} value={selections.steps} indices={selections.indices} />
            {all != null && (
                <MultiSelect<FullIndex>
                    selectAll={() => store.getState().select(selections.steps, undefined, "add")}
                    unselectAll={() => store.getState().select(selections.steps, undefined, "remove")}
                    className="mb-3 mx-3"
                    label={`${selections.indices.length}/${all.length} selected`}
                    onChange={(index, selected) => {
                        store.getState().select(selections.steps, index, selected ? "add" : "remove")
                    }}
                    values={getValues(selections, all)}
                />
            )}
        </div>
    )
}

function getValues(
    selection: SelectionsList[number],
    all: Array<FullIndex>
): Array<[label: string, selected: boolean, value: FullIndex]> {
    return all.map((index) => [
        `${index.before} -> ${index.after}`,
        selection.indices.find((selectedIndex) => selectedIndex.after === index.after) != null,
        index,
    ])
}

function GUISteps({
    value,
    indices,
    descriptionName,
}: {
    descriptionName: string
    value: HierarchicalParsedSteps | string
    indices: Array<FullIndex>
}): JSX.Element | null {
    if (typeof value === "string") {
        return <GUINounStep descriptionName={descriptionName} value={value} />
    }
    switch (value.type) {
        case "raw":
            return <GUIRawStep value={value} />
        case "symbol":
            return <GUISymbolStep value={value} />
        case "operation":
            return <GUIOperation value={value} indices={indices} />
        case "random":
            return <GUIRandomStep value={value} indices={indices} />
        case "switch":
            return <GUISwitchStep value={value} indices={indices} />
        default:
            return null
    }
}
