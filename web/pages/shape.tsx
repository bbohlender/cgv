import Head from "next/head"
import React from "react"
import { DomainProvider } from "../src/global"
import { operationGuiMap, Viewer } from "../src/domains/shape"
import { Editor } from "../src/editor"
import { operations } from "cgv/domains/shape"

export default function Index() {
    return (
        <>
            <Head>
                <title>CGV | Shape Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <DomainProvider operations={operations} Viewer={Viewer} operationGuiMap={operationGuiMap}>
                <Editor />
            </DomainProvider>
        </>
    )
}
