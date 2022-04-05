import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { PointControl } from "./point"

export function MultiplePointsControl({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    return <>{value.children.map((child) => child.type === "operation" && <PointControl value={child} />)}</>
}
