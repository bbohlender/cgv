import {
    HierarchicalParsedGrammarDefinition,
    toValue,
    interprete,
    HierarchicalInfo,
    ParsedSteps,
    Value,
    HierarchicalParsedSteps,
    FullValue,
    debounceBufferTime,
    getIndexRelation,
    HierarchicalRelation,
    shallowEqual,
    getLocalDescription,
    HierarchicalPath,
    getSelectedStepsPath,
    getDescriptionOfNoun,
} from "cgv"
import { applyToObject3D, Primitive, operations, createPhongMaterialGenerator, PointPrimitive } from "cgv/domains/shape"
import { RefObject, ReactNode, useEffect, useRef, Fragment } from "react"
import { of, Subscription, Subject } from "rxjs"
import { Color, Group, Matrix4 } from "three"
import { tileDescriptionSuffix } from "."
import { UseBaseStore, useBaseStore, useBaseStoreState } from "../../../global"
import { Control } from "./control"
import { useViewerState } from "./state"

/**
 *
 * @param p1
 * @param p2
 * @returns true if p1 starts with p2 (including both are the same)
 */
function pathStartsWith(p1: HierarchicalPath, p2: HierarchicalPath): boolean {
    if (p1 === p2) {
        return true
    }
    if (p1.length < p2.length) {
        return false
    }
    for (let i = 0; i < p2.length; i++) {
        if (p1[i] != p2[i]) {
            return false
        }
    }
    return true
}

export type Annotation = HierarchicalParsedSteps | undefined

function getAnnotationAfterStep(value: Value<Primitive, Annotation>, step: HierarchicalParsedSteps): Annotation {
    if (value.annotation == null) {
        return step
    }
    if (step.path[0] != value.annotation.path[0]) {
        //change through symbol
        return value.annotation
    }
    if (pathStartsWith(value.annotation.path, step.path)) {
        return value.annotation
    }
    return step
}

function getAnnotationBeforeStep(value: Value<Primitive, Annotation>, step: HierarchicalParsedSteps): Annotation {
    if (step.type === "symbol") {
        return undefined
    }
    return value.annotation
}
const point = new PointPrimitive(new Matrix4(), createPhongMaterialGenerator(new Color(0xff0000)))

export function Descriptions({ x, y }: { x: number; y: number }) {
    const suffix = tileDescriptionSuffix(x, y)
    const descriptions = useBaseStoreState(
        (state) => state.descriptions.filter((description) => description.endsWith(suffix)),
        shallowEqual
    )
    return (
        <>
            {descriptions.map((description) => (
                <Description key={description} name={description} />
            ))}
        </>
    )
}

export function Description({ name }: { name: string }) {
    const isSelected = useBaseStoreState((state) => state.selectedDescription === name)
    return isSelected ? (
        <>
            <Control />
            <HighlightDescriptions />
            <SelectedDescription name={name} />
        </>
    ) : (
        <UnselectedDescription name={name} />
    )
}

function useSimpleInterpretation(
    description: HierarchicalParsedGrammarDefinition | undefined,
    ref: RefObject<ReactNode & Group>
) {
    const store = useBaseStore()
    useEffect(() => {
        if (ref.current == null || description == null) {
            return
        }
        const subscription = applyToObject3D(
            of(point).pipe(
                toValue(),
                interprete<Primitive, Annotation, HierarchicalInfo>(description, operations, {
                    delay: store.getState().interpretationDelay,
                })
            ),
            ref.current,
            (value) => {
                useViewerState.getState().setError(undefined)
                return value.raw.getObject()
            },
            (error: any) => {
                console.error(error)
                useViewerState.getState().setError(error.message)
            }
        )
        return () => {
            ref.current?.remove(...ref.current.children)
            subscription.unsubscribe()
        }
    }, [store, description])
}

function useInterpretation(
    description: HierarchicalParsedGrammarDefinition | undefined,
    ref: RefObject<ReactNode & Group>
) {
    const store = useBaseStore()
    useEffect(() => {
        if (ref.current == null || description == null) {
            return
        }

        let subscription: Subscription | undefined

        const beforeValuesMap = new Map<ParsedSteps, Array<Value<Primitive, Annotation>>>()

        const afterStepSubject = new Subject<{ steps: HierarchicalParsedSteps; value: FullValue }>()

        const unsubscribeAfterStep = afterStepSubject
            .pipe(debounceBufferTime(300))
            .subscribe((entries) => store.getState().editIndices(entries, true))
        try {
            subscription = applyToObject3D(
                of(point).pipe(
                    toValue(),
                    interprete<Primitive, Annotation, HierarchicalInfo>(description, operations, {
                        delay: store.getState().interpretationDelay,
                        //TODO: we need a possibility to know when a value is removed
                        annotateAfterStep: (value, steps) => {
                            const beforeValues = beforeValuesMap.get(steps)
                            const beforeValue = beforeValues?.find((possibleBeforeValue) => {
                                const relation = getIndexRelation(value.index, possibleBeforeValue.index)
                                return (
                                    relation === HierarchicalRelation.Predecessor ||
                                    relation === HierarchicalRelation.Equal
                                )
                            })
                            if (beforeValue != null) {
                                afterStepSubject.next({
                                    steps,
                                    value: { after: value, before: beforeValue },
                                })
                            }
                            return getAnnotationAfterStep(value, steps)
                        },
                        annotateBeforeStep: (value, steps) => {
                            let beforeValues = beforeValuesMap.get(steps)
                            if (beforeValues == null) {
                                beforeValues = []
                                beforeValuesMap.set(steps, beforeValues)
                            }
                            beforeValues.push(value)
                            return getAnnotationBeforeStep(value, steps)
                        },
                    })
                ),
                ref.current,
                (value) => {
                    const child = value.raw.getObject()
                    if (value.annotation != null) {
                        const beforeValues = beforeValuesMap.get(value.annotation)
                        const beforeValue = beforeValues?.find((possibleBeforeValue) => {
                            const relation = getIndexRelation(value.index, possibleBeforeValue.index)
                            return (
                                relation === HierarchicalRelation.Predecessor || relation === HierarchicalRelation.Equal
                            )
                        })
                        if (beforeValue != null) {
                            const fullValue: FullValue = {
                                after: value,
                                before: beforeValue,
                            }
                            child.traverse((o) => {
                                o.userData.steps = value.annotation
                                o.userData.value = fullValue
                            })
                        }
                    }
                    return child
                },
                (error: any) => {
                    console.error(error)
                    useViewerState.getState().setError(error.message)
                }
            )
            /*
                        .subscribe({
                            next: (object) => useViewerState.getState().setResult(object),
                            error: (error) => {
                                console.error(error)
                                useViewerState.getState().setError(error.message)
                            },
                        })*/
        } catch (error: any) {
            useViewerState.getState().setError(error.message)
        }
        return () => {
            store.getState().clearValueMap()
            ref.current?.remove(...ref.current.children)
            subscription?.unsubscribe()
            unsubscribeAfterStep?.unsubscribe()
        }
    }, [store, description])
}

function useLocalDescription(store: UseBaseStore, name: string) {
    return store(
        (state) => (state.type === "gui" ? getLocalDescription(state.grammar, state.dependencyMap, name) : undefined),
        shallowEqual
    )
}

function UnselectedDescription({ name }: { name: string }) {
    const groupRef = useRef<ReactNode & Group>(null)
    const store = useBaseStore()
    const unselectedDescription = useLocalDescription(store, name)
    useSimpleInterpretation(unselectedDescription, groupRef)
    return (
        <group
            onClick={(e) => {
                store.getState().selectDescription(name)
            }}
            ref={groupRef}
        />
    )
}

function SelectedDescription({ name }: { name: string }) {
    const store = useBaseStore()
    const selectedDescription = useLocalDescription(store, name)
    const groupRef = useRef<ReactNode & Group>(null)
    useInterpretation(selectedDescription, groupRef)
    if (selectedDescription == null) {
        return null
    }
    return (
        <group
            ref={groupRef}
            onPointerMove={(e) => {
                e.stopPropagation()
                if (e.intersections.length === 0) {
                    return
                }
                const object = e.intersections[0].object
                const steps = object.userData.steps
                const value = object.userData.value
                if (steps == null || value == null) {
                    return
                }
                store.getState().onStartHover(steps, [value])
            }}
            onPointerOut={(e) => {
                e.stopPropagation()
                const object = e.object
                const steps = object.userData.steps
                const value = object.userData.value
                if (steps == null || value == null) {
                    return
                }
                store.getState().onEndHover(steps)
            }}
            onClick={(e) => {
                e.stopPropagation()
                const state = store.getState()
                if (state.type != "gui") {
                    return
                }
                if (state.requested != null) {
                    return
                }
                const object = e.intersections[0].object
                const steps = object.userData.steps
                const value = object.userData.value
                if (steps == null || value == null) {
                    return
                }
                store.getState().selectResult(steps, value)
            }}
        />
    )
}

function HighlightDescriptions() {
    const store = useBaseStore()

    const primitives = store(
        (state) =>
            state.type === "gui"
                ? Array.from(
                      new Set(
                          state.selectionsList
                              .reduce<Array<Primitive>>(
                                  (prev, selections) => prev.concat(selections.values.map((value) => value.after.raw)),
                                  []
                              )
                              .concat(state.hovered?.values.map((value) => value.after.raw) ?? [])
                              .filter((raw) => raw instanceof Primitive)
                      )
                  )
                : undefined,
        shallowEqual
    )

    if (primitives == null) {
        return null
    }

    return (
        <>
            {primitives.map((primitive) => (
                <primitive key={primitive.getOutline().uuid} object={primitive.getOutline()} />
            ))}
        </>
    )
}
