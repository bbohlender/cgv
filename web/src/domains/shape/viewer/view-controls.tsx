import { useGesture } from "react-use-gesture"
import { useEffect } from "react"
import { useViewerState } from "./state"
import { useThree } from "@react-three/fiber"

export function ViewControls() {
    const canvas = useThree(({ gl }) => gl.domElement)
    useGesture(
        {
            onWheel: ({ first, xy: [, y], previous: [, lastY], event }) => {
                event.preventDefault()
                if (!first) {
                    useViewerState.getState().zoom(1 + (y - lastY) * 0.005)
                }
            },
            onDrag: ({ first, xy: [x, z], previous: [lastX, lastZ], buttons, event }) => {
                event.preventDefault()
                if (!first && buttons === 2) {
                    useViewerState.getState().drag((x - lastX) / canvas.clientHeight, (z - lastZ) / canvas.clientHeight)
                }
            },
            onPinch: ({ da: [distance], event, origin, memo }) => {
                event.preventDefault()
                if (memo == null) {
                    return [distance, origin]
                }
                const [lastDistance, lastOrigin] = memo
                if (lastDistance != null) {
                    useViewerState.getState().zoom(lastDistance / distance)
                }
                if (origin != null && lastOrigin != null) {
                    const [x, z] = origin
                    const [lastX, lastZ] = lastOrigin
                    useViewerState.getState().drag((x - lastX) / canvas.clientHeight, (z - lastZ) / canvas.clientHeight)
                }
                return [distance, origin]
            },
            onPointerDown: ({ buttons, event }) => {
                event.preventDefault()
                if (buttons == 2) {
                    if ("requestPointerLock" in canvas) {
                        canvas.requestPointerLock()
                    }
                }
            },
            onPointerUp: ({ event }) => {
                event.preventDefault()
                if ("exitPointerLock" in document) {
                    document.exitPointerLock()
                }
            },
        },
        {
            domTarget: canvas,
            eventOptions: {
                passive: false,
            },
        }
    )
    useEffect(() => {
        const listener = (e: MouseEvent) => e.preventDefault()
        window.addEventListener("contextmenu", listener)
        return () => window.removeEventListener("contextmenu", listener)
    }, [])
    return null
}
