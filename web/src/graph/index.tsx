import { graphlib } from "dagre"
import React, { useEffect, useState } from "react"
import ReactFlow, { ConnectionLineType, Node, Edge } from "react-flow-renderer"
import { updateGraph } from "./update-graph"
import { useBaseStore } from "../global"
import { getLocalDescription } from "cgv"

const Graph = () => {
    const [{ nodes, edges }, setState] = useState(() => {
        const nodes: Array<Node> = []
        const edges: Array<Edge> = []
        return { nodes, edges }
    })
    const store = useBaseStore()

    useEffect(() => {
        const graph = new graphlib.Graph()
        graph.setGraph({ rankdir: "LR" })
        let currentNodes: Array<Node> = []
        let currentEdges: Array<Edge> = []
        store.subscribe(
            (state) =>
                state.type === "gui" && state.selectedDescription != null
                    ? getLocalDescription(state.grammar, state.dependencyMap, state.selectedDescription)
                    : undefined,
            (description, prevDescription) => {
                if (description == null) {
                    setState({ nodes: [], edges: [] })
                    return
                }
                const newNodes = [...currentNodes]
                const newEdges = [...currentEdges]
                updateGraph(newNodes, newEdges, graph, prevDescription, description)
                currentEdges = newEdges
                currentNodes = newNodes
                setState({ edges: currentEdges, nodes: newNodes })
            },
            {
                fireImmediately: true,
            }
        )
    }, [])

    return <ReactFlow nodes={nodes} edges={edges} connectionLineType={ConnectionLineType.SmoothStep} fitView />
}

export default Graph
