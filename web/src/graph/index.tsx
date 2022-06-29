import React, { useMemo } from "react"
import ReactFlow, { ConnectionLineType, Node, Edge } from "react-flow-renderer"
import { createGraph } from "./create-graph"
import { useBaseGlobal, useBaseStore } from "../global"
import { getLocalDescription, HierarchicalParsedSteps, shallowEqual } from "cgv"
import { GraphIcon } from "../icons/graph"
import { EditIcon } from "../icons/edit"
import { nodeTypes } from "./node-types"
import Tooltip from "rc-tooltip"

export function Graph() {
    const store = useBaseStore()
    const selectedDescriptions = store((state) => state.selectedDescriptions)
    const localDescription = store(
        (state) =>
            state.type === "gui" && state.graphVisualization && state.selectedDescriptions.length === 1
                ? getLocalDescription(state.grammar, state.dependencyMap, state.selectedDescriptions[0])
                : undefined,
        shallowEqual
    )

    const { operationGuiMap } = useBaseGlobal()

    const [nodes, edges] = useMemo(() => {
        if (localDescription == null || selectedDescriptions.length != 1) {
            return []
        }
        const newNodes: Array<Node> = []
        const newEdges: Array<Edge> = []
        createGraph(newNodes, newEdges, localDescription, selectedDescriptions[0], operationGuiMap)
        return [newNodes, newEdges]
    }, [localDescription, selectedDescriptions, operationGuiMap])

    if (selectedDescriptions.length != 1) {
        return (
            <div className="d-flex align-items-center justify-content-center flex-grow-1">
                <span>{selectedDescriptions.length === 0 ? "Nothing Selected" : "Multiple Descriptions Selected"}</span>
            </div>
        )
    }

    if (localDescription == null) {
        return null
    }

    return (
        <div className="position-relative flex-grow-1">
            <ReactFlow
                nodeTypes={nodeTypes}
                style={{ zIndex: 0 }}
                nodes={nodes}
                edges={edges}
                onNodeClick={(e, node: Node<{ value: HierarchicalParsedSteps | string }>) =>
                    store.getState().select(node.data.value, undefined, store.getState().shift ? "add" : "replace")
                }
                onNodeMouseEnter={(_, node: Node<{ value: HierarchicalParsedSteps | string }>) =>
                    store.getState().onStartHover(node.data.value, undefined)
                }
                onNodeMouseLeave={(_, node: Node<{ value: HierarchicalParsedSteps | string }>) =>
                    store.getState().onEndHover(node.data.value)
                }
                connectionLineType={ConnectionLineType.SmoothStep}
            />
            <div
                style={{ position: "fixed", right: "1rem", bottom: "1rem" }}
                className="d-flex flex-row align-items-center">
                <Tooltip placement="top" overlay="Toggle Graph">
                    <button
                        className="d-flex align-items-center btn btn-sm btn-primary me-2"
                        onClick={() => store.getState().setGraphVisualization(false)}>
                        <GraphIcon />
                    </button>
                </Tooltip>
                <Tooltip placement="topRight" overlay="Edit Text">
                    <button
                        className="d-flex align-items-center btn btn-sm btn-secondary"
                        onClick={() => store.getState().setType("tui")}>
                        <EditIcon />
                    </button>
                </Tooltip>
            </div>
        </div>
    )
}
