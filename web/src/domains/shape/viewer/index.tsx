import { Sphere, useContextBridge } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { HierarchicalParsedSteps, interprete, ParsedSteps, toValue, Value } from "cgv"
import { createPhongMaterialGenerator, operations, PointPrimitive, Primitive, toObject3D } from "cgv/domains/shape"
import { HTMLProps, useEffect, useState } from "react"
import { of } from "rxjs"
import { Color, Matrix4, Object3D } from "three"
import { ErrorMessage } from "../../../error-message"
import { domainContext, useBaseStore, useBaseStoreState } from "../../../global"
import { panoramas } from "../global"
import { Background } from "./background"
import { ViewerCamera } from "./camera"
import { useViewerState } from "./state"
import { Controls } from "./controls"
import { Control } from "./control"
import { Dispatch, SetStateAction } from "react"
import { ImageIcon } from "../../../icons/image"
import { BackIcon } from "../../../icons/back"

export type Annotation = Array<ParsedSteps>

function annotateBeforeStep(value: Value<Primitive, Annotation>, step: ParsedSteps): Annotation {
    return [...value.annotation, step]
}

function combineAnnotations(values: ReadonlyArray<Value<Primitive, Annotation>>): Annotation {
    return values.reduce<Annotation>((prev, value) => prev.concat(value.annotation), [])
}
const point = new PointPrimitive(new Matrix4(), createPhongMaterialGenerator(new Color(0xff0000)))

export function Viewer({ className, children, ...rest }: HTMLProps<HTMLDivElement>) {
    const grammar = useBaseStoreState((state) => (state.type === "gui" ? state.grammar : undefined))
    const [[object, error], setState] = useState<[Object3D | undefined, string | undefined]>([undefined, undefined])
    const [showBackground, setShowBackground] = useState(false)

    useEffect(() => {
        if (grammar == null) {
            return
        }
        try {
            const subscription = of(point)
                .pipe(
                    toValue([]),
                    interprete<Primitive, Annotation>(grammar, operations, {
                        combineAnnotations,
                        annotateBeforeStep,
                    }),
                    toObject3D((value) => {
                        const child = value.raw.getObject()
                        child.traverse((o) => (o.userData = value.annotation))
                        return child
                    })
                )
                .subscribe({
                    next: (object) => setState([object, undefined]),
                    error: (error) => {
                        console.error(error)
                        setState([undefined, error.message])
                    },
                })
            return () => subscription.unsubscribe()
        } catch (error: any) {
            setState([undefined, error.message])
        }
    }, [grammar])

    const store = useBaseStore()

    const Bridge = useContextBridge(domainContext)

    return (
        <div {...rest} className={`${className} overflow-hidden position-relative`}>
            <Canvas
                style={{
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                }}
                onPointerMissed={() => console.log("clock")}
                dpr={global.window == null ? 1 : window.devicePixelRatio}>
                <Bridge>
                    <ViewerCamera />
                    <Control />
                    <Controls />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 10]} intensity={0.5} />
                    {object != null && (
                        <group
                            onPointerLeave={(e) =>
                                store.getState().onEndHover(e.object.userData[e.object.userData.length - 1])
                            }
                            onPointerEnter={(e) =>
                                store.getState().onStartHover(e.object.userData[e.object.userData.length - 1])
                            }
                            onClick={(e) => {
                                console.log("y")
                                const state = store.getState()
                                if (state.type != "gui") {
                                    return
                                }
                                if (state.requested != null) {
                                    return
                                }
                                const steps = e.object.userData as Array<HierarchicalParsedSteps>
                                const selectedIndex = steps.indexOf(state.selected as any)
                                const nextSelectIndex =
                                    selectedIndex === -1
                                        ? steps.length - 1
                                        : (selectedIndex - 1 + steps.length) % steps.length
                                state.select(steps[nextSelectIndex])
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
