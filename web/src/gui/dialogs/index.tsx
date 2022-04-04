import { ReactNode } from "react"

export function Dialog({ children }: { children?: ReactNode | undefined }) {
    return (
        <div
            className="position-absolute d-flex flex-column align-items-center overflow-hidden"
            style={{ inset: 0, zIndex: 2, background: "rgba(0,0,0,0.3)" }}>
            <div
                style={{ maxWidth: "40rem", margin: "0 auto" }}
                className="rounded overflow-hidden shadow d-flex flex-column m-3 p-3 w-100 bg-light">
                {children}
            </div>
        </div>
    )
}

export * from "./create-noun"
export * from "./create-step"
