import {
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    SelectedSteps,
    serializeSteps,
    serializeStepString,
    shallowEqual,
} from "cgv"
import { Fragment, HTMLProps, MouseEvent, useMemo, useRef } from "react"
import { useBaseGlobal } from "../global"
import { useBaseStore } from "../global"
import { EditIcon } from "../icons/edit"
import { BaseState } from "../base-state"
import { childrenSelectable } from "../gui"

export function Grammar({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const nouns = store((state) => (state.type === "gui" ? state.grammar : undefined))
    if (nouns == null) {
        return null
    }
    return (
        <div {...rest} className={`${className} position-relative`}>
            <div className="m-3">
                {nouns.map(({ name, step }) => (
                    <InteractableSteps key={name} value={step} noun={name} />
                ))}
                <button
                    className="d-flex align-items-center btn btn-sm btn-secondary"
                    style={{ position: "fixed", right: "1rem", bottom: "1rem" }}
                    onClick={() => store.getState().setType("tui")}>
                    <EditIcon />
                </button>
            </div>
        </div>
    )
}

function InteractableSteps({ value, noun }: { value: HierarchicalParsedSteps; noun?: string }): JSX.Element | null {
    const store = useBaseStore()
    const events = useMemo(() => {
        const { onEndHover, onStartHover, select } = store.getState()
        return {
            onMouseLeave: onEndHover.bind(null, noun ?? value, undefined),
            onMouseEnter: onStartHover.bind(null, noun ?? value, undefined),
            onClick: select.bind(null, noun ?? value, undefined, undefined),
        }
    }, [store, value, noun])
    const { operationGuiMap } = useBaseGlobal()
    const cssClassName = store(computeCssClassName.bind(null, noun ?? value))
    if (noun != null) {
        return (
            <>
                <span className={cssClassName}>
                    <span {...events}>{`${noun} -> `}</span>
                    <InteractableSteps value={value} />
                </span>
                <br />
                <br />
            </>
        )
    }
    if (!childrenSelectable(operationGuiMap, value)) {
        return (
            <span {...events} className={cssClassName}>
                <FlatSteps value={value} />
            </span>
        )
    }
    return (
        <span className={cssClassName}>
            <NestedSteps value={value} events={events} />
        </span>
    )
}

function FlatSteps({ value }: { value: HierarchicalParsedSteps }): JSX.Element {
    return <>{serializeStepString(value)}</>
}

function NestedSteps({
    value,
    events,
}: {
    value: HierarchicalParsedSteps
    events: {
        onMouseLeave: () => void
        onMouseEnter: () => void
        onClick: () => void
    }
}): JSX.Element {
    return serializeSteps(
        value,
        (text) => (index: number) =>
            (
                <span key={index} {...events}>
                    {text}
                </span>
            ),
        (child) => (index) => <InteractableSteps key={index} value={child} />,
        (...values) =>
            (index) =>
                <Fragment key={index}>{values.map((value, i) => value(i))}</Fragment>
    )(0)
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
