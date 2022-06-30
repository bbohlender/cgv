import { MeshProps } from "@react-three/fiber"
import { PropsWithChildren, useMemo } from "react"
import { BufferAttribute, BufferGeometry } from "three"

function createScreenQuadGeometry() {
    const geometry = new BufferGeometry()
    const vertices = new Float32Array([-1, -1, 1, 3, -1, 1, -1, 3, 1])
    const uv = new Float32Array([0, 0, 2, 0, 0, 2])
    geometry.setAttribute("position", new BufferAttribute(vertices, 3))
    geometry.setAttribute("uv", new BufferAttribute(uv, 2))
    return geometry
}

export function Display({ children, ...props }: PropsWithChildren<MeshProps>) {
    const geometry = useMemo(createScreenQuadGeometry, [])
    return (
        <mesh geometry={geometry} frustumCulled={false} {...props}>
            {children}
        </mesh>
    )
}
