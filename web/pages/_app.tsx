import "../styles/index.scss"
import type { AppProps /*, AppContext */ } from "next/app"
import React, { PropsWithChildren } from "react"

export default function App({ Component, pageProps }: AppProps<PropsWithChildren<any>>) {
    return (
        <>
            <meta
                name="viewport"
                content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
            />
            <Component {...pageProps} />
        </>
    )
}
