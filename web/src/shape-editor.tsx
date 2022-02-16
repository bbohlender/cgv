import { MapControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { InterpretionValue, Matrix } from "cgv"
import { Instance, matrixObject3D } from "cgv/domains/shape"
import { useEffect, useState } from "react"
import { Observable } from "rxjs"
import { Object3D } from "three"

export function ShapeEditor({ matrix }: { matrix: Observable<Matrix<InterpretionValue<Instance>>> | undefined }) {
    const [[object, error], setState] = useState<[Object3D | undefined, string | undefined]>([undefined, undefined])
    useEffect(() => {
        if (matrix == null) {
            return
        }
        const subscription = matrix.pipe(matrixObject3D()).subscribe({
            next: (object) => setState([object, undefined]),
            error: (error) => setState([undefined, error.message]),
        })
        return () => subscription.unsubscribe()
    }, [matrix])
    return (
        <div
            style={{ whiteSpace: "pre-line" }}
            className="flex-basis-0 d-flex flex-column flex-grow-1 bg-white h3 mb-0">
            <div className="flex-basis-0 flex-grow-1 overflow-hidden position-relative">
                <Canvas>
                    <MapControls />
                    <gridHelper />
                    <pointLight position={[3, 3, 3]} />
                    <ambientLight />
                    <group scale={0.01}>{object != null && <primitive object={object} />}</group>
                </Canvas>
            </div>
            <div
                className="overflow-auto mb-0 border-top flex-basis-0 h5 bg-light flex-grow-1"
                style={{ whiteSpace: "pre-line", maxHeight: 300, height: 300 }}>
                {error == null ? (
                    matrix == null ? (
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

/*function Explorer({
    base,
    setParameters,
    parameters,
    selectedInstance,
    setSelectedInstance,
}: {
    base: Instance
    setParameters: Dispatch<SetStateAction<InstanceParameters>>
    parameters: InstanceParameters
    selectedInstance: Instance | undefined
    setSelectedInstance: (instance: Instance | undefined) => void
}) {
    return (
        <div className="d-flex h-100 flex-row">
            <div className="flex-basis-0 p-3 flex-grow-1 d-flex flex-column overflow-auto">
                <ExplorerItem
                    key={base.id}
                    selectedInstance={selectedInstance}
                    select={setSelectedInstance}
                    instance={base}
                />
            </div>
            {selectedInstance == null ? (
                <div className="p-3 border-start flex-basis-0 flex-grow-1 d-flex align-items-center justify-content-center">
                    No Instance Selected
                </div>
            ) : (
                <div className="border-start flex-basis-0 flex-grow-1 d-flex flex-column overflow-auto">
                    <h4 className="p-3 border-bottom">{selectedInstance.id}</h4>
                    {Object.entries(selectedInstance.attributes)
                        .filter(([, a]) => a != null)
                        .map(([name, attribute]) => (
                            <div key={name} className="d-flex flex-row p-3">
                                <h4>{name}</h4>
                                <AttributeInput
                                    attribute={attribute!}
                                    id={selectedInstance.id}
                                    name={name}
                                    parameters={parameters}
                                    setParameters={setParameters}
                                />
                            </div>
                        ))}
                </div>
            )}
        </div>
    )
}

function ExplorerItem({
    instance,
    select,
    selectedInstance,
}: {
    selectedInstance: Instance | undefined
    instance: Instance
    select: (id: Instance) => void
}) {
    const [open, setOpen] = useState(false)
    useEffect(() => {
        if (selectedInstance?.id === instance.id && selectedInstance != instance) {
            select(instance)
        }
    }, [selectedInstance, instance])
    return (
        <>
            <div className="mt-1 d-flex flex-row align-items-center">
                {instance.children.length > 0 && (
                    <span className="pointer p-1" onClick={() => setOpen(!open)}>
                        {open ? "-" : "+"}
                    </span>
                )}
                <div className="flex-grow-1 p-1 pointer">
                    <span
                        onClick={() => select(instance)}
                        className={selectedInstance === instance ? "p-1 rounded text-light bg-primary" : "p1"}>
                        {instance.id}
                    </span>
                </div>
            </div>
            <div className={`ms-3 ${open ? "d-flex" : "d-none"} flex-column`}>
                {instance.children.map((instance) => (
                    <ExplorerItem
                        key={instance.id}
                        selectedInstance={selectedInstance}
                        select={select}
                        instance={instance}
                    />
                ))}
            </div>
        </>
    )
}*/
