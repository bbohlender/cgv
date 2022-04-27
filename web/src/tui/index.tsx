import { HTMLProps } from "react"
import { useBaseStoreState } from "../global"
import { Grammar } from "./grammar"
import { TextEditor } from "./text-editor"

export function TUI({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const selectedDescription = useBaseStoreState((state) => state.selectedDescription)

    if (selectedDescription == null) {
        return (
            <div {...rest} className={`${className} d-flex align-items-center justify-content-center`}>
                <span>Nothing Selected</span>
            </div>
        )
    }

    return (
        <>
            <TextEditor {...rest} className={className} />
            <Grammar {...rest} className={className} selectedDescription={selectedDescription} />
        </>
    )
}

export * from "./grammar"
export * from "./text-editor"
