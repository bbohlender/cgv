import Head from "next/head"
import React, { useMemo, useState } from "react"
import { parse, addOne, derive } from "cgv"

const arithmeticOperations = {
    addOne,
}

export default function Index() {
    const [text, setText] = useState("")
    const [result, error] = useMemo(() => {
        try {
            const values = derive(0, parse(text), arithmeticOperations)
            return [JSON.stringify(values), undefined]
        } catch (error: any) {
            console.error(error.stack)
            return [undefined, error.message]
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
                <div style={{ whiteSpace: "pre-line" }} className="p-3 flex-basis-0 flex-grow-1 bg-white h3 mb-0">
                    {result}
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
