import { Sphere, Stats, useContextBridge } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import {
    interprete,
    toValue,
    Value,
    HierarchicalParsedSteps,
    HierarchicalInfo,
    HierarchicalPath,
    SelectionsList,
    shallowEqual,
    ParsedSteps,
    debounceBufferTime,
    FullIndex,
} from "cgv"
import { createPhongMaterialGenerator, operations, PointPrimitive, Primitive, applyToObject3D } from "cgv/domains/shape"
import { HTMLProps, useEffect, startTransition, useState, RefObject, ReactNode, useRef, Fragment } from "react"
import { of, Subject, Subscription } from "rxjs"
import { Box3, BoxBufferGeometry, Color, EdgesGeometry, Group, LineBasicMaterial, Matrix4, Vector3 } from "three"
import { ErrorMessage } from "../../../error-message"
import { domainContext, useBaseStore, useBaseStoreState } from "../../../global"
import { panoramas } from "../global"
import { Background } from "./background"
import { ViewerCamera } from "./camera"
import { PrimitiveMap, useViewerState } from "./state"
import { ViewControls } from "./view-controls"
import { Control } from "./control"
import { ImageIcon } from "../../../icons/image"
import { BackIcon } from "../../../icons/back"
import { SpeedSelection } from "../../../gui/speed-selection"
import { MultiSelectIcon } from "../../../icons/multi-select"
import { ArrowLeftUp } from "../../../icons/arrow-left-up"

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

    return (
        <div {...rest} className={`${className} overflow-hidden position-relative`}>
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
                    <Result />
                    <SelectedPrimitives />
                    <Panoramas />
                    <Background />
                </Bridge>
            </Canvas>
            <div style={{ bottom: "1rem", left: "1rem" }} className="d-flex flex-row position-absolute">
                <MultiSelectButton className="me-2" />
                <ParentSelectButton className="me-2" />
                <BackgroundToggle className="me-2" />
                <BackButton className="me-2" />
                <SpeedSelection className="me-2" />
                <ShowError />
            </div>
            {children}
        </div>
    )
}

function ShowError() {
    const error = useViewerState((state) => state.error)
    if (error == null) {
        return null
    }
    return <ErrorMessage message={error} align="left" />
}

function useInterpretation(ref: RefObject<ReactNode & Group>) {
    const store = useBaseStore()
    useEffect(() => {
        let subscription: Subscription | undefined

        const afterStepSubject = new Subject<{ steps: HierarchicalParsedSteps; index: FullIndex }>()
        const beforeIndicesMap = new Map<ParsedSteps, Array<string>>()

        let unsubscribeAfterStep: Subscription | undefined

        const unsubscribeGrammar = store.subscribe(
            (state) => (state.type === "gui" ? state.grammar : undefined),
            (grammar) => {
                if (ref.current == null) {
                    return
                }
                ref.current.remove(...ref.current.children)
                useViewerState.getState().clearPrimitives()

                subscription?.unsubscribe()
                subscription = undefined

                unsubscribeAfterStep?.unsubscribe()
                unsubscribeAfterStep = undefined

                beforeIndicesMap.clear()

                if (grammar == null) {
                    return
                }
                unsubscribeAfterStep = afterStepSubject
                    .pipe(debounceBufferTime(300))
                    .subscribe((entries) => store.getState().editIndices(entries, true))
                try {
                    subscription = applyToObject3D(
                        of(point).pipe(
                            toValue(),
                            interprete<Primitive, Annotation, HierarchicalInfo>(grammar, operations, {
                                delay: store.getState().interpretationDelay,
                                //TODO: we need a possibility to know when a value is removed
                                annotateAfterStep: (value, steps) => {
                                    const afterIndex = value.index.join(",")

                                    const beforeIndices = beforeIndicesMap.get(steps)
                                    const beforeIndex = beforeIndices?.find((beforeIndex) =>
                                        afterIndex.startsWith(beforeIndex)
                                    )
                                    if (beforeIndex != null) {
                                        afterStepSubject.next({
                                            steps,
                                            index: { after: afterIndex, before: beforeIndex },
                                        })
                                    }
                                    if (value.raw instanceof Primitive) {
                                        useViewerState.getState().addPrimitive(afterIndex, value.raw)
                                    }
                                    return getAnnotationAfterStep(value, steps)
                                },
                                annotateBeforeStep: (value, steps) => {
                                    let beforeIndices = beforeIndicesMap.get(steps)
                                    if (beforeIndices == null) {
                                        beforeIndices = []
                                        beforeIndicesMap.set(steps, beforeIndices)
                                    }
                                    beforeIndices.push(value.index.join(","))
                                    return getAnnotationBeforeStep(value, steps)
                                },
                            })
                        ),
                        ref.current,
                        (value) => {
                            const child = value.raw.getObject()
                            if (value.annotation != null) {
                                const afterIndex = value.index.join(",")
                                const beforeIndices = beforeIndicesMap.get(value.annotation)
                                const beforeIndex = beforeIndices?.find((beforeIndex) =>
                                    afterIndex.startsWith(beforeIndex)
                                )
                                if (beforeIndex != null) {
                                    const index: FullIndex = {
                                        after: afterIndex,
                                        before: beforeIndex,
                                    }
                                    child.traverse((o) => {
                                        o.userData.steps = value.annotation
                                        o.userData.index = index
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
            },
            {
                fireImmediately: true,
            }
        )
        return () => {
            unsubscribeGrammar()
            subscription?.unsubscribe()
            unsubscribeAfterStep?.unsubscribe()
        }
    }, [store])
}

function Result() {
    const groupRef = useRef<ReactNode & Group>(null)
    useInterpretation(groupRef)
    const store = useBaseStore()
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
                const index = object.userData.index
                if (steps == null || index == null) {
                    return
                }
                store.getState().onStartHover(steps, [index])
            }}
            onPointerOut={(e) => {
                e.stopPropagation()
                const object = e.object
                const steps = object.userData.steps
                const index = object.userData.index
                if (steps == null || index == null) {
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
                const index = object.userData.index
                if (steps == null || index == null) {
                    return
                }
                store.getState().selectResult(steps, index)
            }}
        />
    )
}

function Panoramas() {
    return (
        <>
            {panoramas.map(({ position }, index) => (
                <Sphere
                    key={index}
                    position={position}
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

function SelectedPrimitives() {
    const store = useBaseStore()
    const [primitives, setPrimitives] = useState<Array<Primitive>>([])
    useEffect(() => {
        let selectionsAfterIndices: Array<string> | undefined
        let hoveredAfterIndices: Array<string> | undefined
        let primitiveMap: PrimitiveMap | undefined
        const updatePrimitives = () => {
            if (selectionsAfterIndices == null || primitiveMap == null) {
                return
            }
            const current = getHighlightedPrimitives(hoveredAfterIndices, selectionsAfterIndices, primitiveMap)
            startTransition(() => setPrimitives((prev) => (shallowEqual(prev, current) ? prev : current)))
        }
        const unsubscribeSelectionsList = store.subscribe(
            (state) => (state.type === "gui" ? state.selectionsList : undefined),
            (list) => {
                selectionsAfterIndices = list?.reduce<Array<string>>(
                    (prev, selections) => prev.concat(selections.indices.map((index) => index.after)),
                    []
                )
                updatePrimitives()
            },
            { fireImmediately: true }
        )
        const unsubscribeHovered = store.subscribe(
            (state) => (state.type === "gui" ? state.hovered : undefined),
            (h) => {
                hoveredAfterIndices = h?.indices.map((index) => index.after)
                updatePrimitives()
            },
            { fireImmediately: true }
        )
        const unsubscribeMap = useViewerState.subscribe(
            (state) => state.primitiveMap,
            (map) => {
                primitiveMap = map
                updatePrimitives()
            },
            { fireImmediately: true }
        )
        return () => {
            unsubscribeSelectionsList()
            unsubscribeMap()
            unsubscribeHovered()
        }
    }, [store])
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

function ParentSelectButton({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const control = store((s) => (s.type === "gui" ? s.control : false))
    return (
        <div
            {...rest}
            onPointerDown={() => store.getState().setControl(true)}
            onPointerUp={() => store.getState().setControl(false)}
            className={`${className} d-flex align-items-center justify-content-center btn ${
                control ? "btn-primary" : "btn-secondary"
            } btn-sm `}>
            <ArrowLeftUp />
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

function getHighlightedPrimitives(
    hoveredAfterIndices: Array<string> | undefined,
    selectionsAfterIndices: Array<string> | undefined,
    primitiveMap: PrimitiveMap | undefined
): Array<Primitive> {
    if (selectionsAfterIndices == null || primitiveMap == null) {
        return []
    }
    const highlightAfterIndicies =
        hoveredAfterIndices == null
            ? selectionsAfterIndices
            : Array.from(new Set(selectionsAfterIndices.concat(hoveredAfterIndices)))
    const map = primitiveMap
    return highlightAfterIndicies.map((afterIndex) => map[afterIndex]).filter((value) => value != null)
}
