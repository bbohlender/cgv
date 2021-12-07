import Head from "next/head"
import React, { useMemo, useState } from "react"
import parse from "cgv/arithmetic"

export default function Index() {
    const [text, setText] = useState("")
    const [result, error] = useMemo(() => parse(text), [text])
    return (
        <>
            <Head>
                <title>CGV | Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
                <div className="p-3 flex-basis-0 flex-grow-1 bg-white h3 mb-0">{result}</div>
                <div className="d-flex flex-column flex-basis-0 flex-grow-1">
                    <textarea
                        style={{ resize: "none", outline: 0 }}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="overflow-auto p-3 flex-basis-0 h3 mb-0 text-light border-0 bg-dark flex-grow-1"
                    />
                    <div
                        className="overflow-auto p-3 flex-basis-0 h3 mb-0 text-danger bg-black flex-grow-1"
                        style={{ maxHeight: 300 }}>
                        {error}
                    </div>
                </div>
            </div>
        </>
    )
}
