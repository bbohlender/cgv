import { TransformControls } from "@react-three/drei"
import { createPortal, useThree } from "@react-three/fiber"
import { useRef, useEffect, useMemo, useState } from "react"
import { Camera, Group, Matrix4, Object3D, Vector3Tuple } from "three"
import type { TransformControls as TransformControlsImpl } from "three-stdlib"

export type TransformMode = "scale" | "rotate" | "translate"
export type AxisEnabled = [boolean, boolean, boolean]

export function TransformControl({
    mode,
    set,
    value,
    matrix,
    axis,
    child,
}: {
    mode: TransformMode
    value: Vector3Tuple
    matrix: Matrix4
    axis: AxisEnabled
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
        const listener = () => {
            if (ref.current != null) {
                const { x, y, z } = object[modeToPropertyMap[mode]]
                set(x, y, z)
            }
        }
        controls.addEventListener("mouseUp", listener)
        return () => controls.removeEventListener("mouseUp", listener)
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
