export function validateGraph(graph) {
    // TODO: Check:
    // - [x] Non repeated entity name
    // - Non repeated attributes in the same entity
    // - Every entity should have at least one attribute
    // - Every relation connects two entities or with itself
    // - Every relation has two cardinalities, the possible
    //  cardinalities are:
    //      - 0:1-0:1
    //      - 0:1-1:1
    //      - 0:1-0:N
    //      - 0:1-1:N
    //      - 1:1-0:1
    //      - 1:1-1:1
    //      - 1:1-0:N
    //      - 1:1-1:N
    //      - 0:N-0:1
    //      - 0:N-1:1
    //      - 0:N-0:N
    //      - 0:N-1:N
    //      - 1:N-1:1
    //      - 1:N-0:N
    //      - 1:N-1:N
    // - Interrelations weak are always 1:1 (strong) - 0:N (weak)
    // - A weak entity can only have dependence relations for id
    //   with a strong entity
    // - Every strong entity has an only primary key
    // - Every weak entity has an only discriminant
    // - Only the N:M relations can hold attributes and can't be keys
    // - There can't be any interrelations connected directly, or a
    //   interrelation connected with itself
    // - A reflexive relation can't be strong <---> weak
    // Perform all checks
    const noRepeatedNames = !repeatedEntities(graph);

    return noRepeatedNames;
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
