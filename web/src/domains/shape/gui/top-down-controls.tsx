import { useGesture } from "react-use-gesture"
import { useEffect } from "react"
import { useShapeStore } from "../global"

export function TopDownControls() {
    const store = useShapeStore()
    useGesture(
        {
            onWheel: ({ first, xy: [, y], previous: [, lastY] }) => {
                if (!first) {
                    store.getState().zoomView((y - lastY) * 0.05)
                }
            },
            onDrag: ({ first, xy: [x, z], previous: [lastX, lastZ], buttons }) => {
                if (buttons === 2) {
                    if (!first) {
                        store.getState().translateView([-(x - lastX) * 0.02, -(z - lastZ) * 0.02])
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
