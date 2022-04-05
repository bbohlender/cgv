import Head from "next/head"
import React from "react"
import { DomainProvider } from "../src/global"
//import { operationGuiMap, Viewer } from "../src/domains/arithmetic"
import { Editor } from "../src/editor"
import { operations } from "cgv/domains/arithmetic"

export default function Index() {
    return (
        <>
            <Head>
                <title>CGV | Arithmetic Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            {/*<DomainProvider operations={operations} Viewer={Viewer} operationGuiMap={operationGuiMap}>
                <Editor />
    </DomainProvider>*/}
        </>
    )
}
