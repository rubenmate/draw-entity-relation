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
    // Define a style with labelPosition set to ALIGN_RIGHT, additional right spacing
    const rightLabelStyle = {};
    rightLabelStyle[mxConstants.STYLE_LABEL_POSITION] = mxConstants.ALIGN_RIGHT;
    rightLabelStyle[mxConstants.STYLE_SPACING_RIGHT] = -40; // Adjust this value to control the extra space to the right
    const keyAttrStyle = {};
    // Apply font underline to the label text
    keyAttrStyle[mxConstants.STYLE_FONTSTYLE] = mxConstants.FONT_UNDERLINE;

    const [graph, setGraph] = React.useState(null);
    const diagramRef = React.useRef({
        entities: [],
        relations: [],
    });
    const [selected, setSelected] = React.useState(null);
    const [entityWithAttributesHidden, setEntityWithAttributesHidden] =
        React.useState(null);

    const [refreshDiagram, setRefreshDiagram] = React.useState(false);
    const addPrimaryAttrRef = React.useRef(null);

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
            setInitialConfiguration(graph, diagramRef, toolbarRef);
            configureKeyBindings(graph);

            graph.getModel().endUpdate();
            graph.getSelectionModel().addListener(mxEvent.CHANGE, onSelected);
            graph.getModel().addListener(mxEvent.ADD, onElementAdd);
            graph.getModel().addListener(mxEvent.MOVE_END, onDragEnd);

            graph.stylesheet.styles.defaultEdge.endArrow = ""; // NOTE: Edges are not directed
            graph
                .getStylesheet()
                .putCellStyle("rightLabelStyle", rightLabelStyle);

            graph.getStylesheet().putCellStyle("keyAttrStyle", keyAttrStyle);

            // Cleanup function to remove the listener
            return () => {
                graph.getModel().removeListener(mxEvent.ADD, onSelected);
                graph.getModel().removeListener(mxEvent.MOVE_END, onElementAdd);
                graph.getModel().removeListener(mxEvent.CHANGE, onSelected);
            };
        }
    }, [graph, onSelected, onElementAdd, onDragEnd]);

    React.useEffect(() => {
        if (graph) {
            console.log("Diagram", diagramRef.current);
            diagramRef.current.entities.forEach((entity) => {
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
    }, [selected, refreshDiagram]);

    const pushCellsBack = (moveBack) => () => {
        graph.orderCells(moveBack);
    };

    const addAttribute = () => {
        if (selected?.style?.includes("shape=rectangle")) {
            const selectedDiag = diagramRef.current.entities.find(
                (entity) => entity.idMx === selected.id,
            );
            const addKey = selectedDiag?.attributes?.length === 0;
            addPrimaryAttrRef.current = addKey;
            const source = selected;

            const newX = selected.geometry.x + 120;
            const newY = selected.geometry.y;

            // Apply the style to the vertex

            const target = graph.insertVertex(
                null,
                null,
                "Atributo", // Placeholder attribute
                newX,
                newY,
                10,
                10,
                `shape=ellipse;rightLabelStyle;${
                    addPrimaryAttrRef.current ? "keyAttrStyle" : ""
                }`,
            );
            graph.insertEdge(selected, null, null, source, target);
            graph.orderCells(false); // Move front the selected entity so the new vertex aren't on top

            // Update diagram state
            diagramRef.current.entities
                .find((entity) => entity.idMx === selected.id)
                .attributes.push({
                    idMx: target.id,
                    name: target.value,
                    position: {
                        x: target.geometry.x,
                        y: target.geometry.y,
                    },
                    key: addPrimaryAttrRef.current,
                });

            // TODO: Instead of toasting here set a listener that toast every time a cell is added
            toast.success("Atributo insertado");
            // TODO: Increment the offset so that new attributes are not added on top of others
        }
    };

    const hideAttributes = () => {
        const selectedEntity = diagramRef.current.entities.find(
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
        const selectedEntity = diagramRef.current.entities.find(
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

    const toggleAttrKey = () => {
        // TODO: Missing the visual change
        // - Remove keyAttrStyle from the previous key cell
        // - Add keyAttrStyle to the new key cell
        // I think the most straightforward way of doing this will be to edit the
        // styles and then toggle the hide/show attrs so when they are recreated
        // will be with the new styles.

        // Find the selected attribute and mark it as key
        let entityIndexToUpdate;

        diagramRef.current.entities.find((entity, index) => {
            entity.attributes.forEach((attribute) => {
                if (attribute.idMx === selected.id) {
                    // Found the matching entity, assign its idMx to entityIdToUpdate
                    entityIndexToUpdate = index;
                    // No need to continue searching after finding the match
                    return true; // This will exit the find loop early
                }
            });
        });

        diagramRef.current.entities
            .at(entityIndexToUpdate)
            .attributes.forEach((attribute) => {
                console.log(attribute.cell.at(0));
                if (attribute.idMx === selected.id) {
                    attribute.key = true;
                    attribute.value = "Clave";
                } else {
                    attribute.key = false;
                }
            });
        // TODO: Cant use this methods so we need to save which attrs
        // to remove and which ones to save (save the ones that we modified with the
        // updated style)
        // hideAttributes();
        // showAttributes();
        setRefreshDiagram((prevState) => !prevState);
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
        if (selected?.style?.includes("shape=rectangle")) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={addAttribute}
                >
                    Añadir atributo
                </button>
            );
        }
    };

    const renderToggleAttributes = () => {
        if (selected?.style?.includes("shape=rectangle")) {
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

    const renderToggleAttrKey = () => {
        const isAttribute = selected?.style?.includes("shape=ellipse");
        let isKey;

        for (const entity of diagramRef.current.entities) {
            for (const attribute of entity.attributes) {
                if (attribute.idMx === selected?.id) {
                    isKey = attribute.key;
                    break; // Exit the inner loop once the matching attribute is found
                }
            }

            if (isKey !== undefined) {
                break; // Exit the outer loop once the matching attribute is found
            }
        }

        if (isAttribute && !isKey) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={toggleAttrKey}
                >
                    Convertir en clave
                </button>
            );
        }
    };

    return (
        <div className="mxgraph-container">
            <div className="mxgraph-toolbar-container">
                <div className="mxgraph-toolbar-container" ref={toolbarRef} />
                <div>{renderMoveBackAndFrontButtons()}</div>
                <div>{renderAddAttribute()}</div>
                <div>{renderToggleAttributes()}</div>
                <div>{renderToggleAttrKey()}</div>
            </div>
            <div ref={containerRef} className="mxgraph-drawing-container" />
            <Toaster position="bottom-left" />
        </div>
    );
}
