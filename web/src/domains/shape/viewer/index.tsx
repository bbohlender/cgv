import { Sphere, useContextBridge } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import {
    interprete,
    toValue,
    Value,
    HierarchicalParsedSteps,
    HierarchicalInfo,
    HierarchicalPath,
    shallowEqual,
    ParsedSteps,
    debounceBufferTime,
    HierarchicalParsedGrammarDefinition,
    FullValue,
    getIndexRelation,
    HierarchicalRelation,
} from "cgv"
import { createPhongMaterialGenerator, operations, PointPrimitive, Primitive, applyToObject3D } from "cgv/domains/shape"
import { HTMLProps, useEffect, RefObject, ReactNode, Fragment } from "react"
import { of, Subject, Subscription } from "rxjs"
import { Color, Group, Matrix4 } from "three"
import { ErrorMessage } from "../../../error-message"
import { domainContext, UseBaseStore, useBaseStore } from "../../../global"
import { panoramas } from "../global"
import { ViewerCamera } from "./camera"
import { useViewerState } from "./state"
import { ViewControls } from "./view-controls"
import { Control } from "./control"
import { ImageIcon } from "../../../icons/image"
import { BackIcon } from "../../../icons/back"
import { SpeedSelection } from "../../../gui/speed-selection"
import { MultiSelectIcon } from "../../../icons/multi-select"
import { DescriptionList } from "../../../gui/description-list"
import { GUI } from "../../../gui"
import { TextEditorToggle } from "../../../gui/toggles/text"
import { GeoSearch } from "../geo-search"
import { Tiles } from "./tile"

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

const point = new PointPrimitive(new Matrix4(), createPhongMaterialGenerator(new Color(0xff0000)))

export function Viewer({ className, children, ...rest }: HTMLProps<HTMLDivElement>) {
    const Bridge = useContextBridge(domainContext)
    const store = useBaseStore()

    return (
        <div {...rest} className={`${className} position-relative`}>
            <Canvas
                style={{
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                }}
                dpr={global.window == null ? 1 : window.devicePixelRatio}>
                <Bridge>
                    <ViewerCamera />
                    <Control />
                    <ViewControls />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 10]} intensity={0.5} />
                    <Panoramas />
                    <Tiles />
                </Bridge>
            </Canvas>
            <div
                className="d-flex flex-row justify-content-between position-absolute"
                style={{ pointerEvents: "none", inset: 0 }}>
                <div className="d-flex flex-column my-3 ms-3" style={{ maxWidth: 160 }}>
                    <GeoSearch style={{ pointerEvents: "all" }} className="mb-3" />
                    <DescriptionList style={{ pointerEvents: "all" }} className="mb-3">
                        <div className="p-2 border-top border-1">
                            <div className="w-100 btn-sm btn btn-outline-secondary" onClick={() => generateLots(store)}>
                                Generate Lots
                            </div>
                            <div
                                className="w-100 btn-sm btn mt-2 btn-outline-secondary"
                                onClick={() => generateRoads(store)}>
                                Generate Roads
                            </div>
                        </div>
                    </DescriptionList>
                    <div className="flex-grow-1" />
                    <div style={{ pointerEvents: "all" }} className="d-flex flex-row">
                        <MultiSelectButton className="me-2" />
                        <BackgroundToggle className="me-2" />
                        <BackButton className="me-2" />
                        <SpeedSelection className="me-2" />
                        <ShowError />
                    </div>
                </div>
                <div className="d-flex flex-column align-items-end m-3">
                    <GUI
                        className="bg-light border rounded shadow w-100 mb-3 overflow-hidden"
                        style={{
                            maxWidth: "16rem",
                            pointerEvents: "all",
                        }}
                    />
                    <div className="flex-grow-1"></div>
                    <div className="d-flex flex-row" style={{ pointerEvents: "all" }}>
                        <TextEditorToggle className="me-2" />
                        {/*<FullscreenToggle rootRef={null} />*/}
                    </div>
                </div>
            </div>
            {children}
        </div>
    )
}

async function generateLots(store: UseBaseStore) {
    /*const tile = useViewerState.getState().tile
    //TODO: convert to default zoom level
    const layers = await loadMapLayers(tile.x, tile.y, tile.zoom)
    const newDescriptions = convertLotsToSteps(layers, `/${tile.x}/${tile.y}`)
    store.getState().addDescriptions(newDescriptions)*/
}

async function generateRoads(store: UseBaseStore) {
    /*const tile = useViewerState.getState().tile
    //TODO: convert to default zoom level
    const layers = await loadMapLayers(tile.x, tile.y, tile.zoom)
    const newDescriptions = convertRoadsToSteps(layers, `/${tile.x}/${tile.y}`)
    store.getState().addDescriptions(newDescriptions)*/
}

function ShowError() {
    const error = useViewerState((state) => state.error)
    if (error == null) {
        return null
    }
    return <ErrorMessage message={error} align="left" />
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
            ref.current?.remove(...ref.current.children)
            subscription?.unsubscribe()
            unsubscribeAfterStep?.unsubscribe()
        }
    }, [store, description])
}

/*function UnselectedDescriptionResults() {
    const store = useBaseStore()
    const unselectedDescriptions = store(
        (state) =>
            state.type === "gui"
                ? state.descriptions
                      .filter((description) => description.visible && description.name != state.selectedDescription)
                      .map((description) => description.name)
                : undefined,
        shallowEqual
    )

    if (unselectedDescriptions == null) {
        return null
    }

    return (
        <>
            {unselectedDescriptions.map((unselectedDescription) => (
                <UnselectedDescription key={unselectedDescription} description={unselectedDescription} />
            ))}
        </>
    )
}

function UnselectedDescription({ description }: { description: string }) {
    const groupRef = useRef<ReactNode & Group>(null)
    const store = useBaseStore()
    const unselectedDescription = store(
        (state) =>
            state.type === "gui" ? getLocalDescription(state.grammar, state.dependencyMap, description) : undefined,
        shallowEqual
    )
    useSimpleInterpretation(unselectedDescription, groupRef)
    return <group onClick={() => store.getState().selectDescription(description)} ref={groupRef} />
}

function SelectedDescriptionResult() {
    const store = useBaseStore()
    const selectedDescription = store(
        (state) =>
            state.type === "gui" &&
            state.selectedDescription != null &&
            state.descriptions.find((description) => description.name === state.selectedDescription)?.visible
                ? getLocalDescription(state.grammar, state.dependencyMap, state.selectedDescription)
                : undefined,
        shallowEqual
    )
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
}*/

function Panoramas() {
    return (
        <>
            {panoramas.map(({ lat, lon, height }, index) => (
                <Sphere
                    key={index}
                    position={[lat, height, lon]}
                    onClick={(e) => {
                        e.stopPropagation()
                        useViewerState.getState().changePanoramaView(index)
                    }}
                    args={[5]}>
                    <meshBasicMaterial color={0x0000ff} />
                </Sphere>
            ))}
        </>
    )
}

function HighlightPrimitives() {
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
                <Fragment key={primitive.getOutline().uuid}>
                    <primitive object={primitive.getOutline()} />
                    <axesHelper args={[10]} matrix={primitive.matrix} matrixAutoUpdate={false} />
                </Fragment>
            ))}
        </>
    )
}

function BackgroundToggle({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const showBackground = useViewerState((state) => state.showBackground)
    return (
        <div
            {...rest}
            onClick={() => useViewerState.getState().toggleBackground()}
            className={`${className} d-flex align-items-center justify-content-center btn ${
                showBackground ? "btn-primary" : "btn-secondary"
            } btn-sm `}>
            <ImageIcon />
        </div>
    )
}

function MultiSelectButton({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const shift = store((s) => (s.type === "gui" ? s.shift : false))
    return (
        <div
            {...rest}
            onPointerDown={() => store.getState().setShift(true)}
            onPointerUp={() => store.getState().setShift(false)}
            className={`${className} d-flex align-items-center justify-content-center btn ${
                shift ? "btn-primary" : "btn-secondary"
            } btn-sm `}>
            <MultiSelectIcon />
        </div>
    )
}

function BackButton({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const viewType = useViewerState(({ viewType }) => viewType)
    if (viewType != "3d") {
        return null
    }
    return (
        <div
            {...rest}
            className={`${className} d-flex align-items-center justify-content-center btn btn-sm btn-primary`}
            onClick={() => useViewerState.getState().exitPanoramaView()}>
            <BackIcon />
        </div>
    )
}
