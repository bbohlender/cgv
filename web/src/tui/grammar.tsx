import {
    createSerializer,
    getLocalDescription,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    localizeNoun,
    localizeStepsSerializer,
    ParsedSteps,
    SelectedSteps,
    serialize,
    serializeSteps,
    serializeStepString,
    multilineStringWhitespace,
    shallowEqual,
    descendantCount,
} from "cgv"
import { Fragment, useMemo } from "react"
import { useBaseGlobal } from "../global"
import { useBaseStore } from "../global"
import { EditIcon } from "../icons/edit"
import { BaseState } from "../base-state"
import { childrenSelectable } from "../gui"
import { GraphIcon } from "../icons/graph"

export function Grammar() {
    const store = useBaseStore()
    const selectedDescription = store((state) => state.selectedDescription)
    const localDescription = store(
        (state) =>
            state.type === "gui" && !state.graphVisualization && state.selectedDescription != null
                ? getLocalDescription(state.grammar, state.dependencyMap, state.selectedDescription)
                : undefined,
        shallowEqual
    )
    if (selectedDescription == null) {
        return (
            <div className="d-flex align-items-center justify-content-center flex-grow-1">
                <span>Nothing Selected</span>
            </div>
        )
    }
    if (localDescription == null) {
        return null
    }

    return (
        <div className="position-relative flex-grow-1">
            <div
                style={{
                    whiteSpace: "pre-wrap",
                    tabSize: 2,
                }}
                className="m-3">
                {serialize(localDescription, createReactSerializer(selectedDescription))(0)}
                <div
                    style={{ position: "fixed", right: "1rem", bottom: "1rem" }}
                    className="d-flex flex-row align-items-center">
                    <button
                        className="d-flex align-items-center btn btn-sm btn-secondary me-2"
                        onClick={() => store.getState().setGraphVisualization(true)}>
                        <GraphIcon />
                    </button>
                    <button
                        className="d-flex align-items-center btn btn-sm btn-secondary"
                        onClick={() => store.getState().setType("tui")}>
                        <EditIcon />
                    </button>
                </div>
            </div>
        </div>
    )
}

function InteractableSteps({
    value,
    description,
    indentation,
}: {
    value: HierarchicalParsedSteps | string
    description: string
    indentation: number
}): JSX.Element | null {
    const store = useBaseStore()
    const events = useMemo(() => {
        const { onEndHover, onStartHover, select } = store.getState()
        return {
            onMouseLeave: onEndHover.bind(null, value, undefined),
            onMouseEnter: onStartHover.bind(null, value, undefined),
            onClick: select.bind(null, value, undefined, undefined),
        }
    }, [store, value])
    const { operationGuiMap } = useBaseGlobal()
    const cssClassName = store(computeCssClassName.bind(null, value))

    if (typeof value === "string") {
        return (
            <span {...events} className={cssClassName}>
                {localizeNoun(value, description)}
            </span>
        )
    }

    if (value.type === "symbol") {
        return (
            <span {...events} className={cssClassName}>
                {localizeNoun(value.identifier, description)}
            </span>
        )
    }

    if (!childrenSelectable(operationGuiMap, value)) {
        return (
            <span {...events} className={cssClassName}>
                <FlatSteps indentation={indentation} description={description} value={value} />
            </span>
        )
    }
    return (
        <span className={cssClassName}>
            {serializeSteps(value, createReactSerializer(description), indentation)(0)}
        </span>
    )
}

function FlatSteps({
    value,
    description,
    indentation,
}: {
    indentation: number
    value: HierarchicalParsedSteps
    description: string
}): JSX.Element {
    return (
        <>
            {serializeStepString(
                value,
                indentation,
                localizeStepsSerializer.bind(null, description),
                multilineStringWhitespace
            )}
        </>
    )
}

function createReactSerializer(description: string) {
    return createSerializer<(index: number) => JSX.Element, HierarchicalInfo>(
        (text) => (index: number) => <span key={index}>{text}</span>,
        (indentation, child) => (index) =>
            <InteractableSteps indentation={indentation} description={description} key={index} value={child} />,
        (...values) =>
            (index) =>
                <Fragment key={index}>{values.map((value, i) => value(i))}</Fragment>,
        (indentation, ...steps) =>
            (index: number) =>
                <span key={index}>{multilineStringWhitespace(indentation, ...steps)}</span>
    )
}

function computeCssClassName(steps: SelectedSteps, state: BaseState): string | undefined {
    if (state.type != "gui") {
        return undefined
    }
    if (state.selectionsList.findIndex((selections) => selections.steps == steps) != -1) {
        return "selected"
    }
    if (state.hovered != null && state.hovered.steps === steps) {
        return "hovered"
    }
    return undefined
}
