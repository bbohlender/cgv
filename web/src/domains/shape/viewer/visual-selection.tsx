import { HTMLProps, useState } from "react"
import { ImageIcon } from "../../../icons/image"
import { useViewerState } from "./state"

export function VisualSelection({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const [open, setOpen] = useState(false)
    const interpretationDelay = useViewerState((state) => state.visualType)
    return (
        <div {...rest} className={`${className} d-flex flex-column align-items-center`}>
            {open && (
                <div
                    style={{
                        bottom: 45,
                    }}
                    className="rounded bg-light text-dark flex-row align-items-center px-2 border d-flex rounded position-absolute text-light">
                    +
                    <input
                        style={{
                            minWidth: 50,
                        }}
                        type="range"
                        value={interpretationDelay}
                        className="mb-0 mx-2 form-range"
                        onChange={(e) => useViewerState.getState().setVisualType(e.target.valueAsNumber)}
                        min={0}
                        step={0.01}
                        max={1}
                    />
                    -
                </div>
            )}
            <div
                onClick={() => setOpen((open) => !open)}
                className={`btn btn-sm ${open ? "btn-primary" : "btn-secondary"} d-flex align-items-center`}>
                <ImageIcon />
            </div>
        </div>
    )
}
