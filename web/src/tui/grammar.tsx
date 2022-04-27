import {
    getDescription,
    HierarchicalParsedSteps,
    localizeStepsSerializer,
    SelectedSteps,
    serializeSteps,
    serializeStepString,
    shallowEqual,
} from "cgv"
import { Fragment, HTMLProps, useMemo } from "react"
import { useBaseGlobal } from "../global"
import { useBaseStore } from "../global"
import { EditIcon } from "../icons/edit"
import { BaseState } from "../base-state"
import { childrenSelectable } from "../gui"

export function Grammar({
    className,
    selectedDescription,
    ...rest
}: HTMLProps<HTMLDivElement> & { selectedDescription: string }) {
    const store = useBaseStore()
    const nouns = store(
        (state) =>
            state.type === "gui" && state.selectedDescription != null
                ? getDescription(state.grammar, state.selectedDescription, false)
                : undefined,
        shallowEqual
    )
    if (nouns == null) {
        return null
    }
    return (
        <div {...rest} className={`${className} position-relative`}>
            <div className="m-3">
                {nouns.map(({ name, step }) => (
                    <InteractableSteps description={selectedDescription} key={name} value={step} noun={name} />
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

function InteractableSteps({
    value,
    noun,
    description,
}: {
    value: HierarchicalParsedSteps
    noun?: string
    description: string
}): JSX.Element | null {
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
                    <span {...events}>{`${localizeStepsSerializer(description, noun) ?? noun} -> `}</span>
                    <InteractableSteps description={description} value={value} />
                </span>
                <br />
                <br />
            </>
        )
    }
    if (!childrenSelectable(operationGuiMap, value)) {
        return (
            <span {...events} className={cssClassName}>
                <FlatSteps description={description} value={value} />
            </span>
        )
    }
    return (
        <span className={cssClassName}>
            <NestedSteps description={description} value={value} events={events} />
        </span>
    )
}

function FlatSteps({ value, description }: { value: HierarchicalParsedSteps; description: string }): JSX.Element {
    return <>{serializeStepString(value, localizeStepsSerializer.bind(null, description))}</>
}

function NestedSteps({
    value,
    events,
    description,
}: {
    description: string
    value: HierarchicalParsedSteps
    events: {
        onMouseLeave: () => void
        onMouseEnter: () => void
        onClick: () => void
    }
}): JSX.Element {
    if (value.type === "symbol") {
        return <span {...events}>{localizeStepsSerializer(description, value) ?? value.identifier}</span>
    }
    return serializeSteps(
        value,
        (text) => (index: number) =>
            (
                <span key={index} {...events}>
                    {text}
                </span>
            ),
        (child) => (index) => <InteractableSteps description={description} key={index} value={child} />,
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
