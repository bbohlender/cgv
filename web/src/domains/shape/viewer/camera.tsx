import { PerspectiveCamera } from "@react-three/drei"
import { useEffect } from "react"
import { animated, useSpring } from "@react-spring/three"
import { Euler, Vector3Tuple } from "three"
import { panoramas } from "../global"
import { eulerToTuple, FOV, useViewerState, ViewerState } from "./state"

export const topPosition: Vector3Tuple = [0, 100, 0]
export const topRotation = eulerToTuple(new Euler(-Math.PI / 2, 0, 0))

const APerspectiveCamera = animated(PerspectiveCamera)

function getInitialState() {
    const state = useViewerState.getState()
    return {
        position: calculatePosition(state),
        rotation: calculateRotation(state),
    }
}

export function ViewerCamera() {
    const [{ position, rotation }] = useSpring(getInitialState)

    useEffect(() => {
        const unsubscribeRotation = useViewerState.subscribe<Vector3Tuple>(
            (state) => calculateRotation(state),
            (rot) => rotation.start(rot)
        )
        const unsubscribePosition = useViewerState.subscribe<Vector3Tuple>(
            (state) => calculatePosition(state),
            (pos) => position.start(pos)
        )
        return () => {
            unsubscribeRotation()
            unsubscribePosition()
        }
    }, [rotation, position])

    return <APerspectiveCamera fov={FOV} position={position} rotation-order="YXZ" rotation={rotation as any} makeDefault />
}

function calculatePosition(state: ViewerState): Vector3Tuple {
    if (state.viewType === "2d") {
        return state.position
    }
    return panoramas[state.panoramaIndex].position
}

function calculateRotation(state: ViewerState): Vector3Tuple {
    if (state.viewType === "2d") {
        return topRotation
    }
    return state.rotation
}
