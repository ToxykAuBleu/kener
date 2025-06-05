/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return new Promise(async (resolve) => {
    // Due to alter() limitations on columns (specialy with SQlite and Amazon Redshift),
    // we recreate the entire table with new modifications.
    await knex.schema.createTable("incidents_temp", (table) => {
      table.increments("id").primary();
      table.string("title", 255).notNullable();
      table.integer("start_date_time");
      table.integer("end_date_time");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.string("status", 255).defaultTo("ACTIVE");
      table.string("state", 255).defaultTo("INVESTIGATING");
      table.text("incident_type").defaultTo("INCIDENT");
      table.text("incident_source").defaultTo("DASHBOARD");
      table.text("maintenance_strategy").nullable();
      table.text("cron").nullable();
      table.integer("maintenance_duration").nullable();
    });
    // Moving old data to new table.
    const incidents = await knex("incidents").select("*");
    for (const incident of incidents) {
      await knex("incidents_temp").insert({
        id: incident.id,
        title: incident.title,
        start_date_time: incident.start_date_time,
        end_date_time: incident.end_date_time,
        created_at: incident.created_at,
        updated_at: incident.updated_at,
        status: incident.status,
        state: incident.state,
        incident_type: incident.incident_type,
        incident_source: incident.incident_source,
        maintenance_strategy: incident.incident_type === "MAINTENANCE" ? "SINGLE" : null,
        cron: null,
        maintenance_duration: null,
      });
    }
    // Deleting old table and renaming new one.
    await knex.schema.dropTable("incidents");
    await knex.schema.renameTable("incidents_temp", "incidents");

    await knex.schema.createTable("maintenances_recurrence", (table) => {
      table.increments("id").primary();
      table.integer("incident_id").notNullable();
      table.integer("start_date_time").notNullable();
      table.integer("end_date_time").notNullable();
      table.boolean("done").defaultTo(false).notNullable();
    });

    resolve();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return new Promise(async (resolve) => {
    await knex.schema.createTable("incidents_temp", (table) => {
      table.increments("id").primary();
      table.string("title", 255).notNullable();
      table.integer("start_date_time").notNullable();
      table.integer("end_date_time");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.string("status", 255).defaultTo("ACTIVE");
      table.string("state", 255).defaultTo("INVESTIGATING");
      table.text("incident_type").defaultTo("INCIDENT");
      table.text("incident_source").defaultTo("DASHBOARD");
    });
    // Moving old data to new table.
    const incidents = await knex("incidents").select("*");
    for (const incident of incidents) {
      await knex("incidents_temp").insert({
        id: incident.id,
        title: incident.title,
        start_date_time: incident.start_date_time ?? Math.floor(Date.now() / 1000), // For safety perpose.
        end_date_time: incident.end_date_time,
        created_at: incident.created_at,
        updated_at: incident.updated_at,
        status: incident.status,
        state: incident.state,
        incident_type: incident.incident_type,
        incident_source: incident.incident_source,
      });
    }
    // Deleting old table and renaming new one.
    await knex.schema.dropTable("incidents");
    await knex.schema.renameTable("incidents_temp", "incidents");

    await knex.schema.dropTable("maintenances_recurrence");
    resolve();
  });
}
