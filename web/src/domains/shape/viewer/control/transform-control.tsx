import { TransformControls } from "@react-three/drei"
import { createPortal, useThree } from "@react-three/fiber"
import { useRef, useEffect, useMemo, useState } from "react"
import { Camera, Group, Matrix4, Object3D, Vector3Tuple } from "three"
import type { TransformControls as TransformControlsImpl } from "three-stdlib"
import { useViewerState } from "../state"

export type TransformMode = "scale" | "rotate" | "translate"
export type AxisEnabled = [boolean, boolean, boolean]

export function TransformControl({
    mode,
    set,
    value,
    matrix,
    axis,
    child,
    size,
}: {
    mode: TransformMode
    value: Vector3Tuple
    matrix: Matrix4
    axis: AxisEnabled
    size?: number
    set: (x: number, y: number, z: number) => void
    child?: Object3D
}) {
    const ref = useRef<TransformControlsImpl<Camera>>(null)
    const [object, setObject] = useState<Group | null>(null)

    useEffect(() => {
        const controls = ref.current
        if (controls == null || object == null) {
            return
        }
        const mouseDown = () => {
            useViewerState.getState().setControlling(true)
        }
        const mouseUp = () => {
            if (ref.current != null) {
                setTimeout(() => useViewerState.getState().setControlling(false))
                const { x, y, z } = object[modeToPropertyMap[mode]]
                set(x, y, z)
            }
        }
        controls.addEventListener("mouseDown", mouseDown)
        controls.addEventListener("mouseUp", mouseUp)
        return () => {
            useViewerState.getState().setControlling(false)
            controls.removeEventListener("mouseUp", mouseDown)
            controls.removeEventListener("mouseDown", mouseUp)
        }
    }, [set, mode, object])

    const [showX, showY, showZ] = axis

    if (object != null) {
        object[modeToPropertyMap[mode]].fromArray(value)
    }

    const scene = useThree((state) => state.scene)
    return (
        <group matrixAutoUpdate={false} matrix={matrix}>
            {object != null &&
                createPortal(
                    <TransformControls
                        showX={showX}
                        showY={showY}
                        showZ={showZ}
                        size={size}
                        mode={mode}
                        space="local"
                        object={object}
                        ref={ref}
                    />,
                    scene
                )}
            <group ref={setObject}>{child != null && <primitive object={child} />}</group>
        </group>
    )
}

const modeToPropertyMap: { [Key in TransformMode]: "position" | "scale" | "rotation" } = {
    rotate: "rotation",
    scale: "scale",
    translate: "position",
}
