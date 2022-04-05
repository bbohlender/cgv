import { PerspectiveCamera } from "@react-three/drei"
import { useEffect } from "react"
import { animated, useSpring } from "@react-spring/three"
import { Vector3Tuple } from "three"
import { calculatePosition, calculateRotation, FOV, useViewerState } from "./state"

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

    return (
        <APerspectiveCamera fov={FOV} position={position} rotation-order="YXZ" rotation={rotation as any} makeDefault />
    )
}
