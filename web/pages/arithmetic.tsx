import Head from "next/head"
import React, { useEffect, useMemo, useState } from "react"
import { parse, interprete } from "cgv"
import { operations } from "cgv/domains/arithmetic"
import { of } from "rxjs"

export default function Index() {
    const [text, setText] = useState("")
    const [[result, error], setState] = useState<[string | undefined, string | undefined]>([undefined, undefined])

    useEffect(() => {
        try {
            const grammar = parse(text)
            const subscription = interprete(of([0]), grammar, operations).subscribe({
                next: (results) => setState([JSON.stringify(results), undefined]),
                error: (error) => setState([undefined, error.message])
            })
            return () => subscription.unsubscribe()
        } catch (error: any) {
            setState([undefined, error.message])
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
