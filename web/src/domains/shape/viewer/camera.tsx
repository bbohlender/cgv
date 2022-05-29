import { PerspectiveCamera } from "@react-three/drei"
import { PropsWithChildren, ReactChildren, useEffect } from "react"
import { animated, useSpring } from "@react-spring/three"
import { Vector3Tuple } from "three"
import { calculateRotation, FOV, getPosition, useViewerState, ViewerState } from "./state"
import { PerspectiveCameraProps } from "@react-three/fiber"

const APerspectiveCamera = animated(PerspectiveCamera)

function getInitialState() {
    const state = useViewerState.getState()
    return {
        position: getPosition(state),
        rotation: calculateRotation(state),
    }
}

export function ViewerCamera({ children, ...props }: PropsWithChildren<PerspectiveCameraProps>) {
    const [{ position, rotation }] = useSpring(getInitialState)

    useEffect(() => {
        const unsubscribeRotation = useViewerState.subscribe<Vector3Tuple>(
            (state) => calculateRotation(state),
            (rot) => rotation.start(rot)
        )
        const unsubscribePosition = useViewerState.subscribe<Vector3Tuple>(
            (state) => getPosition(state),
            (pos) => position.start(pos)
        )
        return () => {
            unsubscribeRotation()
            unsubscribePosition()
        }
    }, [rotation, position])

    return (
        <APerspectiveCamera
            {...props}
            fov={FOV}
            far={1000}
            near={10e-10}
            position={position}
            rotation-order="YXZ"
            children={children}
            rotation={rotation as any}
            makeDefault
        />
    )
}
