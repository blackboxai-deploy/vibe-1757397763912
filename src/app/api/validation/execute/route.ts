import { NextRequest, NextResponse } from 'next/server';

// Mock execution status storage (in production, use a proper database or cache)
const executionStatus = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { 
      metadataFile, 
      modules, 
      validationTypes, 
      databaseConfigs,
      executionMode 
    } = await request.json();

    if (!metadataFile) {
      return NextResponse.json(
        { error: 'Metadata file is required' },
        { status: 400 }
      );
    }

    // Generate execution ID
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize execution status
    const execution = {
      id: executionId,
      suite_name: `Validation Suite - ${new Date().toLocaleString()}`,
      status: 'PENDING',
      progress: 0,
      current_step: 'Initializing validation engine...',
      start_time: new Date().toISOString(),
      metadata_file: metadataFile,
      modules: modules || ['all'],
      validation_types: validationTypes || [
        'file_availability',
        'data_loading',
        'data_types',
        'mandatory_fields'
      ],
      database_configs: databaseConfigs,
      execution_mode: executionMode || 'sequential',
      steps: [
        'Initializing validation engine...',
        'Loading metadata configuration...',
        'Establishing database connections...',
        'Validating file availability...',
        'Checking Autosys job status...',
        'Validating data loading...',
        'Performing data type validation...',
        'Checking mandatory fields...',
        'Generating reports...'
      ],
      current_step_index: 0
    };

    executionStatus.set(executionId, execution);

    // Start async execution simulation
    simulateExecution(executionId);

    return NextResponse.json(
      {
        message: 'Validation execution started',
        executionId,
        execution
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error starting validation execution:', error);
    return NextResponse.json(
      { error: 'Failed to start validation execution' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (executionId) {
      // Get specific execution status
      const execution = executionStatus.get(executionId);
      if (!execution) {
        return NextResponse.json(
          { error: 'Execution not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ execution });
    } else {
      // Get all executions
      const executions = Array.from(executionStatus.values());
      return NextResponse.json({ executions });
    }

  } catch (error) {
    console.error('Error fetching execution status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution status' },
      { status: 500 }
    );
  }
}

// Simulate execution progress
async function simulateExecution(executionId: string) {
  const execution = executionStatus.get(executionId);
  if (!execution) return;

  execution.status = 'RUNNING';
  execution.progress = 10;
  execution.current_step = execution.steps[0];
  executionStatus.set(executionId, execution);

  // Simulate step-by-step execution
  for (let i = 1; i < execution.steps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay per step
    
    const currentExecution = executionStatus.get(executionId);
    if (!currentExecution) return;

    currentExecution.progress = Math.min(95, (i / execution.steps.length) * 100);
    currentExecution.current_step = execution.steps[i];
    currentExecution.current_step_index = i;
    
    // Simulate some failures occasionally
    if (Math.random() < 0.1 && i > 3) { // 10% chance of failure after step 3
      currentExecution.status = 'ERROR';
      currentExecution.end_time = new Date().toISOString();
      currentExecution.error = `Validation failed at step: ${execution.steps[i]}`;
      executionStatus.set(executionId, currentExecution);
      return;
    }

    executionStatus.set(executionId, currentExecution);
  }

  // Complete execution
  const finalExecution = executionStatus.get(executionId);
  if (finalExecution) {
    finalExecution.status = 'COMPLETED';
    finalExecution.progress = 100;
    finalExecution.current_step = 'Execution completed successfully';
    finalExecution.end_time = new Date().toISOString();
    
    // Add mock results summary
    finalExecution.results_summary = {
      total_tests: Math.floor(Math.random() * 100) + 50,
      passed_tests: 0,
      failed_tests: 0,
      warning_tests: Math.floor(Math.random() * 5),
      pass_rate: 0,
      execution_time: Math.floor(Math.random() * 300) + 60 // 1-5 minutes
    };

    finalExecution.results_summary.passed_tests = Math.floor(
      finalExecution.results_summary.total_tests * (0.85 + Math.random() * 0.1)
    );
    finalExecution.results_summary.failed_tests = 
      finalExecution.results_summary.total_tests - 
      finalExecution.results_summary.passed_tests - 
      finalExecution.results_summary.warning_tests;
    
    finalExecution.results_summary.pass_rate = 
      (finalExecution.results_summary.passed_tests / finalExecution.results_summary.total_tests) * 100;

    executionStatus.set(executionId, finalExecution);
  }
}