import {
    AbstractParsedOperation,
    getSelectedStepsJoinedPath,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    SelectedSteps,
    SelectionsList,
    getSelectedLabel,
    FullValue,
    getIndexRelation,
    HierarchicalRelation,
} from "cgv"
import { HTMLProps, useMemo } from "react"
import { UseBaseStore, useBaseStore } from "../global"
import { CheckIcon } from "../icons/check"
import { DeleteIcon } from "../icons/delete"
import { GUIIfStep } from "./if"
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
            <div className="d-flex flex-column overflow-hidden">
                <div
                    style={{
                        whiteSpace: "pre",
                    }}
                    className="btn-group mx-3 mb-1 d-flex">
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

                <div
                    style={{
                        whiteSpace: "pre",
                    }}
                    className="btn-group mx-3 mb-1 d-flex">
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
                <div
                    style={{
                        whiteSpace: "pre",
                    }}
                    className="btn-group mx-3 mb-3 d-flex">
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
                <div className="scroll">
                    {selectionsList.map((selections) => (
                        <GUISelection
                            descriptionName={descriptionName}
                            key={getSelectedStepsJoinedPath(selections.steps)}
                            selections={selections}
                        />
                    ))}
                </div>
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
    const indicesMap = store((state) => (state.type === "gui" ? state.valueMap : undefined))
    const all = useMemo(() => (indicesMap != null ? indicesMap[path] : undefined), [indicesMap])

    return (
        <div className="d-flex flex-column">
            <label className="mb-3 mx-3">{getSelectedLabel(selections.steps, descriptionName)}</label>
            <GUISteps descriptionName={descriptionName} step={selections.steps} values={selections.values} />
            {all != null && (
                <MultiSelect<FullValue>
                    selectAll={() => store.getState().select(selections.steps, undefined, "add")}
                    unselectAll={() => store.getState().select(selections.steps, undefined, "remove")}
                    className="mb-3 mx-3"
                    label={`${selections.values.length}/${all.length} selected`}
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
    all: Array<FullValue>
): Array<[label: string, selected: boolean, value: FullValue]> {
    return all.map((value) => [
        `${value.before.index.join(",")} -> ${value.after.index.join(",")}`,
        selection.values.find(
            (selectedValue) =>
                getIndexRelation(selectedValue.after.index, value.after.index) === HierarchicalRelation.Equal
        ) != null,
        value,
    ])
}

function GUISteps({
    step,
    values,
    descriptionName,
}: {
    descriptionName: string
    step: HierarchicalParsedSteps | string
    values: Array<FullValue>
}): JSX.Element | null {
    if (typeof step === "string") {
        return <GUINounStep descriptionName={descriptionName} value={step} />
    }
    switch (step.type) {
        case "raw":
            return <GUIRawStep step={step} />
        case "symbol":
            return <GUISymbolStep step={step} />
        case "operation":
            return <GUIOperation step={step} values={values} />
        case "random":
            return <GUIRandomStep step={step} values={values} />
        case "switch":
            return <GUISwitchStep step={step} values={values} />
        case "if":
            return <GUIIfStep step={step} values={values} />
        default:
            return null
    }
}
