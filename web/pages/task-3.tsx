import Head from "next/head"
import React, { useState } from "react"
import { Observable, of } from "rxjs"
import { useInterpretion } from "../src/use-interpretion"
import { ShapeEditor } from "../src/shape-editor"
import { Instance, operations } from "cgv/domains/shape"
import { Color, Matrix4, Shape, Vector2 } from "three"
import { createMatrixFromArray, InterpretionValue, Matrix } from "cgv"
import { FacePrimitive, createPhongMaterialGenerator } from "cgv/domains/shape/primitive"

const blocksLotsVertecies: Array<Array<Array<Vector2>>> = [
    [
        [new Vector2(100, 900), new Vector2(-200, 900), new Vector2(-500, 400), new Vector2(100, 300)],
        [new Vector2(200, 100), new Vector2(-200, 200), new Vector2(-300, -200), new Vector2(200, -300)],
        [new Vector2(700, 300), new Vector2(300, 200), new Vector2(300, -200), new Vector2(800, -300)],
        [new Vector2(700, 900), new Vector2(300, 800), new Vector2(200, 400), new Vector2(700, 400)],
    ],
    [
        [new Vector2(-800, -900), new Vector2(-700, -900), new Vector2(-500, -500), new Vector2(-900, -500)],
        [new Vector2(-1200, -200), new Vector2(-900, -300), new Vector2(-900, 100), new Vector2(-1100, 200)],
        [new Vector2(-800, -200), new Vector2(-500, -300), new Vector2(-400, 300), new Vector2(-800, 200)],
        [new Vector2(-900, 400), new Vector2(-600, 400), new Vector2(-400, 900), new Vector2(-800, 800)],
    ],
]

const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

const lots: Observable<Matrix<InterpretionValue<Instance>>> = of(
    createMatrixFromArray(
        blocksLotsVertecies.map((lotsVertecies, blockId) =>
            createMatrixFromArray(
                lotsVertecies.map((vertecies, i) => ({
                    terminated: false,
                    eventDepthMap: {},
                    parameters: {
                        blockId: of(blockId),
                    },
                    value: {
                        path: [blockId, i],
                        attributes: {},
                        primitive: new FacePrimitive(new Matrix4(), new Shape(vertecies), redMaterialGenerator),
                    },
                })),
                lotsVertecies.length
            )
        ),
        blocksLotsVertecies.length
    )
)

export default function Index() {
    const [text, setText] = useState("")

    const [changes, error] = useInterpretion(text, lots, operations)

    return (
        <>
            <Head>
                <title>CGV | Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
                <ShapeEditor matrix={changes} />
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
                            changes == null ? (
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
