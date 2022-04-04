import { useGesture } from "react-use-gesture"
import { useEffect } from "react"
import { useViewerState } from "./state"

export function Controls() {
    useGesture(
        {
            onWheel: ({ first, xy: [, y], previous: [, lastY] }) => {
                if (!first) {
                    useViewerState.getState().wheel((y - lastY) * 0.05)
                }
            },
            onDrag: ({ first, xy: [x, z], previous: [lastX, lastZ], buttons }) => {
                if (buttons === 2) {
                    if (!first) {
                        useViewerState
                            .getState()
                            .drag((x - lastX) / window.innerHeight, (z - lastZ) / window.innerHeight)
                    }
                }
            },
        },
        {
            domTarget: window,
        }
    )
    useEffect(() => {
        const listener = (e: MouseEvent) => e.preventDefault()
        window.addEventListener("contextmenu", listener)
        return () => window.removeEventListener("contextmenu", listener)
    }, [])
    return null
}
