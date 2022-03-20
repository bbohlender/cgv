import { HTMLProps } from "react"
import { useStore } from "../pages/editor"

export function GUI({ className, style, ...rest }: HTMLProps<HTMLDivElement>) {
    const selected = useStore(({ selected }) => selected)
    const unselect = useStore(({ unselect }) => unselect)
    if (selected == null) {
        return null
    }
    return (
        <div
            {...rest}
            className={`${className} w-100 d-flex flex-column m-3 px-0 py-3 position-absolute border shadow`}
            style={{ ...style, maxWidth: "16rem" }}>
            <div className="d-flex flex-column">
                <h3 className="p-0 mx-3 mb-3">{capitalize(selected.type)}</h3>
                <div className="d-flex flex-row space-between justify-content-between mx-3">
                    <button onClick={unselect} className="btn btn-sm btn-outline-primary">
                        Done
                    </button>
                    <button onClick={unselect} className="btn btn-sm btn-outline-secondary">
                        Cancel
                    </button>
                    <button onClick={unselect} className="btn btn-sm btn-outline-danger">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

function capitalize(type: string): string {
    return `${type.charAt(0).toUpperCase()}${type.substring(1)}`
}
