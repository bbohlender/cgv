import { createPortal, useThree } from "@react-three/fiber"
import { useRef, useEffect, useMemo, useState } from "react"
import { Camera, Group, Matrix4, Object3D, Vector3Tuple } from "three"
import { useViewerState } from "../state"
import { StdTransformControls } from "./std-transform-controls"

export type TransformMode = "scale" | "rotate" | "translate"
export type AxisEnabled = [boolean, boolean, boolean]

export function TransformControl({
    mode,
    set,
    value,
    matrix,
    axis,
    child,
    length,
    depth,
}: {
    depth?: boolean
    length?: number
    mode: TransformMode
    value: Vector3Tuple
    matrix: Matrix4
    axis: AxisEnabled
    set: (x: number, y: number, z: number) => void
    child?: Object3D
}) {
    const params = useThree<[Camera, HTMLCanvasElement]>(({ camera, gl }) => [camera, gl.domElement])
    const [object, setObject] = useState<Group | null>(null)
    const [showX, showY, showZ] = axis
    const transformControl = useMemo(() => new StdTransformControls(length ?? 1, ...params, depth), [depth, length, ...params])

    useEffect(() => {
        if (object == null) {
            return
        }
        transformControl.attach(object)
        return () => {
            transformControl.detach()
        }
    }, [object, transformControl])

    useEffect(() => {
        if (transformControl == null || object == null) {
            return
        }
        const mouseDown = () => {
            useViewerState.getState().setControlling(true)
        }
        const mouseUp = () => {
            setTimeout(() => useViewerState.getState().setControlling(false))
            const { x, y, z } = object[modeToPropertyMap[mode]]
            set(x, y, z)
        }
        transformControl.addEventListener("mouseDown", mouseDown)
        transformControl.addEventListener("mouseUp", mouseUp)
        return () => {
            useViewerState.getState().setControlling(false)
            transformControl.removeEventListener("mouseUp", mouseDown)
            transformControl.removeEventListener("mouseDown", mouseUp)
        }
    }, [set, mode, object])

    if (object != null) {
        object[modeToPropertyMap[mode]].fromArray(value)
    }

    const scene = useThree((state) => state.scene)
    return (
        <group matrixAutoUpdate={false} matrix={matrix}>
            {object != null &&
                createPortal(
                    <primitive
                        showX={showX}
                        showY={showY}
                        showZ={showZ}
                        mode={mode}
                        space={"local"}
                        object={transformControl}
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
