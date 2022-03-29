import {
    HierarchicalParsedSteps,
    interprete,
    parse,
    ParsedSteps,
    add,
    toValue,
    Value,
    toHierachical,
    HierarchicalParsedGrammarDefinition,
    remove,
    replace,
    rename,
    StepDescriptor,
} from "cgv"
import { createPhongMaterialGenerator, Primitive, operations, PointPrimitive } from "cgv/domains/shape"
import { useEffect, useMemo } from "react"
import { Observable, of } from "rxjs"
import { Color, Matrix4 } from "three"
import create from "zustand"
import { combine } from "zustand/middleware"
import { Grammar } from "../src/grammar"
import { GUI } from "../src/gui"
import { Viewer } from "../src/shape/viewer"
import { StepDescriptorDialog } from "../src/step-descriptor-dialog"
import { TextEditor } from "../src/text-editor"

const testGrammar = parse(`a -> face(
	point(0,0,100),
	point(0,0,0),
	point(100,0,00),
	point(100,0,100)
)

extrude(100)`)

export type State = {
    selected: HierarchicalParsedSteps | string | undefined
    hovered: Array<HierarchicalParsedSteps | string>
    grammar: HierarchicalParsedGrammarDefinition
    stepDescriptorDialogFor: "before" | "after" | "parallel" | "replace" | undefined
}

const initialState: State = {
    selected: undefined,
    hovered: [],
    grammar: toHierachical(testGrammar),
    stepDescriptorDialogFor: undefined,
}

const store = combine(initialState, (set, get) => ({
    stepDescribed: (descriptor: StepDescriptor | undefined) => {
        if (descriptor == null) {
            set({
                stepDescriptorDialogFor: undefined,
            })
            return
        }
        const { stepDescriptorDialogFor, selected, grammar } = get()
        if (selected == null) {
            return
        }
        let newSelected: HierarchicalParsedSteps
        switch (stepDescriptorDialogFor) {
            case "after":
            case "before":
            case "parallel":
                newSelected = add(stepDescriptorDialogFor, selected, descriptor, operations, grammar)
                break
            case "replace":
                if (typeof selected === "string") {
                    return
                }
                newSelected = replace(selected, descriptor, operations, grammar)
                break
            default:
                return
        }
        set({ selected: newSelected, stepDescriptorDialogFor: undefined, grammar: { ...grammar } })
    },
    onStartHover: (step: HierarchicalParsedSteps | string) => {
        const hovered = get().hovered
        if (!hovered.includes(step)) {
            set({ hovered: [...hovered, step] })
        }
    },
    escape: () => {
        const { stepDescriptorDialogFor, selected } = get()
        if (stepDescriptorDialogFor != null) {
            set({ stepDescriptorDialogFor: undefined })
            return
        }
        if (selected != null) {
            set({ selected: undefined })
            return
        }
    },
    onEndHover: (step: HierarchicalParsedSteps | string) =>
        set({ hovered: get().hovered.filter((hoveredStep) => hoveredStep != step) }),
    select: (selected: HierarchicalParsedSteps | string | undefined) => set({ selected }),
    stepDescriptorDialog: (type: "replace" | "before" | "parallel" | "after" | undefined) =>
        set({ stepDescriptorDialogFor: type }),
    remove: () => {
        const { selected, grammar } = get()
        if (selected == null) {
            return
        }
        remove(selected, operations, grammar)
        set({
            selected: undefined,
            grammar: { ...grammar },
        })
    },
    rename: (name: string) => {
        const { selected, grammar } = get()
        if (typeof selected != "string") {
            return
        }
        rename(selected, name, grammar)
        set({
            selected: name,
            grammar: { ...grammar },
        })
    },
    replace: (descriptor: StepDescriptor) => {
        const { selected, grammar } = get()
        if (selected == null) {
            return
        }
        if (typeof selected === "string") {
            return
        }
        const result = replace(selected, descriptor, operations, grammar)
        set({
            selected: result,
            grammar: { ...grammar },
        })
    },
    invalidate: () =>
        set({
            grammar: { ...get().grammar },
        }),
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
    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            if (e.target != document.body) {
                return
            }
            switch (e.key) {
                case "Escape":
                    useStore.getState().escape()
                    break
                case "Delete":
                    useStore.getState().remove()
                    break
            }
        }
        window.addEventListener("keydown", listener)
        return () => window.removeEventListener("keydown", listener)
    }, [])
    const grammar = useStore(({ grammar }) => grammar)
    const [value, error] = useMemo(() => {
        try {
            return [
                input.pipe(
                    interprete<Primitive, Annotation>(grammar, operations, {
                        combineAnnotations,
                        annotateBeforeStep,
                    })
                ),
                undefined,
            ] as const
        } catch (error: any) {
            return [undefined, JSON.stringify(error.message)] as const
        }
    }, [grammar])

    //TODO: show error

    const showDialog = useStore(({ stepDescriptorDialogFor }) => stepDescriptorDialogFor != null)

    return (
        <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
            {showDialog && <StepDescriptorDialog onSelected={useStore.getState().stepDescribed} />}
            <div className="flex-basis-0 flex-grow-1 position-relative">
                <Viewer value={value} />
                <GUI style={{ top: "1rem", right: "1rem" }} />
            </div>
            <div
                style={{ overflowX: "hidden", overflowY: "auto" }}
                className="text-editor p-3 text-light flex-basis-0 flex-grow-1 bg-dark position-relative">
                <Grammar />
                <TextEditor />
            </div>
        </div>
    )
}
