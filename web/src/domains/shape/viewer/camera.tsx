import { PerspectiveCamera } from "@react-three/drei"
import { useEffect } from "react"
import { animated, useSpring } from "@react-spring/three"
import { Vector3Tuple } from "three"
import { calculateRotation, FOV, getPosition, useViewerState, ViewerState } from "./state"

const APerspectiveCamera = animated(PerspectiveCamera)

function calculatePositionTuple(state: ViewerState): Vector3Tuple {
    const { height, lat, lon } = getPosition(state)
    return [lon, height, lat]
}

function getInitialState() {
    const state = useViewerState.getState()
    return {
        position: calculatePositionTuple(state),
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
            (state) => calculatePositionTuple(state),
            (pos) => position.start(pos)
        )
        return () => {
            unsubscribeRotation()
            unsubscribePosition()
        }
    }, [rotation, position])

    return (
        <APerspectiveCamera
            fov={FOV}
            far={1000}
            near={10e-10}
            position={position}
            rotation-order="YXZ"
            rotation={rotation as any}
            makeDefault
        />
    )
}
