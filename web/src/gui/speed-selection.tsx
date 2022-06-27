import { HTMLProps, useState } from "react"
import { useBaseStore } from "../global"
import { SpeedIcon } from "../icons/speed"

export function SpeedSelection({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const [open, setOpen] = useState(false)
    const store = useBaseStore()
    const interpretationDelay = store((state) => state.interpretationDelay)
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
                        onChange={(e) => store.getState().setInterpretationDelay(e.target.valueAsNumber)}
                        min={0}
                        max={200}
                    />
                    -
                </div>
            )}
            <div
                onClick={() => setOpen((open) => !open)}
                className={`btn btn-sm ${open ? "btn-primary" : "btn-secondary"} d-flex align-items-center`}>
                <SpeedIcon />
            </div>
        </div>
    )
}
