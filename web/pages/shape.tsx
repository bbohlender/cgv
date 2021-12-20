import Head from "next/head"
import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react"
import { parse, derive } from "cgv"

import {
    connect,
    points,
    faces,
    lines,
    union3d,
    subtract3d,
    intersect3d,
    translate,
    rotate,
    scale,
    sample2d,
    getRoot,
    Instance,
    attribute,
    InstanceParameters,
} from "cgv/domains/shape"

import { PointPrimitive } from "co-3gen"
import { Matrix4 } from "three"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { AttributeInput } from "../components/attribute"

const shapeOperations = {
    connect,
    points,
    faces,
    lines,
    union3d,
    subtract3d,
    intersect3d,
    translate,
    rotate,
    scale,
    sample2d,
    attribute,
}

export default function Index() {
    const [text, setText] = useState("")
    const [parameters, setParameters] = useState<InstanceParameters>({})

    const [result, error] = useMemo(() => {
        try {
            const values = derive(
                [
                    {
                        attributes: {},
                        parameters,
                        children: [],
                        id: "root",
                        primitive: new PointPrimitive(new Matrix4()),
                    },
                ],
                parse(text),
                shapeOperations,
                (instance, i) => {
                    const child = {
                        parent: instance,
                        id: `${instance.id}/${i}`,
                        attributes: instance.attributes,
                        parameters: instance.parameters,
                        primitive: instance.primitive.clone(),
                        children: [],
                    }
                    instance.children.push(child)
                    return child
                }
            )
            return [values, undefined]
        } catch (error: any) {
            return [undefined, error.message]
        }
    }, [text, parameters])
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
                            {result?.map((instance, i) => (
                                <primitive key={i} object={instance.primitive.getObject3D(true)} />
                            ))}
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
                        {result && result.length > 0 && (
                            <Explorer parameters={parameters} setParameters={setParameters} result={result} />
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
                            <span className="text-success">ok</span>
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
    result,
    setParameters,
    parameters,
}: {
    result: Array<Instance>
    setParameters: Dispatch<SetStateAction<InstanceParameters>>
    parameters: InstanceParameters
}) {
    const [selectedInstance, setSelectedInstance] = useState<undefined | Instance>()
    const root = useMemo(() => getRoot(result), [result])
    return (
        <div className="d-flex h-100 flex-row">
            <div className="flex-basis-0 p-3 flex-grow-1 d-flex flex-column">
                <ExplorerItem selectedInstance={selectedInstance} select={setSelectedInstance} instance={root} />
            </div>
            {selectedInstance == null ? (
                <div className="p-3 border-start flex-basis-0 flex-grow-1 d-flex align-items-center justify-content-center">
                    No Instance Selected
                </div>
            ) : (
                <div className="border-start flex-basis-0 flex-grow-1 d-flex flex-column">
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
    useEffect(() => {
        if (selectedInstance?.id === instance.id && selectedInstance != instance) {
            select(instance)
        }
    }, [selectedInstance, instance])
    return (
        <>
            <span onClick={() => select(instance)} className="mt-1 p-1 pointer">
                {instance.id}
            </span>
            <div className="ms-3 d-flex flex-column">
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
