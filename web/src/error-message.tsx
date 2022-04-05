import { HTMLProps, useState } from "react"
import { ErrorIcon } from "./icons/error"

export function ErrorMessage({
    align,
    message,
    className,
    ...rest
}: HTMLProps<HTMLDivElement> & { align: "right" | "left"; message: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div
            {...rest}
            className={`${className} d-flex flex-column ${align === "left" ? "align-items-start" : "align-items-end"}`}>
            {open && (
                <div
                    style={{
                        overflowY: "auto",
                        fontSize: "0.8rem",
                        overflowX: "hidden",
                        maxWidth: "20rem",
                        maxHeight: "8rem",
                        whiteSpace: "pre-line",
                    }}
                    className="rounded mb-2 p-2 bg-danger text-light">
                    {message}
                </div>
            )}
            <div onClick={() => setOpen((open) => !open)} className="btn btn-sm btn-danger d-flex align-items-center">
                <ErrorIcon />
            </div>
        </div>
    )
}
