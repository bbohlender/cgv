import Head from "next/head"
import React from "react"
import { Editor } from "../src/editor"
import { ShapeDomainProvider } from "../src/domains/shape/global"

export default function Index() {
    return (
        <>
            <Head>
                <title>CGV | Shape Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <ShapeDomainProvider>
                <Editor />
            </ShapeDomainProvider>
        </>
    )
}
