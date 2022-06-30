import { PerspectiveCamera } from "@react-three/drei"
import { PropsWithChildren, ReactChildren, useEffect, useRef } from "react"
import { animated, useSpring } from "@react-spring/three"
import { PerspectiveCamera as PerspectiveCameraImpl, Vector3Tuple } from "three"
import { calculateFOV, calculateRotation, FOV, getPosition, useViewerState, ViewerState } from "./state"
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
    const ref = useRef<PerspectiveCameraImpl | undefined>()

    useEffect(() => {
        const unsubscribeRotation = useViewerState.subscribe<Vector3Tuple>(
            (state) => calculateRotation(state),
            (rot) => rotation.start(rot)
        )
        const unsubscribePosition = useViewerState.subscribe<Vector3Tuple>(
            (state) => getPosition(state),
            (pos) => position.start(pos)
        )
        const unsubscribeFOV = useViewerState.subscribe<number>(
            (state) => calculateFOV(state),
            (fovValue) => {
                if (ref.current == null) {
                    return
                }
                ref.current.fov = fovValue
                ref.current.updateProjectionMatrix()
            },
            { fireImmediately: true }
        )
        return () => {
            unsubscribeRotation()
            unsubscribePosition()
            unsubscribeFOV()
        }
    }, [rotation, position])

    return (
        <APerspectiveCamera
            {...props}
            ref={ref}
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
