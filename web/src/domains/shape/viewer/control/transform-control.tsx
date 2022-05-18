import { TransformControls } from "@react-three/drei"
import { createPortal, useThree } from "@react-three/fiber"
import { useRef, useEffect, useMemo, ReactNode } from "react"
import { AxesHelper, Camera, Object3D, Vector2Tuple, Vector3Tuple } from "three"
import type { TransformControls as TransformControlsImpl } from "three-stdlib"

export function Transform3Control({
    set,
    position,
}: {
    position: Vector3Tuple
    set: (x: number, y: number, z: number) => void
}) {
    const ref = useRef<TransformControlsImpl<Camera>>(null)
    const object = useMemo(() => new Object3D(), [])
    useEffect(() => {
        const controls = ref.current
        if (controls == null) {
            return
        }
        const listener = () => {
            if (ref.current != null) {
                set(object.position.x, object.position.y, object.position.z)
            }
        }
        controls.addEventListener("mouseUp", listener)
        return () => controls.removeEventListener("mouseUp", listener)
    }, [set])
    object.position.x = position[0]
    object.position.y = position[1]
    object.position.z = position[2]
    const scene = useThree((state) => state.scene)
    return (
        <>
            {createPortal(<TransformControls space="local" object={object} ref={ref} />, scene)}
            <primitive object={object} />
        </>
    )
}

export function Transform2Control({ set, position }: { position: Vector2Tuple; set: (x: number, z: number) => void }) {
    const ref = useRef<TransformControlsImpl<Camera>>(null)
    const object = useMemo(() => new Object3D(), [])
    useEffect(() => {
        const controls = ref.current
        if (controls == null) {
            return
        }
        const listener = () => {
            if (ref.current != null) {
                set(object.position.x, object.position.z)
            }
        }
        controls.addEventListener("mouseUp", listener)
        return () => controls.removeEventListener("mouseUp", listener)
    }, [set])
    object.position.x = position[0]
    object.position.z = position[1]
    const scene = useThree((state) => state.scene)
    return (
        <>
            {createPortal(<TransformControls space="local" object={object} showY={false} ref={ref} />, scene)}
            <primitive object={object} />
        </>
    )
}
