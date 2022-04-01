import { MapControls, Sphere, useContextBridge } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { interprete, ParsedSteps, toValue, Value } from "cgv"
import { createPhongMaterialGenerator, operations, PointPrimitive, Primitive, toObject3D } from "cgv/domains/shape"
import { HTMLProps, useEffect, useState } from "react"
import { EMPTY, of, tap } from "rxjs"
import { Color, Matrix4, Object3D } from "three"
import { ErrorMessage } from "../../../error-message"
import { domainContext, useBaseStore, useBaseStoreState } from "../../../global"
import { panoramas, useShapeStore, useShapeStoreState } from "../global"
import { Background } from "./background"
import { topPosition, ViewerCamera } from "./camera"
import { PanoramaControls } from "./panorama-controls"
import { TopDownControls } from "./top-down-controls"
import { getCurrentViewState } from "./viewer-state"

export type Annotation = Array<ParsedSteps>

function annotateBeforeStep(value: Value<Primitive, Annotation>, step: ParsedSteps): Annotation {
    return [...value.annotation, step]
}

function combineAnnotations(values: ReadonlyArray<Value<Primitive, Annotation>>): Annotation {
    return values.reduce<Annotation>((prev, value) => prev.concat(value.annotation), [])
}
const point = new PointPrimitive(new Matrix4(), createPhongMaterialGenerator(new Color(0xff0000)))

export function Viewer({ className, children, ...rest }: HTMLProps<HTMLDivElement>) {
    const viewType = useShapeStoreState((state) => getCurrentViewState(state).type)
    const grammar = useBaseStoreState(({ grammar }) => grammar)
    const [[object, error], setState] = useState<[Object3D | undefined, string | undefined]>([undefined, undefined])
    const [showBackground, setShowBackground] = useState(false)

    useEffect(() => {
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

    const store = useShapeStore()

    const Bridge = useContextBridge(domainContext)

    return (
        <div {...rest} className={`${className} overflow-hidden position-relative`}>
            <Canvas>
                <Bridge>
                    <ViewerCamera showBackground={showBackground} />
                    {viewType === "2d" ? <TopDownControls /> : <PanoramaControls />}
                    <gridHelper />
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
                            onClick={(e) => store.getState().select(e.object.userData[e.object.userData.length - 1])}
                            scale={0.01}>
                            <primitive object={object} />
                        </group>
                    )}
                    {panoramas.map(({ position }, index) => (
                        <Sphere
                            key={index}
                            position={position}
                            onClick={(e) => {
                                e.stopPropagation()
                                store.getState().changePanoramaView({
                                    panoramaIndex: index,
                                    type: "3d",
                                })
                            }}
                            args={[0.3]}>
                            <meshBasicMaterial color={0x0000ff} />
                        </Sphere>
                    ))}
                </Bridge>
            </Canvas>
            {viewType === "3d" && (
                <div
                    className="btn btn-primary"
                    style={{ position: "absolute", bottom: "1rem", right: "1rem" }}
                    onClick={() => store.getState().changeView({ type: "2d", position: topPosition })}>
                    Top View
                </div>
            )}
            <div
                className="btn btn-primary"
                style={{ position: "absolute", bottom: "1rem", left: "50%", transform: "translate(-50%, 0)" }}
                onClick={() => setShowBackground((show) => !show)}>
                {showBackground ? "Hide" : "Show"} Background
            </div>
            {error != null && (
                <ErrorMessage
                    message={error}
                    align="left"
                    style={{ position: "absolute", left: "1rem", bottom: "1rem" }}
                />
            )}
            {children}
        </div>
    )
}
