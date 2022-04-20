import { HierarchicalParsedSteps, serializeSteps, serializeStepString, shallowEqual } from "cgv"
import { HTMLProps, MouseEvent, useMemo, useRef } from "react"
import { useBaseGlobal } from "../global"
import { useBaseStore } from "../global"
import { EditIcon } from "../icons/edit"
import { BaseState } from "../base-state"

export function Grammar({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const nouns = store((state) => (state.type === "gui" ? Object.entries(state.grammar) : undefined), shallowEqual)
    if (nouns == null) {
        return null
    }
    return (
        <div {...rest} className={`${className} position-relative`}>
            {nouns.map(([name, value]) => (
                <>
                    {`${name} -> `} <InteractableSteps key={name} value={value} />
                    <br />
                    <br />
                </>
            ))}
            <button
                className="d-flex align-items-center btn btn-sm btn-primary"
                style={{ position: "fixed", right: "1rem", bottom: "1rem" }}
                onClick={() => store.getState().setType("tui")}>
                <EditIcon />
            </button>
        </div>
    )
}

function Steps({ value }: { value: HierarchicalParsedSteps }): JSX.Element | null {
    return <>{serializeStepString(value)}</>
}

function InteractableSteps({ value }: { value: HierarchicalParsedSteps }): JSX.Element | null {
    const ref = useRef<HTMLSpanElement>(null)
    const store = useBaseStore()
    const mutations = useMemo(() => {
        if (value == null) {
            return undefined
        }
        const { onEndHover, onStartHover, select } = store.getState()
        return {
            onEndHover: onEndHover.bind(null, value, undefined),
            onStartHover: onStartHover.bind(null, value, undefined),
            select: select.bind(null, value, undefined, undefined),
        }
    }, [store, value])
    const { operationGuiMap } = useBaseGlobal()
    const Substep = useMemo(() => {
        if (
            value == null ||
            typeof value == "string" ||
            value.type != "operation" ||
            operationGuiMap[value.identifier] == null
        ) {
            return InteractableSteps
        }
        return Steps
    }, [value, operationGuiMap])
    const cssClassName = store(value == null ? () => "" : computeCssClassName.bind(null, value))
    if (value == null || mutations == null) {
        return null
    }
    const children = useMemo(
        () =>
            serializeSteps(
                value,
                (text) => (
                    <span
                        onClick={mutations.select}
                        onMouseLeave={mutations.onEndHover}
                        onMouseEnter={mutations.onStartHover}>
                        {text}
                    </span>
                ),
                (child, i) => <Substep key={i} value={child} />,
                (...values) => <>{values}</>
            ),
        [value]
    )
    return <span className={cssClassName}>{children}</span>
}

function computeCssClassName(steps: HierarchicalParsedSteps, state: BaseState): string | undefined {
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
