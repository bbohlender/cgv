import { ParsedGrammarDefinition, ParsedSteps, serializeSteps } from "cgv"
import { MouseEvent, useMemo, useRef } from "react"
import { State, useStore } from "../pages/editor"

//TODO: parsedSteps with additional information (for the editor we need the subject to change a constant, for the summarizer we need parent & childrenIndex info)

export function Grammar({ value }: { value: ParsedGrammarDefinition }) {
    //TODO: make provider that handles hover and onClick
    return (
        <>
            {Object.entries(value).map(([symbol, step], i) => (
                <p key={i}>
                    {`${symbol} -> `}
                    <Steps value={step} />
                </p>
            ))}
        </>
    )
}

function Steps({ value }: { value: ParsedSteps }): JSX.Element {
    const ref = useRef<HTMLSpanElement>(null)
    const { onEndHover, onStartHover, select } = useMemo(() => {
        const { onEndHover, onStartHover, select } = useStore.getState()
        return {
            onEndHover: onEndHover.bind(null, value),
            onStartHover: onStartHover.bind(null, value),
            select: (e: MouseEvent) => {
                if (e.target === ref.current) {
                    select(value)
                }
            },
        }
    }, [value])
    const cssClassName = useStore(useMemo(() => computeCssClassName.bind(null, value), [value]))
    return (
        <span ref={ref} onClick={select} onMouseLeave={onEndHover} onMouseEnter={onStartHover} className={cssClassName}>
            {serializeSteps<JSX.Element>(
                value,
                (child, i) => (
                    <Steps key={i} value={child} />
                ),
                (...values) => (
                    <>{values}</>
                )
            )}
        </span>
    )
}

function computeCssClassName(steps: ParsedSteps, { hovered, selected }: State): string | undefined {
    if (selected === steps) {
        return "selected"
    }
    if (hovered.length > 0 && hovered[hovered.length - 1] === steps) {
        return "hovered"
    }
    return undefined
}
