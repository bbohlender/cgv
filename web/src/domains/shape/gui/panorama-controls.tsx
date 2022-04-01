import { useGesture } from "react-use-gesture"
import { useEffect } from "react"
import { useShapeStore } from "../global"

export function PanoramaControls() {
    const store = useShapeStore()
    useGesture(
        {
            onDrag: ({ first, xy: [x, z], previous: [lastX, lastZ], buttons }) => {
                if (buttons === 2) {
                    if (!first) {
                        store.getState().rotateView([x - lastX, z - lastZ])
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
