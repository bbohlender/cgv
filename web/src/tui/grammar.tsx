import { HierarchicalParsedSteps, serializeSteps, serializeStepString, shallowEqual } from "cgv"
import { HTMLProps, MouseEvent, useMemo, useRef } from "react"
import { useGlobal } from "../global"
import { useStore, useStoreState } from "../global"
import { CheckIcon } from "../icons/check"
import { EditIcon } from "../icons/edit"
import { State } from "../state"

//TODO: parsedSteps with additional information (for the editor we need the subject to change a constant, for the summarizer we need parent & childrenIndex info)

export function Grammar({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useStore()
    const isGui = store(({ type }) => type === "gui")
    const nouns = store(({ grammar }) => Object.keys(grammar), shallowEqual)
    if (!isGui) {
        return null
    }
    return (
        <div {...rest} className={`${className} position-relative`}>
            {nouns.map((noun) => (
                <InteractableSteps key={noun} path={[noun]} />
            ))}
            <button
                className="d-flex align-items-center btn btn-primary"
                style={{ position: "absolute", right: "1rem", bottom: "1rem" }}
                onClick={() => store.getState().setType("tui")}>
                <EditIcon />
            </button>
        </div>
    )
}

function selectStep([noun, ...indices]: [noun: string, ...indices: Array<number>], { grammar }: State) {
    if (indices.length === 0) {
        return noun
    }
    let current: HierarchicalParsedSteps | undefined = grammar[noun]
    for (const index of indices.slice(1)) {
        if (current?.children == null) {
            return undefined
        }
        current = current.children[index]
    }
    return current
}

function Steps({ path }: { path: [noun: string, ...indices: Array<number>] }): JSX.Element | null {
    return useStoreState((state) => {
        const step = selectStep(path, state)
        if (step == null || typeof step == "string") {
            return null
        }
        return <>{serializeStepString(step)}</>
    })
}

function InteractableSteps({ path }: { path: [noun: string, ...indices: Array<number>] }): JSX.Element | null {
    const ref = useRef<HTMLSpanElement>(null)
    const store = useStore()
    const value = store(selectStep.bind(null, path))
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
                    select(value)
                }
            },
        }
    }, [store, value])
    const { operationGuiMap } = useGlobal()
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
        <span
            ref={ref}
            onClick={mutations.select}
            onMouseLeave={mutations.onEndHover}
            onMouseEnter={mutations.onStartHover}
            className={cssClassName}>
            {typeof value === "string" ? (
                <>
                    {`${value} -> `} <Substep path={[...path, 0]} />
                    <br />
                </>
            ) : (
                serializeSteps<JSX.Element>(
                    value,
                    (_, i) => <Substep key={i} path={[...path, i]} />,
                    (...values) => <>{values}</>
                )
            )}
        </span>
    )
}

function computeCssClassName(
    steps: HierarchicalParsedSteps | string,
    { hovered, selected }: State
): string | undefined {
    if (selected === steps) {
        return "selected"
    }
    if (hovered.length > 0 && hovered[hovered.length - 1] === steps) {
        return "hovered"
    }
    return undefined
}
