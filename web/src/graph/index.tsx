import React, { useEffect, useState } from "react"
import ReactFlow, { ConnectionLineType, Node, Edge } from "react-flow-renderer"
import { createGraph } from "./create-graph"
import { useBaseStore } from "../global"
import { getLocalDescription, shallowEqual } from "cgv"

const Graph = () => {
    const [{ nodes, edges }, setState] = useState(() => {
        const nodes: Array<Node> = []
        const edges: Array<Edge> = []
        return { nodes, edges }
    })
    const store = useBaseStore()

    useEffect(() => {
        store.subscribe(
            (state) =>
                state.type === "gui" && state.selectedDescription != null
                    ? getLocalDescription(state.grammar, state.dependencyMap, state.selectedDescription)
                    : undefined,
            (description) => {
                if (description == null) {
                    setState({ nodes: [], edges: [] })
                    return
                }
                const newNodes: Array<Node> = []
                const newEdges: Array<Edge> = []
                createGraph(newNodes, newEdges, description)
                setState({ edges: newEdges, nodes: newNodes })
            },
            {
                fireImmediately: true,
                equalityFn: shallowEqual,
            }
        )
    }, [])

    return <ReactFlow nodes={nodes} edges={edges} connectionLineType={ConnectionLineType.SmoothStep} fitView />
}

export default Graph
