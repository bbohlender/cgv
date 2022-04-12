import { Sphere, useContextBridge } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import {
    interprete,
    ParsedSteps,
    toValue,
    Value,
    Selections,
    HierarchicalParsedSteps,
    HierarchicalInfo,
    HierarchicalPath,
} from "cgv"
import { createPhongMaterialGenerator, operations, PointPrimitive, Primitive, toObject3D } from "cgv/domains/shape"
import { HTMLProps, useEffect, useState, startTransition } from "react"
import { of, Subscription } from "rxjs"
import { Box3, BoxBufferGeometry, Color, EdgesGeometry, LineBasicMaterial, Matrix4, Object3D, Vector3 } from "three"
import { ErrorMessage } from "../../../error-message"
import { domainContext, useBaseStore } from "../../../global"
import { panoramas } from "../global"
import { Background } from "./background"
import { ViewerCamera } from "./camera"
import { useViewerState } from "./state"
import { ViewControls } from "./view-controls"
import { Control } from "./control"
import { Dispatch, SetStateAction } from "react"
import { ImageIcon } from "../../../icons/image"
import { BackIcon } from "../../../icons/back"

export type Annotation = HierarchicalParsedSteps | undefined

function annotateAfterStep(value: Value<Primitive, Annotation>, step: HierarchicalParsedSteps): Annotation {
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

function annotateBeforeStep(value: Value<Primitive, Annotation>, step: HierarchicalParsedSteps): Annotation {
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

const boundingBoxGeometry = new EdgesGeometry(new BoxBufferGeometry())
const boundingBoxMaterial = new LineBasicMaterial({ color: "#f00" })

type BoxMap = Map<ParsedSteps, Map<string, Box3>>

const point = new PointPrimitive(new Matrix4(), createPhongMaterialGenerator(new Color(0xff0000)))

export function Viewer({ className, children, ...rest }: HTMLProps<HTMLDivElement>) {
    const [selectedBoxes, setSelectedBoxes] = useState<Array<Box3>>([])
    const [[object, error], setState] = useState<[Object3D | undefined, string | undefined]>([undefined, undefined])
    const [showBackground, setShowBackground] = useState(false)
    const store = useBaseStore()

    useEffect(() => {
        //TODO: optimize / rewrite
        //TODO: disable delete step and replace when beforeIndex != afterIndex
        let subscription: Subscription | undefined
        const boxMap: BoxMap = new Map()
        const state = store.getState()
        let selections: Selections = state.type === "gui" ? state.selections : []
        const updateSelectedBoxes = () => startTransition(() => setSelectedBoxes(getSelectedBoxes(selections, boxMap)))
        const unsubscribeSelections = store.subscribe(
            (state) => (state.type === "gui" ? state.selections : []),
            (s) => {
                selections = s
                updateSelectedBoxes()
            }
        )
        const unsubscribeGrammar = store.subscribe(
            (state) => (state.type === "gui" ? state.grammar : undefined),
            (grammar) => {
                boxMap.clear()
                updateSelectedBoxes()
                subscription?.unsubscribe()
                subscription = undefined
                if (grammar == null) {
                    return
                }
                try {
                    subscription = of(point)
                        .pipe(
                            toValue(),
                            interprete<Primitive, Annotation, HierarchicalInfo>(grammar, operations, {
                                annotateAfterStep,
                                annotateBeforeStep,
                            }),
                            toObject3D(
                                (value) => {
                                    const child = value.raw.getObject()
                                    if (value.annotation != null) {
                                        //TODO: this needs to be done when annotating
                                        let boxMapEntry = boxMap.get(value.annotation)
                                        if (boxMapEntry == null) {
                                            boxMapEntry = new Map()
                                            boxMap.set(value.annotation, boxMapEntry)
                                        }
                                        boxMapEntry.set(value.index.join(","), new Box3().setFromObject(child)) //TODO: this could be better
                                        updateSelectedBoxes()
                                    }
                                    child.traverse((o) => {
                                        o.userData.annotation = value.annotation
                                        o.userData.index = value.index
                                    })
                                    return child
                                },
                                (object) => {
                                    boxMap.get(object.userData.annotation)?.delete(object.userData.index?.join(","))
                                }
                            )
                        )
                        .subscribe({
                            next: (object) => setState([object, undefined]),
                            error: (error) => {
                                console.error(error)
                                setState([undefined, error.message])
                            },
                        })
                } catch (error: any) {
                    setState([undefined, error.message])
                }
            },
            {
                fireImmediately: true,
            }
        )
        return () => {
            unsubscribeGrammar()
            unsubscribeSelections()
            subscription?.unsubscribe()
        }
    }, [store])

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
                    {selectedBoxes.map((box, i) => (
                        <lineSegments
                            key={i}
                            geometry={boundingBoxGeometry}
                            material={boundingBoxMaterial}
                            position={box.getCenter(new Vector3())}
                            scale={box.getSize(new Vector3()).add(new Vector3(0.1, 0.1, 0.1))}
                        />
                    ))}
                    {object != null && (
                        <group
                            onPointerLeave={(e) =>
                                store.getState().onEndHover(e.object.userData[e.object.userData.length - 1])
                            }
                            onPointerEnter={(e) =>
                                store.getState().onStartHover(e.object.userData[e.object.userData.length - 1])
                            }
                            onClick={(e) => {
                                const state = store.getState()
                                if (state.type != "gui") {
                                    return
                                }
                                if (state.requested != null) {
                                    return
                                }
                                const annotation = e.object.userData.annotation
                                if (annotation != null) {
                                    store.getState().select(annotation, e.object.userData.index, false)
                                }
                            }}>
                            <primitive object={object} />
                        </group>
                    )}
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
                    {showBackground && <Background />}
                </Bridge>
            </Canvas>
            <div style={{ bottom: "1rem", left: "1rem" }} className="d-flex flex-row position-absolute">
                <BackgroundToggle className="me-2" setValue={setShowBackground} value={showBackground} />
                <BackButton className="me-2" />
                {error != null && <ErrorMessage message={error} align="left" />}
            </div>
            {children}
        </div>
    )
}

function BackgroundToggle({
    setValue,
    value,
    className,
    ...rest
}: Omit<HTMLProps<HTMLDivElement>, "value"> & { value: boolean; setValue: Dispatch<SetStateAction<boolean>> }) {
    return (
        <div
            {...rest}
            onClick={() => setValue((v) => !v)}
            className={`${className} d-flex align-items-center justify-content-center btn ${
                value ? "btn-primary" : "btn-secondary"
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

function getSelectedBoxes(selections: Selections, boxMap: BoxMap): Array<Box3> {
    return selections
        .map((selection) => {
            const selectionIndices = selection.indices
            const boxMapEntry = boxMap.get(selection.steps)
            if (boxMapEntry == null) {
                return []
            }
            const boxes = Array.from(boxMapEntry)
            if (selectionIndices == null) {
                return boxes
            }
            const selectionKeys = selectionIndices.map((indexy) => indexy.join(","))
            return boxes.filter(([key]) => selectionKeys.includes(key))
        })
        .reduce((v1, v2) => v1.concat(v2), [])
        .map(([, box]) => box)
}
