import { RefObject, useState, useEffect, HTMLProps } from "react"
import { EnterFullscreenIcon } from "../../icons/enter-fullscreen"
import { ExitFullscreen } from "../../icons/exit-fullscreen"

export function FullscreenToggle({
    rootRef,
    className,
    ...rest
}: HTMLProps<HTMLDivElement> & { rootRef: RefObject<HTMLDivElement> }) {
    const [active, setActive] = useState(false)
    useEffect(() => {
        const listener = () =>
            setActive((document.fullscreenElement ?? (document as any).webkitFullscreenElement) === rootRef.current)
        document.addEventListener("fullscreenchange", listener)
        document.addEventListener("webkitfullscreenchange", listener)
        return () => {
            document.removeEventListener("fullscreenchange", listener)
            document.removeEventListener("webkitfullscreenchange", listener)
        }
    }, [])
    return (
        <div
            {...rest}
            onClick={() => (active ? exit() : enter(rootRef.current))}
            className={`${className} d-flex align-items-center justify-content-center btn ${
                active ? "btn-primary" : "btn-secondary"
            } btn-sm `}>
            {active ? <ExitFullscreen /> : <EnterFullscreenIcon />}
        </div>
    )
}

function exit() {
    if ("exitFullscreen" in document) {
        document.exitFullscreen()
    }
    if ("webkitExitFullscreen" in document) {
        ;(document as any).webkitExitFullscreen()
    }
}

function enter(element: HTMLDivElement | null) {
    if (element == null) {
        return
    }
    if ("requestFullscreen" in element) {
        element.requestFullscreen()
    }
    if ("webkitRequestFullscreen" in element) {
        ;(element as any).webkitRequestFullscreen()
    }
}
