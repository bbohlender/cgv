import { interprete, parse, toValue, Value } from "cgv"
import { createPhongMaterialGenerator, Primitive, operations, PointPrimitive } from "cgv/domains/shape"
import Head from "next/head"
import React, { useMemo, useState } from "react"
import { Observable, of } from "rxjs"
import { Color, Matrix4 } from "three"
import { Viewer } from "../src/shape"
import { TextEditor } from "../src/text-editor"

const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

const input: Observable<Value<Primitive, undefined>> = of<Primitive>(
    new PointPrimitive(new Matrix4(), redMaterialGenerator)
).pipe(toValue())

export default function Index() {
    const [text, setText] = useState("")

    const [value, error] = useMemo(() => {
        try {
            const grammar = parse(text)
            return [input.pipe(interprete(grammar, operations, {})), undefined] as const
        } catch (error: any) {
            return [undefined, JSON.stringify(error.message)] as const
        }
    }, [text])

    return (
        <>
            <Head>
                <title>CGV | Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
                <Viewer value={value} />
                <div className="d-flex flex-column flex-basis-0 flex-grow-1">
                    <TextEditor text={text} setText={setText} />
                    <div
                        className="overflow-auto p-3 flex-basis-0 h3 mb-0 bg-black flex-grow-1"
                        style={{ whiteSpace: "pre-line", maxHeight: 300 }}>
                        {error == null ? (
                            value == null ? (
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
