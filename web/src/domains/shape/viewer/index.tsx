import { Sphere, useContextBridge } from "@react-three/drei"
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
} from "cgv"
import { createPhongMaterialGenerator, operations, PointPrimitive, Primitive, applyToObject3D } from "cgv/domains/shape"
import { HTMLProps, useEffect, startTransition, useState, RefObject, ReactNode, useRef } from "react"
import { of, Subscription } from "rxjs"
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
                <BackgroundToggle className="me-2" />
                <BackButton className="me-2" />
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
        //TODO: optimize / rewrite
        //TODO: disable delete step and replace when beforeIndex != afterIndex
        let subscription: Subscription | undefined

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
                if (grammar == null) {
                    return
                }
                try {
                    subscription = applyToObject3D(
                        of(point).pipe(
                            toValue(),
                            interprete<Primitive, Annotation, HierarchicalInfo>(grammar, operations, {
                                delay: 0,
                                //TODO: we need a possibility to know when a value is removed
                                annotateAfterStep: (value, steps) => {
                                    startTransition(() => {
                                        store.getState().editIndex(steps, value.index.join(","), true)
                                        if (value.raw instanceof Primitive) {
                                            useViewerState.getState().addPrimitive(value.index.join(","), value.raw)
                                        }
                                    })
                                    return getAnnotationAfterStep(value, steps)
                                },
                                annotateBeforeStep: (value, steps) => {
                                    return getAnnotationBeforeStep(value, steps)
                                },
                            })
                        ),
                        ref.current,
                        (value) => {
                            const child = value.raw.getObject()
                            const index = value.index.join(",")
                            child.traverse((o) => {
                                o.userData.annotation = value.annotation
                                o.userData.index = index
                            })
                            return child
                        },
                        (error) => {
                            console.error(error)
                            useViewerState.getState().setError(error)
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
            onPointerLeave={(e) => {
                //e.intersections[0].object
                //store.getState().onEndHover(e.object.userData[e.object.userData.length - 1])
            }}
            onPointerEnter={(e) => {
                //e.intersections[0].object
                //store.getState().onStartHover(e.object.userData[e.object.userData.length - 1])
            }}
            onClick={(e) => {
                const state = store.getState()
                if (state.type != "gui") {
                    return
                }
                if (state.requested != null) {
                    return
                }
                const object = e.intersections[0].object
                const annotation = object.userData.annotation
                if (annotation == null) {
                    return
                }
                store
                    .getState()
                    .select(annotation, object.userData.index, e.nativeEvent.shiftKey ? "toggle" : "replace")
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
    const [selectedPrimitives, setSelected] = useState<Array<Primitive>>([])
    useEffect(() => {
        let selectionsList: SelectionsList | undefined
        let primitiveMap: PrimitiveMap | undefined
        const updateSelectedPrimitives = () => {
            if (selectionsList == null || primitiveMap == null) {
                return
            }
            const current = getSelectedPrimitives(selectionsList, primitiveMap)
            startTransition(() => setSelected((prev) => (shallowEqual(prev, current) ? prev : current)))
        }
        const unsubscribeList = store.subscribe(
            (state) => (state.type === "gui" ? state.selectionsList : undefined),
            (list) => {
                selectionsList = list
                updateSelectedPrimitives()
            },
            { fireImmediately: true }
        )
        const unsubscribeMap = useViewerState.subscribe(
            (state) => state.primitiveMap,
            (map) => {
                primitiveMap = map
                updateSelectedPrimitives()
            },
            { fireImmediately: true }
        )
        return () => {
            unsubscribeList()
            unsubscribeMap()
        }
    }, [store])
    return (
        <>
            {selectedPrimitives.map((primitive) => (
                <primitive key={primitive.getOutline().uuid} object={primitive.getOutline()} />
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

function getSelectedPrimitives(
    selectionsList: SelectionsList | undefined,
    primitiveMap: PrimitiveMap | undefined
): Array<Primitive> {
    if (selectionsList == null || primitiveMap == null) {
        return []
    }
    const map = primitiveMap
    return selectionsList
        .reduce<Array<Primitive>>(
            (prev, selections) => prev.concat(selections.indices.map((selection) => map[selection])),
            []
        )
        .filter((value) => value != null)
}
