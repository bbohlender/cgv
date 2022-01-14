import Head from "next/head"
import React, { Dispatch, SetStateAction, Suspense, useEffect, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { AttributeInput } from "../src/attribute"
import { InstanceParameters, Instance } from "cgv/domains/shape"
import { Scene } from "../src/scene"
import { useResult } from "../src/result"

export default function Index() {
    const [text, setText] = useState("")
    const [parameters, setParameters] = useState<InstanceParameters>({})
    const [selectedInstance, setSelectedInstance] = useState<Instance | undefined>(undefined)

    const [result, base, error] = useResult(parameters, text)

    return (
        <>
            <Head>
                <title>CGV | Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
                <div
                    style={{ whiteSpace: "pre-line" }}
                    className="flex-basis-0 d-flex flex-column flex-grow-1 bg-white h3 mb-0">
                    <div className="flex-basis-0 flex-grow-1 overflow-hidden position-relative">
                        <Canvas>
                            <OrbitControls />
                            <gridHelper />
                            <pointLight position={[3, 3, 3]} />
                            <ambientLight />
                            {result != null && (
                                <Suspense fallback={null}>
                                    <Scene
                                        setSelectedInstance={setSelectedInstance}
                                        selectedInstance={selectedInstance}
                                        instances={result}
                                    />
                                </Suspense>
                            )}
                        </Canvas>
                        <button
                            className="btn btn-primary"
                            onClick={() => setParameters({ ...parameters })}
                            style={{ position: "absolute", right: "1rem", bottom: "1rem" }}>
                            Regenerate
                        </button>
                    </div>
                    <div
                        className="overflow-auto mb-0 border-top flex-basis-0 h5 bg-light flex-grow-1"
                        style={{ whiteSpace: "pre-line", maxHeight: 300, height: 300 }}>
                        {base != null && (
                            <Explorer
                                selectedInstance={selectedInstance}
                                setSelectedInstance={setSelectedInstance}
                                parameters={parameters}
                                setParameters={setParameters}
                                base={base}
                            />
                        )}
                    </div>
                </div>
                <div className="d-flex flex-column flex-basis-0 flex-grow-1">
                    <textarea
                        style={{ resize: "none", outline: 0 }}
                        value={text}
                        spellCheck={false}
                        onChange={(e) => setText(e.target.value)}
                        className="overflow-auto p-3 flex-basis-0 h3 mb-0 text-light border-0 bg-dark flex-grow-1"
                    />
                    <div
                        className="overflow-auto p-3 flex-basis-0 h3 mb-0 bg-black flex-grow-1"
                        style={{ whiteSpace: "pre-line", maxHeight: 300 }}>
                        {error == null ? (
                            result == null ? (
                                <span className="text-primary">loading ...</span>
                            ) : (
                                <span className="text-success">ok</span>
                            )
                        ) : (
                            <span className="text-danger">{error}</span>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

function Explorer({
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
}
