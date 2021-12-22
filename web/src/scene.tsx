import { Instance } from "cgv/domains/shape"
import { useMemo } from "react"
import { Color } from "three"

export function Scene({
    selectedInstance,
    instances,
    setSelectedInstance,
}: {
    setSelectedInstance?: (instance: Instance) => void
    selectedInstance?: Instance
    instances: Array<Instance>
}) {
    const highlight = useMemo(() => {
        if (selectedInstance == null) {
            return null
        }
        const object = selectedInstance.primitive.getObject3D(true)
        object.traverse((o) => {
            if ("material" in o) {
                ;(o as any)["material"] = (o as any)["material"].clone()
                ;(o as any)["material"].color = new Color(0x0000ff)
            }
        })
        return <primitive object={object} />
    }, [selectedInstance])
    return (
        <group scale={0.01}>
            {highlight}
            {instances.map((instance, i) => (
                <group key={i} onClick={() => setSelectedInstance && setSelectedInstance(instance)}>
                    <primitive object={instance.primitive.getObject3D(true)} />
                </group>
            ))}
        </group>
    )
}
