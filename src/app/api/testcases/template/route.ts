import { NextRequest, NextResponse } from 'next/server';

// Template test cases based on validation types
const testCaseTemplates = {
  file_availability: [
    {
      test_id: 'TC_FA_001',
      test_name: 'Feed File Existence Check',
      description: 'Verify that the expected feed file exists in the specified location',
      test_type: 'file_availability',
      preconditions: 'Feed file should be available in the designated folder',
      test_steps: [
        'Navigate to feed file location: /feeds/[module_name]/',
        'Check if file with expected naming pattern exists',
        'Verify file size is greater than 0 bytes',
        'Confirm file is not locked by another process'
      ],
      expected_result: 'Feed file exists and is accessible',
      test_data: 'File path: /feeds/customer_daily_YYYYMMDD.csv',
      priority: 'High',
      module: '[MODULE_NAME]'
    },
    {
      test_id: 'TC_FA_002', 
      test_name: 'File Format Validation',
      description: 'Validate that the feed file is in the expected format (CSV/Excel/etc.)',
      test_type: 'file_availability',
      preconditions: 'Feed file exists and is accessible',
      test_steps: [
        'Open the feed file',
        'Verify file extension matches expected format',
        'Check file header structure',
        'Validate delimiter and encoding'
      ],
      expected_result: 'File format matches specification',
      test_data: 'Expected format: CSV with comma delimiter, UTF-8 encoding',
      priority: 'High',
      module: '[MODULE_NAME]'
    }
  ],
  data_loading: [
    {
      test_id: 'TC_DL_001',
      test_name: 'Record Count Validation',
      description: 'Verify all records from feed file are loaded into staging table',
      test_type: 'data_loading',
      preconditions: 'Feed file processed and data loading completed',
      test_steps: [
        'Count records in source feed file',
        'Count records in staging table for current load',
        'Compare source count vs. loaded count',
        'Verify no data loss during loading process'
      ],
      expected_result: 'Source record count = Staging table record count',
      test_data: 'Query: SELECT COUNT(*) FROM STG_[TABLE_NAME] WHERE LOAD_DATE = [TODAY]',
      priority: 'High',
      module: '[MODULE_NAME]'
    },
    {
      test_id: 'TC_DL_002',
      test_name: 'Data Integrity Check',
      description: 'Ensure data maintains integrity during loading process',
      test_type: 'data_loading',
      preconditions: 'Data loading completed successfully',
      test_steps: [
        'Select sample records from source file',
        'Query corresponding records from staging table',
        'Compare field values for data integrity',
        'Verify no data corruption or truncation'
      ],
      expected_result: 'All sample records match between source and staging',
      test_data: 'Sample size: 10% of total records or minimum 100 records',
      priority: 'Medium',
      module: '[MODULE_NAME]'
    }
  ],
  data_types: [
    {
      test_id: 'TC_DT_001',
      test_name: 'Numeric Field Validation',
      description: 'Validate that numeric fields contain only valid numeric data',
      test_type: 'data_types',
      preconditions: 'Data loaded in staging table',
      test_steps: [
        'Identify all numeric fields from metadata',
        'Query staging table for non-numeric values in numeric fields',
        'Check for proper decimal precision',
        'Verify no overflow/underflow conditions'
      ],
      expected_result: 'All numeric fields contain valid numeric values',
      test_data: 'Query: SELECT * FROM STG_[TABLE] WHERE [NUMERIC_FIELD] NOT LIKE [NUMERIC_PATTERN]',
      priority: 'High',
      module: '[MODULE_NAME]'
    },
    {
      test_id: 'TC_DT_002',
      test_name: 'Date Field Validation',
      description: 'Ensure all date fields contain valid date values in correct format',
      test_type: 'data_types',
      preconditions: 'Data loaded in staging table',
      test_steps: [
        'Identify all date fields from metadata',
        'Check date format consistency (YYYY-MM-DD)',
        'Validate date ranges (no future dates if not allowed)',
        'Verify no invalid dates (Feb 30, etc.)'
      ],
      expected_result: 'All date fields contain valid dates in correct format',
      test_data: 'Expected format: YYYY-MM-DD, Valid range: 1900-01-01 to current date',
      priority: 'High',
      module: '[MODULE_NAME]'
    }
  ],
  mandatory_fields: [
    {
      test_id: 'TC_MF_001',
      test_name: 'Primary Key Null Check',
      description: 'Ensure primary key fields do not contain null values',
      test_type: 'mandatory_fields',
      preconditions: 'Data loaded in staging table, Primary keys identified',
      test_steps: [
        'Identify primary key fields from metadata',
        'Query staging table for null values in primary key fields',
        'Count null occurrences if any',
        'Generate error report for null primary keys'
      ],
      expected_result: '0 null values in any primary key field',
      test_data: 'Query: SELECT COUNT(*) FROM STG_[TABLE] WHERE [PK_FIELD] IS NULL',
      priority: 'Critical',
      module: '[MODULE_NAME]'
    },
    {
      test_id: 'TC_MF_002',
      test_name: 'Required Field Completeness',
      description: 'Verify all mandatory fields are populated according to business rules',
      test_type: 'mandatory_fields',
      preconditions: 'Data loaded in staging table, Mandatory fields defined in metadata',
      test_steps: [
        'Get list of mandatory fields from metadata configuration',
        'For each mandatory field, check for null/empty values',
        'Calculate completeness percentage per field',
        'Generate completeness report'
      ],
      expected_result: '100% completeness for all mandatory fields',
      test_data: 'Metadata sheet: Feed_to_staging, Column: Mandatory = Y',
      priority: 'High',
      module: '[MODULE_NAME]'
    }
  ],
  enumeration_checks: [
    {
      test_id: 'TC_EC_001',
      test_name: 'Valid Enumeration Values',
      description: 'Ensure enumeration fields contain only valid predefined values',
      test_type: 'enumeration_checks',
      preconditions: 'Data loaded, Enumeration values defined in metadata',
      test_steps: [
        'Get enumeration field definitions from metadata',
        'Extract valid values for each enumeration field',
        'Query staging table for invalid enumeration values',
        'Generate report of invalid values and their frequencies'
      ],
      expected_result: 'All enumeration fields contain only valid predefined values',
      test_data: 'Metadata sheet: Enumeration, Valid values list per enumeration name',
      priority: 'Medium',
      module: '[MODULE_NAME]'
    }
  ],
  range_validation: [
    {
      test_id: 'TC_RV_001',
      test_name: 'Numeric Range Validation',
      description: 'Verify numeric fields fall within specified min/max ranges',
      test_type: 'range_validation', 
      preconditions: 'Data loaded, Range definitions available in metadata',
      test_steps: [
        'Identify fields with range constraints from metadata',
        'For each field, check values against min/max bounds',
        'Count out-of-range values',
        'Generate range violation report'
      ],
      expected_result: 'All numeric values within specified ranges',
      test_data: 'Metadata: RangeBottom and RangeTop columns define valid ranges',
      priority: 'Medium',
      module: '[MODULE_NAME]'
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validationType = searchParams.get('validationType');
    const format = searchParams.get('format') || 'json';
    const module = searchParams.get('module') || 'SAMPLE_MODULE';

    let templates;
    
    if (validationType && testCaseTemplates[validationType as keyof typeof testCaseTemplates]) {
      templates = testCaseTemplates[validationType as keyof typeof testCaseTemplates];
    } else {
      // Return all templates
      templates = Object.values(testCaseTemplates).reduce((acc, val) => acc.concat(val), []);
    }

    // Replace placeholder module names
    const processedTemplates = templates.map(template => ({
      ...template,
      module: template.module.replace('[MODULE_NAME]', module),
      test_data: template.test_data.replace(/\[MODULE_NAME\]/g, module),
      expected_result: template.expected_result.replace(/\[MODULE_NAME\]/g, module)
    }));

    switch (format.toLowerCase()) {
      case 'excel':
        return generateTestCaseExcel(processedTemplates, validationType || 'all');
      case 'csv':
        return generateTestCaseCSV(processedTemplates, validationType || 'all');
      case 'html':
        return generateTestCaseHTML(processedTemplates, validationType || 'all');
      default:
        return NextResponse.json({
          validation_type: validationType || 'all',
          total_templates: processedTemplates.length,
          templates: processedTemplates
        });
    }

  } catch (error) {
    console.error('Error generating test case templates:', error);
    return NextResponse.json(
      { error: 'Failed to generate test case templates' },
      { status: 500 }
    );
  }
}

function generateTestCaseExcel(templates: any[], validationType: string) {
  const excelContent = `Test Case Templates - ${validationType.toUpperCase()}

Test ID,Test Name,Description,Test Type,Preconditions,Test Steps,Expected Result,Test Data,Priority,Module
${templates.map(t => 
  `"${t.test_id}","${t.test_name}","${t.description}","${t.test_type}","${t.preconditions}","${Array.isArray(t.test_steps) ? t.test_steps.join('; ') : t.test_steps}","${t.expected_result}","${t.test_data}","${t.priority}","${t.module}"`
).join('\n')}`;

  return new NextResponse(excelContent, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="test_case_templates_${validationType}.xlsx"`,
    },
  });
}

function generateTestCaseCSV(templates: any[], validationType: string) {
  const csvHeader = 'Test ID,Test Name,Description,Test Type,Preconditions,Test Steps,Expected Result,Test Data,Priority,Module\n';
  const csvRows = templates.map(t => 
    `"${t.test_id}","${t.test_name}","${t.description}","${t.test_type}","${t.preconditions}","${Array.isArray(t.test_steps) ? t.test_steps.join('; ') : t.test_steps}","${t.expected_result}","${t.test_data}","${t.priority}","${t.module}"`
  ).join('\n');
  
  const csvContent = csvHeader + csvRows;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="test_case_templates_${validationType}.csv"`,
    },
  });
}

function generateTestCaseHTML(templates: any[], validationType: string) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Case Templates - ${validationType.toUpperCase()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .test-case { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #f9f9f9; }
        .test-header { font-size: 1.2em; font-weight: bold; color: #333; margin-bottom: 10px; }
        .test-field { margin-bottom: 8px; }
        .field-label { font-weight: bold; color: #555; }
        .steps-list { margin-left: 20px; }
        .priority-high { color: #dc3545; }
        .priority-medium { color: #ffc107; }
        .priority-critical { color: #6f42c1; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Test Case Templates</h1>
        <h2>Validation Type: ${validationType.toUpperCase()}</h2>
        <p>Generated on ${new Date().toLocaleString()} | Total Templates: ${templates.length}</p>
    </div>
    
    ${templates.map(template => `
    <div class="test-case">
        <div class="test-header">${template.test_id}: ${template.test_name}</div>
        
        <div class="test-field">
            <span class="field-label">Description:</span> ${template.description}
        </div>
        
        <div class="test-field">
            <span class="field-label">Test Type:</span> ${template.test_type}
        </div>
        
        <div class="test-field">
            <span class="field-label">Module:</span> ${template.module}
        </div>
        
        <div class="test-field">
            <span class="field-label">Priority:</span> 
            <span class="priority-${template.priority.toLowerCase()}">${template.priority}</span>
        </div>
        
        <div class="test-field">
            <span class="field-label">Preconditions:</span> ${template.preconditions}
        </div>
        
        <div class="test-field">
            <span class="field-label">Test Steps:</span>
            ${Array.isArray(template.test_steps) ? 
              `<ol class="steps-list">${template.test_steps.map((step: string) => `<li>${step}</li>`).join('')}</ol>` 
              : template.test_steps}
        </div>
        
        <div class="test-field">
            <span class="field-label">Expected Result:</span> ${template.expected_result}
        </div>
        
        <div class="test-field">
            <span class="field-label">Test Data:</span> ${template.test_data}
        </div>
    </div>
    `).join('')}
    
    <div style="margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 6px; text-align: center; color: #666;">
        Generated by Data Validation Testing Framework<br>
        Use these templates as a starting point for your validation test cases
    </div>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="test_case_templates_${validationType}.html"`,
    },
  });
}