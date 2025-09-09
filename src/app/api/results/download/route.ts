import { NextRequest, NextResponse } from 'next/server';

// Mock results data - in production, this would come from a database
const mockResultsData = {
  'exec_sample_123': {
    execution_id: 'exec_sample_123',
    suite_name: 'Customer Data Validation Suite',
    execution_date: '2025-01-15T10:30:00Z',
    total_duration: '2m 15s',
    summary: {
      total_tests: 156,
      passed_tests: 142,
      failed_tests: 12,
      warning_tests: 2,
      pass_rate: 91.03
    },
    test_cases: [
      {
        test_id: 'TC_001',
        test_name: 'File Availability Check',
        module: 'CUSTOMER_DATA',
        test_type: 'file_availability',
        status: 'PASSED',
        execution_time: '0.5s',
        description: 'Verify customer feed file exists in expected location',
        expected_result: 'File exists: /feeds/customer_daily_20250115.csv',
        actual_result: 'File found: /feeds/customer_daily_20250115.csv (2.3MB)',
        error_message: null
      },
      {
        test_id: 'TC_002', 
        test_name: 'Customer ID Mandatory Check',
        module: 'CUSTOMER_DATA',
        test_type: 'mandatory_fields',
        status: 'FAILED',
        execution_time: '1.2s',
        description: 'Ensure Customer_ID field is not null in all records',
        expected_result: '0 null values in Customer_ID column',
        actual_result: '3 null values found in Customer_ID column',
        error_message: 'Rows 145, 267, 401 contain null Customer_ID values'
      },
      {
        test_id: 'TC_003',
        test_name: 'Email Format Validation',
        module: 'CUSTOMER_DATA', 
        test_type: 'pattern_matching',
        status: 'WARNING',
        execution_time: '2.1s',
        description: 'Validate email addresses follow proper format',
        expected_result: 'All emails match regex pattern',
        actual_result: '2 emails with minor formatting issues',
        error_message: 'Non-critical: 2 emails missing .com extension'
      },
      {
        test_id: 'TC_004',
        test_name: 'Data Loading Verification',
        module: 'CUSTOMER_DATA',
        test_type: 'data_loading',
        status: 'PASSED',
        execution_time: '3.8s',
        description: 'Verify all records loaded into staging table',
        expected_result: '1,247 records loaded successfully',
        actual_result: '1,247 records loaded into STG_CUSTOMER table',
        error_message: null
      },
      {
        test_id: 'TC_005',
        test_name: 'Age Range Validation',
        module: 'CUSTOMER_DATA',
        test_type: 'range_validation',
        status: 'FAILED',
        execution_time: '0.9s',
        description: 'Ensure customer age is between 18 and 120',
        expected_result: 'All ages between 18-120',
        actual_result: '5 records with invalid age values',
        error_message: 'Ages outside range: 15, 16, 125, 130, 145'
      }
    ],
    database_info: {
      source_server: 'server1.company.com',
      target_server: 'server2.company.com',
      databases_tested: ['STG_DB', 'PROD_DB'],
      tables_validated: ['STG_CUSTOMER', 'PROD_CUSTOMER', 'REF_STATES']
    },
    metadata_info: {
      file_name: 'Customer_Data_Metadata.xlsx',
      sheets_processed: ['Feed_to_staging', 'Staging to GRI', 'Enumeration', 'Rules'],
      total_rules: 67,
      rules_applied: 67
    }
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');
    const format = searchParams.get('format') || 'json'; // json, excel, html, csv
    
    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    // Get results data (mock data for demo)
    const resultsData = mockResultsData[executionId as keyof typeof mockResultsData] || mockResultsData['exec_sample_123'];
    
    // Generate different format responses
    switch (format.toLowerCase()) {
      case 'excel':
        return generateExcelReport(resultsData);
      case 'html':
        return generateHTMLReport(resultsData);
      case 'csv':
        return generateCSVReport(resultsData);
      case 'pdf':
        return generatePDFReport(resultsData);
      default:
        return NextResponse.json(resultsData);
    }

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

function generateExcelReport(data: any) {
  // Excel format simulation - in production, use libraries like xlsx or exceljs
  const excelContent = generateExcelLikeContent(data);
  
  return new NextResponse(excelContent, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="validation_results_${data.execution_id}.xlsx"`,
    },
  });
}

function generateHTMLReport(data: any) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Validation Results - ${data.suite_name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #007bff; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px; }
        .test-detail { margin-bottom: 10px; }
        .error-message { color: #dc3545; font-style: italic; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Data Validation Results Report</h1>
        <h2>${data.suite_name}</h2>
        <p>Execution ID: ${data.execution_id} | Date: ${new Date(data.execution_date).toLocaleString()} | Duration: ${data.total_duration}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">${data.summary.total_tests}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.summary.passed_tests}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.summary.failed_tests}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.summary.pass_rate}%</div>
            <div class="metric-label">Pass Rate</div>
        </div>
    </div>

    <h3>🧪 Test Case Details</h3>
    <table>
        <thead>
            <tr>
                <th>Test ID</th>
                <th>Test Name</th>
                <th>Module</th>
                <th>Type</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Description</th>
                <th>Result</th>
            </tr>
        </thead>
        <tbody>
            ${data.test_cases.map((test: any) => `
            <tr>
                <td>${test.test_id}</td>
                <td>${test.test_name}</td>
                <td>${test.module}</td>
                <td>${test.test_type}</td>
                <td class="status-${test.status.toLowerCase()}">${test.status}</td>
                <td>${test.execution_time}</td>
                <td>${test.description}</td>
                <td>
                    <div class="test-detail"><strong>Expected:</strong> ${test.expected_result}</div>
                    <div class="test-detail"><strong>Actual:</strong> ${test.actual_result}</div>
                    ${test.error_message ? `<div class="error-message"><strong>Error:</strong> ${test.error_message}</div>` : ''}
                </td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <h4>📋 Execution Environment</h4>
        <p><strong>Source Server:</strong> ${data.database_info.source_server}</p>
        <p><strong>Target Server:</strong> ${data.database_info.target_server}</p>
        <p><strong>Databases:</strong> ${data.database_info.databases_tested.join(', ')}</p>
        <p><strong>Tables:</strong> ${data.database_info.tables_validated.join(', ')}</p>
        <p><strong>Metadata File:</strong> ${data.metadata_info.file_name}</p>
        <p><strong>Rules Applied:</strong> ${data.metadata_info.rules_applied}/${data.metadata_info.total_rules}</p>
        
        <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
            Generated by Data Validation Testing Framework on ${new Date().toLocaleString()}
        </p>
    </div>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="validation_results_${data.execution_id}.html"`,
    },
  });
}

function generateCSVReport(data: any) {
  const csvHeader = 'Test ID,Test Name,Module,Type,Status,Duration,Description,Expected Result,Actual Result,Error Message\n';
  const csvRows = data.test_cases.map((test: any) => 
    `"${test.test_id}","${test.test_name}","${test.module}","${test.test_type}","${test.status}","${test.execution_time}","${test.description}","${test.expected_result}","${test.actual_result}","${test.error_message || ''}"`
  ).join('\n');
  
  const csvContent = csvHeader + csvRows;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="validation_results_${data.execution_id}.csv"`,
    },
  });
}

function generatePDFReport(data: any) {
  // PDF simulation - in production, use libraries like jsPDF or puppeteer
  const pdfContent = `PDF Report for ${data.suite_name} - Generated ${new Date().toLocaleString()}`;
  
  return new NextResponse(pdfContent, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="validation_results_${data.execution_id}.pdf"`,
    },
  });
}

function generateExcelLikeContent(data: any) {
  // Simplified Excel content simulation
  return `Execution ID,${data.execution_id}
Suite Name,${data.suite_name}
Execution Date,${data.execution_date}
Total Duration,${data.total_duration}

SUMMARY
Total Tests,${data.summary.total_tests}
Passed Tests,${data.summary.passed_tests}
Failed Tests,${data.summary.failed_tests}
Warning Tests,${data.summary.warning_tests}
Pass Rate,${data.summary.pass_rate}%

TEST CASES
Test ID,Test Name,Module,Type,Status,Duration,Description,Expected Result,Actual Result,Error Message
${data.test_cases.map((test: any) => 
  `${test.test_id},${test.test_name},${test.module},${test.test_type},${test.status},${test.execution_time},"${test.description}","${test.expected_result}","${test.actual_result}","${test.error_message || ''}"`
).join('\n')}`;
}