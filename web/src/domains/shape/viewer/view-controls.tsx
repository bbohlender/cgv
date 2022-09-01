import { useGesture } from "react-use-gesture"
import { useEffect, useRef } from "react"
import { useViewerState } from "./state"
import { useFrame, useThree } from "@react-three/fiber"

export function ViewControls() {
    const canvas = useThree(({ gl }) => gl.domElement)
    useGesture(
        {
            onWheel: ({ first, xy: [, y], previous: [, lastY], event }) => {
                event.preventDefault()
                if (!first) {
                    useViewerState.getState().pinch(1 - (y - lastY) * 0.002)
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
                    useViewerState.getState().pinch(distance / lastDistance)
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
    useMoveFlyCamera()
    useEffect(() => {
        const listener = (e: MouseEvent) => e.preventDefault()
        window.addEventListener("contextmenu", listener)
        return () => window.removeEventListener("contextmenu", listener)
    }, [])
    return null
}

const flySpeed = 0.000001

function useMoveFlyCamera() {
    const ref = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
    })
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "e":
                    ref.current.up = true
                    break
                case "q":
                    ref.current.down = true
                    break
                case "w":
                case "ArrowUp":
                    ref.current.forward = true
                    break
                case "d":
                case "ArrowRight":
                    ref.current.right = true
                    break
                case "s":
                case "ArrowDown":
                    ref.current.backward = true
                    break
                case "a":
                case "ArrowLeft":
                    ref.current.left = true
            }
        }
        const onKeyUp = (e: KeyboardEvent) => {
            switch (e.key) {
                case "e":
                    ref.current.up = false
                    break
                case "q":
                    ref.current.down = false
                    break
                case "w":
                case "ArrowUp":
                    ref.current.forward = false
                    break
                case "d":
                case "ArrowRight":
                    ref.current.right = false
                    break
                case "s":
                case "ArrowDown":
                    ref.current.backward = false
                    break
                case "a":
                case "ArrowLeft":
                    ref.current.left = false
            }
        }

        window.addEventListener("keydown", onKeyDown)
        window.addEventListener("keyup", onKeyUp)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener("keyup", onKeyUp)
        }
    }, [])
    useFrame((_, delta) => {
        const state = useViewerState.getState()
        if (state.viewType != "fly") {
            return
        }
        const deltaMove = delta * flySpeed
        let x = 0
        let y = 0
        let z = 0
        if (ref.current.left) {
            x -= deltaMove
        }
        if (ref.current.right) {
            x += deltaMove
        }
        if (ref.current.forward) {
            z -= deltaMove
        }
        if (ref.current.backward) {
            z += deltaMove
        }
        if (ref.current.up) {
            y += deltaMove
        }
        if (ref.current.down) {
            y -= deltaMove
        }
        if (x != 0 || y != 0 || z != 0) {
            state.moveFlyCamera([x, y, z])
        }
    })
}
