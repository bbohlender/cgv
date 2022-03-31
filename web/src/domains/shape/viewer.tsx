import { MapControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { interprete, ParsedSteps, toValue, Value } from "cgv"
import { createPhongMaterialGenerator, operations, PointPrimitive, Primitive, toObject3D } from "cgv/domains/shape"
import { HTMLProps, useEffect, useState } from "react"
import { EMPTY, of, tap } from "rxjs"
import { Color, Matrix4, Object3D } from "three"
import { useStore, useStoreState } from "../../global"

export type Annotation = Array<ParsedSteps>

function annotateBeforeStep(value: Value<Primitive, Annotation>, step: ParsedSteps): Annotation {
    return [...value.annotation, step]
}

function combineAnnotations(values: ReadonlyArray<Value<Primitive, Annotation>>): Annotation {
    return values.reduce<Annotation>((prev, value) => prev.concat(value.annotation), [])
}
const point = new PointPrimitive(new Matrix4(), createPhongMaterialGenerator(new Color(0xff0000)))

export function Viewer({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const grammar = useStoreState(({ grammar }) => grammar)
    const [[object, error], setState] = useState<[Object3D | undefined, string | undefined]>([undefined, undefined])

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

    const store = useStore()

    return (
        <div {...rest} className={`${className} d-flex flex-column`}>
            <div className="flex-basis-0 flex-grow-1 overflow-hidden position-relative">
                <Canvas>
                    <MapControls />
                    <gridHelper />
                    <pointLight position={[3, 3, 3]} />
                    <ambientLight />
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
                </Canvas>
            </div>
            <div
                className="overflow-auto mb-0 border-top flex-basis-0 h5 bg-light flex-grow-1"
                style={{ whiteSpace: "pre-line", maxHeight: 100, height: 300 }}>
                {error == null ? (
                    object == null ? (
                        <div className="text-primary p-3">waiting ...</div>
                    ) : (
                        <div className="text-success p-3">ok</div>
                    )
                ) : (
                    <div className="text-danger p-3">{error}</div>
                )}
                {/*error != null && (
                    <Explorer
                        selectedInstance={selectedInstance}
                        setSelectedInstance={setSelectedInstance}
                        parameters={parameterSubjects}
                        setParameters={setParameters}
                        base={error}
                    />
                )*/}
            </div>
        </div>
    )
}
