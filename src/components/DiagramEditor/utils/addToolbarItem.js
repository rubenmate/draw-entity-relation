import { default as MxGraph } from "mxgraph";

const { mxEvent, mxUtils } = MxGraph();

export default function addToolbarItem(
    graph,
    toolbar,
    prototype,
    image,
    diagramRef,
    addEntityToDiagram,
    addRelationToDiagram,
) {
    // Function that is executed when the image is dropped on
    // the graph. The cell argument points to the cell under
    // the mousepointer if there is one.
    const funct = (graph, evt, cell, x, y) => {
        graph.stopEditing(false);

        const vertex = graph.getModel().cloneCell(prototype);

        // Function to generate a unique name
        const generateUniqueName = (baseName, existingItems) => {
            let counter = 0;
            let uniqueName = baseName;

            const nameExists = (name) => {
                return existingItems.some((item) => item.name === name);
            };

            while (nameExists(uniqueName)) {
                counter++;
                uniqueName = `${baseName} ${counter}`;
            }

            return uniqueName;
        };

        // Retrieve existing entities and relations
        const existingEntities = diagramRef.current.entities || [];
        const existingRelations = diagramRef.current.relations || [];

        // Determine the base name and existing items array based on the flags
        let baseName;
        let existingItems;

        if (addEntityToDiagram) {
            baseName = "Entidad";
            existingItems = existingEntities;
        } else if (addRelationToDiagram) {
            baseName = "Relación";
            existingItems = existingRelations;
        } else {
            baseName = "Test";
            existingItems = [];
        }

        // Generate a unique name
        const uniqueName = generateUniqueName(baseName, existingItems);

        // Set the vertex value to the unique name
        vertex.value = uniqueName;

        vertex.geometry.x = x;
        vertex.geometry.y = y;

        graph.addCell(vertex);
        graph.setSelectionCell(vertex);
        if (addEntityToDiagram) {
            diagramRef.current.entities.push({
                idMx: vertex.id,
                name: vertex.value,
                position: { x: vertex.geometry.x, y: vertex.geometry.y },
                attributes: [],
            });
        }
        if (addRelationToDiagram) {
            diagramRef.current.relations.push({
                idMx: vertex.id,
                name: vertex.value,
                position: { x: vertex.geometry.x, y: vertex.geometry.y },
                side1: {
                    idMx: "",
                    cardinality: "",
                    cell: "",
                    entity: { idMx: "" },
                },
                side2: {
                    idMx: "",
                    cardinality: "",
                    cell: "",
                    entity: { idMx: "" },
                },
                canHoldAttributes: false,
                attributes: [],
            });
        }
    };

    // Creates the image which is used as the drag icon (preview)
    const img = toolbar.addMode(null, image, function (evt, cell) {
        const pt = this.graph.getPointForEvent(evt);
        funct(graph, evt, cell, pt.x, pt.y);
    });

    // Disables dragging if element is disabled. This is a workaround
    // for wrong event order in IE. Following is a dummy listener that
    // is invoked as the last listener in IE.
    mxEvent.addListener(img, "mousedown", (evt) => {
        // do nothing
    });

    // This listener is always called first before any other listener
    // in all browsers.
    mxEvent.addListener(img, "mousedown", (evt) => {
        if (!img.enabled) {
            mxEvent.consume(evt);
        }
    });

    mxUtils.makeDraggable(img, graph, funct);

    return img;
}
