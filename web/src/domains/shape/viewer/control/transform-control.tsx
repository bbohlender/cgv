import { TransformControls } from "@react-three/drei"
import { useRef, useEffect } from "react"
import { Camera, Vector3Tuple } from "three"
import type { TransformControls as TransformControlsImpl } from "three-stdlib"

export function TransformControl({
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
