import { v4 as uuidv4 } from 'uuid';

export async function importTemplate(tenantId: string, templateId: string, client: any) {
  try {
    // 1. Fetch template data
    const templateRes = await client.query('SELECT * FROM global_templates WHERE id = $1', [templateId]);
    if (templateRes.rowCount === 0) throw new Error('Template not found');
    const template = templateRes.rows[0];

    // 2. Fetch template departments
    const deptRes = await client.query('SELECT * FROM template_departments WHERE template_id = $1', [templateId]);
    const templateDepts = deptRes.rows;

    // 3. Map old IDs to new IDs
    const idMap: Record<string, string> = {};
    
    // 4. Import Departments (preserving hierarchy)
    // Sort by depth to ensure parents are created first
    const sortedDepts = [...templateDepts].sort((a, b) => a.depth - b.depth);

    for (const td of sortedDepts) {
      const newDeptId = uuidv4();
      idMap[td.id] = newDeptId;

      await client.query(
        `INSERT INTO departments (id, tenant_id, name, parent_department_id, depth) 
         VALUES ($1, $2, $3, $4, $5)`,
        [newDeptId, tenantId, td.name, td.parent_id ? idMap[td.parent_id] : null, td.depth]
      );
    }

    // 5. Import Designations
    const desRes = await client.query('SELECT * FROM template_designations WHERE template_id = $1', [templateId]);
    for (const des of desRes.rows) {
      await client.query(
        `INSERT INTO designations (id, tenant_id, name) VALUES ($1, $2, $3)`,
        [uuidv4(), tenantId, des.name || des.title]
      );
    }

    // 6. Fetch and Update hierarchy labels
    const labelRes = await client.query('SELECT depth, label FROM template_labels WHERE template_id = $1', [templateId]);
    const customLabels: Record<string, string> = {};
    labelRes.rows.forEach((row: any) => {
      if (row.depth === 0) customLabels.level_0 = row.label;
      else if (row.depth === 1) customLabels.level_1 = row.label;
      else if (row.depth === 2) customLabels.level_2 = row.label;
      else if (row.depth === 3) customLabels.level_3 = row.label;
      
      // Legacy mapping
      if (row.depth === 1) customLabels.department = row.label;
      if (row.depth === 0) customLabels.organization = row.label;
    });

    // 7. Update tenant settings
    const newSettings = {
      hierarchy: {
        custom_labels: customLabels,
        label_vocabulary: template.org_type === 'university' ? 'university' : 'corporate'
      },
      ...template.available_roles ? { roles: template.available_roles } : {}
    };

    await client.query(
      `UPDATE tenants 
       SET settings = settings || $1::jsonb 
       WHERE id = $2`,
      [JSON.stringify(newSettings), tenantId]
    );

    return true;
  } catch (error) {
    console.error('Template Import Error:', error);
    throw error;
  }
}
