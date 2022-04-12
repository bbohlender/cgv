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
            onEndHover: onEndHover.bind(null, value),
            onStartHover: onStartHover.bind(null, value),
            select: (e: MouseEvent) => {
                if (e.target === ref.current) {
                    select(value, undefined, undefined, e.shiftKey)
                }
            },
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
    return (
        <>
            <span
                ref={ref}
                onClick={mutations.select}
                onMouseLeave={mutations.onEndHover}
                onMouseEnter={mutations.onStartHover}
                className={cssClassName}>
                {serializeSteps<JSX.Element>(
                    value,
                    (_, i) => (
                        <Substep key={i} value={value.children![i]} />
                    ),
                    (...values) => (
                        <>{values}</>
                    )
                )}
            </span>
            {typeof value === "string" && (
                <>
                    <br />
                    <br />
                </>
            )}
        </>
    )
}

function computeCssClassName(steps: HierarchicalParsedSteps, state: BaseState): string | undefined {
    if (state.type != "gui") {
        return undefined
    }
    if (state.selections.find(({ steps: selectedSteps }) => selectedSteps === steps) != null) {
        return "selected"
    }
    if (state.hovered.length > 0 && state.hovered[state.hovered.length - 1] === steps) {
        return "hovered"
    }
    return undefined
}
