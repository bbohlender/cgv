import { TransformControls } from "@react-three/drei"
import { useRef, useEffect } from "react"
import { Camera, Vector2Tuple, Vector3Tuple } from "three"
import type { TransformControls as TransformControlsImpl } from "three-stdlib"

export function Transform3Control({
    set,
    position,
}: {
    position: Vector3Tuple
    set: (x: number, y: number, z: number) => void
}) {
    const ref = useRef<TransformControlsImpl<Camera>>(null)
    useEffect(() => {
        const controls = ref.current
        if (controls == null) {
            return
        }
        const listener = () => {
            if (ref.current != null) {
                set(ref.current["worldPosition"].x, ref.current["worldPosition"].y, ref.current["worldPosition"].z)
            }
        }
        controls.addEventListener("mouseUp", listener)
        return () => controls.removeEventListener("mouseUp", listener)
    }, [set])
    return (
        <TransformControls ref={ref} position={position}>
            <></>
        </TransformControls>
    )
}

export function Transform2Control({ set, position }: { position: Vector2Tuple; set: (x: number, z: number) => void }) {
    const ref = useRef<TransformControlsImpl<Camera>>(null)
    useEffect(() => {
        const controls = ref.current
        if (controls == null) {
            return
        }
        const listener = () => {
            if (ref.current != null) {
                set(ref.current["worldPosition"].x, ref.current["worldPosition"].z)
            }
        }
        controls.addEventListener("mouseUp", listener)
        return () => controls.removeEventListener("mouseUp", listener)
    }, [set])
    return (
        <TransformControls showY={false} ref={ref} position={[position[0], 0, position[1]]}>
            <></>
        </TransformControls>
    )
}
