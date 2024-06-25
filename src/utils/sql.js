// This function takes the graph and prepares the relations
// for the extractTables function
export function filterTables(graph) {
    const entities = [...graph.entities]; // Clone entities to avoid mutating the original graph
    const usedEntities = new Set(); // Track used entities
    const tables = [];

    function getCardinalityType(max1, max2) {
        const combinedCardinality = `${max1}:${max2}`;
        const reversedCombinedCardinality = `${max2}:${max1}`;

        let type;

        if (combinedCardinality === "1:1") {
            type = "1:1";
        } else if (
            combinedCardinality === "1:N" ||
            reversedCombinedCardinality === "1:N"
        ) {
            type = "1:N";
        } else if (combinedCardinality === "N:N") {
            type = "N:M";
        } else {
            type = "Unknown"; // This should never happen if data is correct
        }

        return type;
    }

    function processRelation(relation) {
        const side1 = relation.side1;
        const side2 = relation.side2;
        const cardinalityType = getCardinalityType(
            side1.cardinality.split(":")[1],
            side2.cardinality.split(":")[1],
        );

        const table = {
            name: relation.name,
            type: cardinalityType,
            side1: {
                entity: entities.find((e) => e.idMx === side1.entity.idMx),
                cardinality: {
                    minimum: side1.cardinality.split(":")[0],
                    maximum: side1.cardinality.split(":")[1],
                },
            },
            side2: {
                entity: entities.find((e) => e.idMx === side2.entity.idMx),
                cardinality: {
                    minimum: side2.cardinality.split(":")[0],
                    maximum: side2.cardinality.split(":")[1],
                },
            },
            attributes: [...relation.attributes],
        };

        // Mark entities as used
        usedEntities.add(side1.entity.idMx);
        usedEntities.add(side2.entity.idMx);

        return table;
    }

    // Process relations first
    for (const relation of graph.relations) {
        tables.push(processRelation(relation));
    }

    // Add remaining entities as tables
    for (const entity of entities) {
        if (!usedEntities.has(entity.idMx)) {
            tables.push(entity);
        }
    }

    return tables;
}

export function process1NRelation(relation) {
    const { side1, side2 } = relation;

    let oneSide;
    let manySide;

    // Determine which side is 1 and which is N
    if (side1.cardinality.maximum === "1") {
        oneSide = side1;
        manySide = side2;
    } else {
        oneSide = side2;
        manySide = side1;
    }

    // Determine the notnull property
    const notnull = oneSide.cardinality.minimum === "1";

    // Table for the entity with maximum 1
    const oneSideTable = {
        name: oneSide.entity.name,
        attributes: oneSide.entity.attributes.map((attr) => ({
            name: attr.name,
            key: attr.key,
            // notnull: notnull,
        })),
    };

    // Table for the entity with maximum N
    const manySideTable = {
        name: manySide.entity.name,
        attributes: [
            ...manySide.entity.attributes.map((attr) => ({
                name: attr.name,
                key: attr.key,
                notnull: false, // Assuming the original notnull property for attributes
            })),
            ...oneSide.entity.attributes
                .filter((attr) => attr.key) // Only include key attributes
                .map((attr) => {
                    return {
                        name: `${attr.name}_${oneSide.entity.name}`,
                        key: false,
                        notnull: notnull,
                        foreign_key: oneSide.entity.name,
                    };
                }),
        ],
    };

    // Relación reflexiva, se crea solo una tabla
    if (side1.entity.name === side2.entity.name) {
        return [manySideTable];
    }

    return [oneSideTable, manySideTable];
}

export function process11Relation(relation) {
    const { side1, side2 } = relation;
    if (
        side1.cardinality.minimum === "1" &&
        side2.cardinality.minimum === "1" &&
        side1.cardinality.maximum === "1" &&
        side2.cardinality.maximum === "1"
    ) {
        // Extract attributes from both sides
        const side1Attributes = side1.entity.attributes.map((attr) => ({
            name: `${attr.name}_${side1.entity.name}`,
            key: attr.key,
            notnull: false,
            unique: false,
        }));

        const side2Attributes = side2.entity.attributes.map((attr) => ({
            name: `${attr.name}_${side2.entity.name}`,
            key: false,
            notnull: attr.key,
            unique: attr.key,
        }));

        // Merge attributes, ensuring PKs are correctly set
        const mergedAttributes = [...side1Attributes, ...side2Attributes];

        // Create the resulting table
        const resultTable = {
            name: `${relation.name}`,
            attributes: mergedAttributes,
        };

        return [resultTable];
    } // Case where one side has (0,1) cardinality or both sides have equal minimum cardinality
    let tableWithForeignKey;
    let tableWithoutForeignKey;
    let foreignKeySide;
    let primaryKeySide;
    let notnull = false;

    if (
        side1.cardinality.minimum === "0" &&
        side2.cardinality.minimum === "0"
    ) {
        // Both sides have the same minimum cardinality
        foreignKeySide = side1;
        primaryKeySide = side2;
    } else {
        notnull = true;
        // Use ternary operators to determine foreignKeySide and primaryKeySide
        foreignKeySide = side1.cardinality.minimum === "0" ? side1 : side2;
        primaryKeySide = side1.cardinality.minimum === "0" ? side2 : side1;
    }

    const primaryKeyAttributes = primaryKeySide.entity.attributes.map(
        (attr) => ({
            name: attr.name,
            key: attr.key,
            notnull: false,
            unique: false,
        }),
    );

    const foreignKeyAttributes = foreignKeySide.entity.attributes.map(
        (attr) => ({
            name: attr.name,
            key: attr.key,
            notnull: false,
            unique: false,
        }),
    );

    // Add foreign key attribute to the foreign key side
    const foreignKeyAttribute = primaryKeySide.entity.attributes.find(
        (attr) => attr.key,
    );
    if (foreignKeyAttribute) {
        foreignKeyAttributes.push({
            name: `${foreignKeyAttribute.name}_${primaryKeySide.entity.name}`,
            key: false,
            notnull: notnull,
            unique: true,
            foreign_key: primaryKeySide.entity.name,
        });
    }

    tableWithForeignKey = {
        name: `${foreignKeySide.entity.name}`,
        attributes: foreignKeyAttributes,
    };

    tableWithoutForeignKey = {
        name: `${primaryKeySide.entity.name}`,
        attributes: primaryKeyAttributes,
    };

    // Si la relación es reflexiva solo se devuelve esta tabla
    if (side1.entity.name === side2.entity.name) {
        return [tableWithForeignKey];
    }

    return [tableWithoutForeignKey, tableWithForeignKey];
}

export function processNMRelation(relation) {
    const { side1, side2, attributes } = relation;

    // Extract attributes from both sides
    const side1Entity = side1.entity;
    const side2Entity = side2.entity;

    const side1Attributes = side1Entity.attributes.map((attr) => ({
        name: attr.name,
        key: attr.key,
        notnull: false,
        unique: false,
    }));

    const side2Attributes = side2Entity.attributes.map((attr) => ({
        name: attr.name,
        key: attr.key,
        notnull: false,
        unique: false,
    }));

    // First table for side1 entity
    const firstTable = {
        name: side1Entity.name,
        attributes: side1Attributes,
    };

    // Second table for side2 entity
    const secondTable = {
        name: side2Entity.name,
        attributes: side2Attributes,
    };

    // Third table for the relation
    const primaryKeyAttributeSide1 = side1Entity.attributes.find(
        (attr) => attr.key,
    );
    const primaryKeyAttributeSide2 = side2Entity.attributes.find(
        (attr) => attr.key,
    );

    const thirdTableAttributes = [
        {
            name: `${primaryKeyAttributeSide1.name}_${side1Entity.name}`,
            key: true,
            foreign_key: side1Entity.name,
        },
        {
            name: `${primaryKeyAttributeSide2.name}_${side2Entity.name}`,
            key: true,
            foreign_key: side2Entity.name,
        },
        ...attributes.map((attr) => ({
            name: attr.name,
            key: false,
        })),
    ];

    const thirdTable = {
        name: relation.name,
        attributes: thirdTableAttributes,
    };

    // La relación es reflexiva y por tanto first y second table
    // son iguales y solo necesitamos una de las dos
    if (side1.entity.name === side2.entity.name) {
        return [firstTable, thirdTable];
    }

    return [firstTable, secondTable, thirdTable];
}

const getSQLType = (attribute) => {
    // Assuming all attributes are of type VARCHAR for simplicity
    return "VARCHAR(40)";
};

const sanitizeName = (name) => {
    return name.replace(/\s+/g, "_");
};

const createTableSQL = (table) => {
    const columns = table.attributes
        .map((attr) => {
            let columnDef = `${sanitizeName(attr.name)} ${getSQLType(attr)}`;
            if (attr.key && !attr.foreign_key) columnDef += " PRIMARY KEY";
            if (attr.unique) columnDef += " UNIQUE";
            if (attr.notnull) columnDef += " NOT NULL";
            if (attr.foreign_key)
                columnDef += ` REFERENCES ${sanitizeName(attr.foreign_key)}`;
            return columnDef;
        })
        .join(",\n  ");

    // Check for composite primary key
    const compositePrimaryKey = table.attributes
        .filter((attr) => attr.key && attr.foreign_key)
        .map((attr) => sanitizeName(attr.name))
        .join(", ");

    const primaryKeyClause = compositePrimaryKey
        ? `, \n  PRIMARY KEY (${compositePrimaryKey})`
        : "";

    return `CREATE TABLE ${sanitizeName(
        table.name,
    )} (\n  ${columns}${primaryKeyClause}\n);`;
};

export function generate1NSQL(tables) {
    const sql = tables.map(createTableSQL).join("\n\n");
    return sql;
}

export function generate11SQL(tables) {
    const sql = tables.map(createTableSQL).join("\n\n");
    return sql;
}

export function generateNMSQL(tables) {
    const sql = tables.map(createTableSQL).join("\n\n");
    return sql;
}

// Generate SQL
export function generateSQL(graph) {
    const tables = filterTables(graph);
    const tableMap = new Map(); // Track processed tables and their attributes

    for (const table of tables) {
        let processedTablesArray;
        switch (table.type) {
            case "1:1":
                processedTablesArray = process11Relation(table);
                break;
            case "1:N":
                processedTablesArray = process1NRelation(table);
                break;
            case "N:M":
                processedTablesArray = processNMRelation(table);
                break;
            default:
                processedTablesArray = [table];
                break;
        }

        // Add the processed tables to the map, merging attributes if needed
        for (const processedTable of processedTablesArray) {
            if (tableMap.has(processedTable.name)) {
                const existingTable = tableMap.get(processedTable.name);
                const existingAttributes = new Set(
                    existingTable.attributes.map((attr) => attr.name),
                );
                processedTable.attributes.forEach((attr) => {
                    if (!existingAttributes.has(attr.name)) {
                        existingTable.attributes.push(attr);
                    }
                });
            } else {
                tableMap.set(processedTable.name, processedTable);
            }
        }
    }

    // Generate SQL script from the table map
    let sqlScript = "";
    for (const table of tableMap.values()) {
        sqlScript += createTableSQL(table) + "\n\n";
    }

    return sqlScript.trim();
}
