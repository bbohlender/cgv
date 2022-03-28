import { MapControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { Value } from "cgv"
import { Primitive, toObject3D } from "cgv/domains/shape"
import { useEffect, useState } from "react"
import { Observable } from "rxjs"
import { Object3D } from "three"
import { useStore } from "../../pages/editor"

export function Viewer<A>({ value }: { value: Observable<Value<Primitive, A>> | undefined }) {
    const [[object, error], setState] = useState<[Object3D | undefined, string | undefined]>([undefined, undefined])
    useEffect(() => {
        if (value == null) {
            return
        }
        const subscription = value
            .pipe(
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
    }, [value])

    return (
        <div
            style={{ whiteSpace: "pre-line", top: 0, left: 0, right: 0, bottom: 0, position: "absolute" }}
            className="flex-basis-0 d-flex flex-column flex-grow-1 bg-white h3 mb-0">
            <div className="flex-basis-0 flex-grow-1 overflow-hidden position-relative">
                <Canvas>
                    <MapControls />
                    <gridHelper />
                    <pointLight position={[3, 3, 3]} />
                    <ambientLight />
                    {object != null && (
                        <group
                            onPointerLeave={(e) =>
                                useStore.getState().onEndHover(e.object.userData[e.object.userData.length - 1])
                            }
                            onPointerEnter={(e) =>
                                useStore.getState().onStartHover(e.object.userData[e.object.userData.length - 1])
                            }
                            onPointerDown={(e) =>
                                useStore.getState().select(e.object.userData[e.object.userData.length - 1], () => {})
                            }
                            scale={0.01}>
                            <primitive object={object} />
                        </group>
                    )}
                </Canvas>
            </div>
            <div
                className="overflow-auto mb-0 border-top flex-basis-0 h5 bg-light flex-grow-1"
                style={{ whiteSpace: "pre-line", maxHeight: 300, height: 300 }}>
                {error == null ? (
                    value == null ? (
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
