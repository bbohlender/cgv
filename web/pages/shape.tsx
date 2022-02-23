import { InterpretionValue, Matrix } from "cgv"
import { createPhongMaterialGenerator, Instance, operations, PointPrimitive } from "cgv/domains/shape"
import Head from "next/head"
import React, { useState } from "react"
import { Observable, of } from "rxjs"
import { Color, Matrix4 } from "three"
import { ShapeEditor } from "../src/shape-editor"
import { TextEditor } from "../src/text-editor"
import { useInterpretion } from "../src/use-interpretion"

const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

const input: Observable<Matrix<InterpretionValue<Instance>>> = of({
    value: {
        attributes: {},
        primitive: new PointPrimitive(new Matrix4(), redMaterialGenerator),
    },
    eventDepthMap: {},
    parameters: {},
    terminated: false,
})

export default function Index() {
    const [text, setText] = useState("")

    const [matrix, error] = useInterpretion(text, input, operations)

    return (
        <>
            <Head>
                <title>CGV | Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
                <ShapeEditor matrix={matrix} />
                <div className="d-flex flex-column flex-basis-0 flex-grow-1">
                    <TextEditor text={text} setText={setText} />
                    <div
                        className="overflow-auto p-3 flex-basis-0 h3 mb-0 bg-black flex-grow-1"
                        style={{ whiteSpace: "pre-line", maxHeight: 300 }}>
                        {error == null ? (
                            matrix == null ? (
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
