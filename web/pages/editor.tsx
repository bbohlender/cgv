import { interprete, parse, ParsedGrammarDefinition, ParsedSteps, serializeStepString, toValue, Value } from "cgv"
import { createPhongMaterialGenerator, Primitive, operations, PointPrimitive } from "cgv/domains/shape"
import { useMemo, useState } from "react"
import { Observable, of } from "rxjs"
import { Color, Matrix4 } from "three"
import create from "zustand"
import { combine } from "zustand/middleware"
import { Grammar } from "../src/grammar"
import { GUI } from "../src/gui"
import { Viewer } from "../src/shape/viewer"

const testGrammar = parse(`a -> face(
	point(0,0,100),
	point(0,0,0),
	point(100,0,00),
	point(100,0,100)
)

extrude(100)`)

export type State = {
    selected: ParsedSteps | string | undefined
    hovered: Array<ParsedSteps | string>
    grammar: ParsedGrammarDefinition
}

const initialState: State = {
    selected: undefined,
    hovered: [],
    grammar: testGrammar,
}

const store = combine(initialState, (set, get) => ({
    onStartHover: (step: ParsedSteps) => {
        const hovered = get().hovered
        if (!hovered.includes(step)) {
            set({ hovered: [...hovered, step] })
        }
    },
    onEndHover: (step: ParsedSteps) => set({ hovered: get().hovered.filter((hoveredStep) => hoveredStep != step) }),
    select: (selected: ParsedSteps | string | undefined) => set({ selected }),
    addSequentialStep: (step: ParsedSteps) => {
        //TODO: check if parent is sequential (then add), else replace with sequential
    },
    addParallelStep: () => {
        //TODO: check if parent is parallel (then add), else replace with parallel
    },
    deleteStep: () => {
        const { selected, grammar } = get()
        switch (typeof selected) {
            case "undefined":
                return
            case "string":
                //TODO: remove all symbols with that name
                return
            default:
            //TODO: check if parent is sequential / parallel / bracket (and then recursive) and remove
        }
        //TODO: check if the following results in a rerender
        set({
            grammar
        })
    },
    changeStep: (step: ParsedSteps) => {},
}))

export const useStore = create(store)

const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

const input: Observable<Value<Primitive, Annotation>> = of<Primitive>(
    new PointPrimitive(new Matrix4(), redMaterialGenerator)
).pipe(toValue([]))

export type Annotation = Array<ParsedSteps>

function annotateBeforeStep(value: Value<Primitive, Annotation>, step: ParsedSteps): Annotation {
    return [...value.annotation, step]
}

function combineAnnotations(values: ReadonlyArray<Value<Primitive, Annotation>>): Annotation {
    return values.reduce<Annotation>((prev, value) => prev.concat(value.annotation), [])
}

export default function Editor() {
    const [value, error] = useMemo(() => {
        try {
            return [
                input.pipe(
                    interprete<Primitive, Annotation>(testGrammar, operations, {
                        combineAnnotations,
                        annotateBeforeStep,
                    })
                ),
                undefined,
            ] as const
        } catch (error: any) {
            return [undefined, JSON.stringify(error.message)] as const
        }
    }, [])

    //TODO: show error

    return (
        <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
            <div className="flex-basis-0 flex-grow-1 position-relative">
                <Viewer value={value} />
                <GUI style={{ top: "1rem", right: "1rem" }} />
            </div>
            <div
                style={{ overflowX: "hidden", overflowY: "auto" }}
                className="text-editor p-3 text-light flex-basis-0 flex-grow-1 bg-dark">
                <Grammar value={testGrammar} />
            </div>
        </div>
    )
}
