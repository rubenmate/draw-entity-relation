export function validateGraph(graph) {
    const noRepeatedNames = !repeatedEntities(graph);
    const noRepeatedAttrNames = !repeatedAttributesInEntity(graph);
    const noEntitiesWithoutAttributes = !entitiesWithoutAttributes(graph);
    const noUnconnectedRelations = !relationsUnconnected(graph);
    const noNotValidCardinalities = !cardinalitiesNotValid(graph);
    const noNotNMRelationsWithAttributes = notNMRelationsWithAttributes(graph);

    return (
        noRepeatedNames &&
        noRepeatedAttrNames &&
        noEntitiesWithoutAttributes &&
        noUnconnectedRelations &&
        noNotValidCardinalities
    );
}

// This function check for repeated entity name, relations N:M are also
// treated as entities
// Returns true if there are repeated entity names
// false if there are not repeated entity names
export function repeatedEntities(graph) {
    const entityNames = new Set();

    for (const entity of graph.entities) {
        if (entityNames.has(entity.name)) {
            return true; // Found a duplicate name
        }
        entityNames.add(entity.name);
    }

    // Check for N:M relations as well
    for (const relation of graph.relations) {
        if (relation.canHoldAttributes && entityNames.has(relation.name)) {
            return true; // Found a duplicate name
        }
        entityNames.add(relation.name);
    }

    return false; // No duplicates found
}

// This function checks for repeated attributes in an entity,
// relations N:M (these are the ones that have a key `canHoldAttributes`
// set to true) are also treated as entities.
// Returns true if there are repeated attribute names in any entity
// false if there are no repetitions.
// NOTE: Every entity should be treated differently; there can be repeated
// attributes in different entities.
export function repeatedAttributesInEntity(graph) {
    const hasRepeatedAttributes = (attributes) => {
        const attributeNames = new Set();
        for (const attribute of attributes) {
            if (attributeNames.has(attribute.name)) {
                return true;
            }
            attributeNames.add(attribute.name);
        }
        return false;
    };

    // Check entities for repeated attributes
    for (const entity of graph.entities) {
        if (hasRepeatedAttributes(entity.attributes)) {
            return true;
        }
    }

    // Check N:M relations for repeated attributes
    for (const relation of graph.relations) {
        if (
            relation.canHoldAttributes &&
            hasRepeatedAttributes(relation.attributes)
        ) {
            return true;
        }
    }

    return false; // No repeated attributes found in any entity or N:M relation
}

export function entitiesWithoutAttributes(graph) {
    // Check entities
    for (const entity of graph.entities) {
        if (!entity.attributes || entity.attributes.length === 0) {
            return true; // Found an entity without attributes
        }
    }

    // Check N:M relations (relations that can hold attributes)
    for (const relation of graph.relations) {
        if (
            relation.canHoldAttributes &&
            (!relation.attributes || relation.attributes.length === 0)
        ) {
            return true; // Found an N:M relation without attributes
        }
    }

    return false; // No entities or N:M relations without attributes found
}

export function relationsUnconnected(graph) {
    for (const relation of graph.relations) {
        if (
            !relation.side1.idMx ||
            !relation.side2.idMx ||
            relation.side1.idMx === "" ||
            relation.side2.idMx === ""
        ) {
            return true; // Found an unconnected relation
        }
    }
    return false; // All relations are connected
}

export function notNMRelationsWithAttributes(graph) {
    for (const relation of graph.relations) {
        if (!relation.canHoldAttributes && relation.attributes !== []) {
            return true; // Found an relation that cant hold attributes that holds them
        }
    }
    return false;
}

export const POSSIBLE_CARDINALITIES = ["0:1", "0:N", "1:1", "1:N"];

// TODO: Return some diagnostics
export function cardinalitiesNotValid(graph) {
    for (const relation of graph.relations) {
        const side1Cardinality = relation.side1.cardinality;
        const side2Cardinality = relation.side2.cardinality;

        if (
            !POSSIBLE_CARDINALITIES.includes(side1Cardinality) ||
            !POSSIBLE_CARDINALITIES.includes(side2Cardinality)
        ) {
            return true; // Found an invalid cardinality
        }
    }
    return false; // All cardinalities are valid
}
