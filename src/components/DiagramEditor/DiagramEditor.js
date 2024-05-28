import * as React from "react";
import "./styles/diagramEditor.css";
import { default as MxGraph } from "mxgraph";
import { mxConstants } from "mxgraph-js";
import toast, { Toaster } from "react-hot-toast";
import { configureKeyBindings, setInitialConfiguration } from "./utils";

const { mxGraph, mxEvent } = MxGraph();

export default function App(props) {
    const containerRef = React.useRef(null);
    const toolbarRef = React.useRef(null);

    const [graph, setGraph] = React.useState(null);
    const [diagram, setDiagram] = React.useState({
        entities: [],
        relations: [],
    });
    const [selected, setSelected] = React.useState(null);
    const [entityWithAttributesHidden, setEntityWithAttributesHidden] =
        React.useState(null);

    const [showPrimaryButton, setShowPrimaryButton] = React.useState(false);

    const onSelected = React.useCallback(
        (evt) => {
            if (props.onSelected) {
                props.onSelected(evt);
            }
            setSelected(evt.cells[0]);
        },
        [props],
    );

    const onElementAdd = React.useCallback(
        (evt) => {
            if (props.onElementAdd) {
                props.onElementAdd(evt);
            }
        },
        [props],
    );

    const onDragEnd = React.useCallback(
        (evt) => {
            if (props.onDragEnd) {
                props.onDragEnd(evt);
            }
        },
        [props],
    );

    React.useEffect(() => {
        if (!graph) {
            mxEvent.disableContextMenu(containerRef.current);
            setGraph(new mxGraph(containerRef.current));
        }
        if (graph) {
            setInitialConfiguration(graph, diagram, toolbarRef);
            configureKeyBindings(graph);

            graph.getModel().endUpdate();
            graph.getSelectionModel().addListener(mxEvent.CHANGE, onSelected);
            graph.getModel().addListener(mxEvent.ADD, onElementAdd);
            graph.getModel().addListener(mxEvent.MOVE_END, onDragEnd);

            graph.stylesheet.styles.defaultEdge.endArrow = ""; // NOTE: Edges are not directed
            //     mxConstants.EDGESTYLE_ENTITY_RELATION;
            console.log(mxConstants.EDGESTYLE_ENTITY_RELATION);

            // Cleanup function to remove the listener
            return () => {
                graph.getModel().removeListener(mxEvent.ADD, onSelected);
                graph.getModel().removeListener(mxEvent.MOVE_END, onElementAdd);
                graph.getModel().removeListener(mxEvent.CHANGE, onSelected);
            };
        }
    }, [graph, diagram, onSelected, onElementAdd, onDragEnd]);

    // TODO: Remove this useEffect since it's just for debugging
    React.useEffect(() => {
        if (graph) {
            console.log("Graph", graph);
            console.log("Cells", graph.model.cells);
            console.log("Diagram", diagram);
            diagram.entities.forEach((entity) => {
                // Check if the current entity's idMx exists in graph.model.cells
                if (graph.model.cells.hasOwnProperty(entity.idMx)) {
                    // Access the values from graph.model.cells using the entity's idMx
                    const cellData = graph.model.cells[entity.idMx];

                    // Update the entity's name and position
                    entity.name = cellData.value; // Assuming 'value' is the new name
                    entity.position.x = cellData.geometry.x; // Assuming 'geometry.x' is the new x position
                    entity.position.y = cellData.geometry.y; // Assuming 'geometry.y' is the new y position
                    entity.cell = cellData;

                    // Check if the entity has attributes
                    if (entity.attributes) {
                        // Iterate over each attribute
                        entity.attributes.forEach((attr) => {
                            // Check if the attribute's idMx exists in graph.model.cells
                            if (graph.model.cells.hasOwnProperty(attr.idMx)) {
                                // Access the values from graph.model.cells using the attribute's idMx
                                const cellDataAttr =
                                    graph.model.cells[attr.idMx];

                                const numEdgeIdMx = +attr.idMx + 1;
                                const cellEdgeAttr =
                                    graph.model.cells[numEdgeIdMx];

                                // Update the attribute's name and position
                                attr.name = cellDataAttr.value; // Assuming 'value' is the new name
                                attr.position.x = cellDataAttr.geometry.x; // Assuming 'geometry.x' is the new x position
                                attr.position.y = cellDataAttr.geometry.y; // Assuming 'geometry.y' is the new y position
                                attr.cell = [cellDataAttr, cellEdgeAttr];
                            }
                        });
                    }
                }
            });
        }
    });

    const pushCellsBack = (moveBack) => () => {
        graph.orderCells(moveBack);
    };

    const renderMoveBackAndFrontButtons = () =>
        selected && (
            <React.Fragment>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={pushCellsBack(true)}
                >
                    Move back
                </button>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={pushCellsBack(false)}
                >
                    Move front
                </button>
            </React.Fragment>
        );

    const renderAddAttribute = () => {
        if (
            selected?.style?.includes(";shape=rectangle") &&
            showPrimaryButton
        ) {
            return (
                <>
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={() => addAttribute(true)}
                    >
                        Atributo primario
                    </button>
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={() => addAttribute(false)}
                    >
                        Atributo
                    </button>
                </>
            );
        }
        if (selected?.style?.includes(";shape=rectangle")) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={() => setShowPrimaryButton(true)}
                >
                    Añadir atributo
                </button>
            );
        }
    };

    const renderToggleAttributes = () => {
        if (selected?.style?.includes(";shape=rectangle")) {
            if (
                entityWithAttributesHidden &&
                !entityWithAttributesHidden.hasOwnProperty(selected.id)
            ) {
                const updatedAttributesHidden = {
                    ...entityWithAttributesHidden,
                };
                updatedAttributesHidden[selected.id] = false;
                setEntityWithAttributesHidden(updatedAttributesHidden);
            }
            const attributesHidden = entityWithAttributesHidden?.[selected.id];
            if (attributesHidden !== true) {
                return (
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={hideAttributes}
                    >
                        Ocultar atributos
                    </button>
                );
            }
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={showAttributes}
                >
                    Mostrar atributos
                </button>
            );
        }
    };

    const addAttribute = (primary) => {
        if (selected?.style?.includes(";shape=rectangle")) {
            const color = primary ? "yellow" : "blue";
            const source = selected;

            const newX = selected.geometry.x + 120;
            const newY = selected.geometry.y;

            // Define a style with labelPosition set to ALIGN_RIGHT, additional right spacing
            const style = {};
            style[mxConstants.STYLE_LABEL_POSITION] = mxConstants.ALIGN_RIGHT;
            style[mxConstants.STYLE_SPACING_RIGHT] = -40; // Adjust this value to control the extra space to the right

            // Apply the style to the vertex
            graph.getStylesheet().putCellStyle("rightLabelStyle", style);

            const target = graph.insertVertex(
                null,
                null,
                "Atributo", // Placeholder attribute
                newX,
                newY,
                10,
                10,
                `shape=ellipse;rightLabelStyle;fillColor=${color}`,
            );
            graph.insertEdge(selected, null, null, source, target);
            graph.orderCells(false); // Move front the selected entity so the new vertex aren't on top

            diagram.entities
                .find((entity) => entity.idMx === selected.id)
                .attributes.push({
                    idMx: target.id,
                    name: target.value,
                    position: {
                        x: target.geometry.x,
                        y: target.geometry.y,
                    },
                });

            setShowPrimaryButton(false); // After adding go back to show the normal button

            // TODO: Instead of toasting here set a listener that toast every time a cell is added
            toast.success("Atributo insertado");
            // TODO: Increment the offset so that new attributes are not added on top of others
        }
    };

    const hideAttributes = () => {
        const selectedEntity = diagram.entities.find(
            ({ idMx }) => idMx === selected.id,
        );
        const mxAttributesToRemove = [];
        selectedEntity.attributes.forEach(({ idMx }) => {
            mxAttributesToRemove.push(graph.model.cells[idMx]);
        });
        graph.removeCells(mxAttributesToRemove);

        const updatedAttributesHidden = { ...entityWithAttributesHidden };
        updatedAttributesHidden[selected.id] = true;
        setEntityWithAttributesHidden(updatedAttributesHidden);
    };

    const showAttributes = () => {
        const selectedEntity = diagram.entities.find(
            ({ idMx }) => idMx === selected.id,
        );
        const mxAttributesToAdd = [];
        selectedEntity.attributes.forEach(({ cell }) => {
            mxAttributesToAdd.push(cell.at(0));
            mxAttributesToAdd.push(cell.at(1));
        });
        graph.addCells(mxAttributesToAdd);
        graph.orderCells(true, mxAttributesToAdd); // back = true

        const updatedAttributesHidden = { ...entityWithAttributesHidden };
        updatedAttributesHidden[selected.id] = false;
        setEntityWithAttributesHidden(updatedAttributesHidden);
    };

    return (
        <div className="mxgraph-container">
            <div className="mxgraph-toolbar-container">
                <div className="mxgraph-toolbar-container" ref={toolbarRef} />
                <div>{renderMoveBackAndFrontButtons()}</div>
                <div>{renderAddAttribute()}</div>
                <div>{renderToggleAttributes()}</div>
            </div>
            <div ref={containerRef} className="mxgraph-drawing-container" />
            <Toaster position="bottom-left" />
        </div>
    );
}
