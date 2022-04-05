import { operations } from "cgv/domains/shape"
import Head from "next/head"
import React from "react"
import { createBaseState } from "../src/base-state"
import { operationGuiMap, Viewer } from "../src/domains/shape"
import { Editor } from "../src/editor"
import { DomainProvider } from "../src/global"

export default function Index() {
    return (
        <>
            <Head>
                <title>CGV | Shape Editor</title>
                <meta name="description" content=""></meta>
                <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no" />
            </Head>
            <DomainProvider
                store={createBaseState(operations)}
                Viewer={Viewer}
                operationGuiMap={operationGuiMap}
                operations={operations}>
                <Editor />
            </DomainProvider>
        </>
    )
}
