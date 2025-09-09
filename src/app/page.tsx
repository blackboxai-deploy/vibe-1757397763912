"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PlayCircle, Upload, Settings, BarChart3, CheckCircle2, AlertTriangle, Clock, Database, FileText, Download, ExternalLink } from 'lucide-react';

interface ExecutionStatus {
  id: string;
  suite_name: string;
  status: 'RUNNING' | 'COMPLETED' | 'ERROR' | 'PENDING';
  progress: number;
  current_step: string;
  start_time: string;
  end_time?: string;
  results_summary?: {
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    warning_tests: number;
    pass_rate: number;
    execution_time: number;
  };
  error?: string;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('upload');
  const [metadataFile, setMetadataFile] = useState<string | null>(null);
  const [currentExecution, setCurrentExecution] = useState<ExecutionStatus | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionStatus[]>([
    // Sample completed execution to show pass/fail status
    {
      id: 'exec_demo_completed',
      suite_name: 'Demo Customer Data Validation',
      status: 'COMPLETED',
      progress: 100,
      current_step: 'Execution completed successfully',
      start_time: '2025-01-15T10:30:00Z',
      end_time: '2025-01-15T10:33:45Z',
      results_summary: {
        total_tests: 25,
        passed_tests: 22,
        failed_tests: 2,
        warning_tests: 1,
        pass_rate: 88.0,
        execution_time: 225
      }
    }
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  // Check API connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/metadata/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedFile(data.file);
        setMetadataFile(data.file.id);
        setActiveTab('configure');
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExecuteValidation = async () => {
    if (!metadataFile) return;

    try {
      const response = await fetch('/api/validation/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadataFile,
          modules: ['CUSTOMER_DATA'],
          validationTypes: ['file_availability', 'data_loading', 'data_types', 'mandatory_fields'],
          executionMode: 'sequential'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentExecution(data.execution);
        setActiveTab('monitor');
        
        // Start polling for updates
        pollExecutionStatus(data.executionId);
      }
    } catch (error) {
      console.error('Execution error:', error);
    }
  };

  const pollExecutionStatus = async (executionId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/validation/execute?executionId=${executionId}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentExecution(data.execution);
          
          if (data.execution.status !== 'RUNNING' && data.execution.status !== 'PENDING') {
            // Add to execution history when completed
            setExecutionHistory(prev => {
              // Check if already exists to avoid duplicates
              const existingIndex = prev.findIndex(exec => exec.id === data.execution.id);
              if (existingIndex >= 0) {
                // Update existing execution
                const updated = [...prev];
                updated[existingIndex] = data.execution;
                return updated;
              } else {
                // Add new execution
                return [...prev, data.execution];
              }
            });
            
            // Switch to results tab to show the completed execution
            setActiveTab('results');
          } else {
            // Continue polling if still running
            setTimeout(poll, 2000);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    setTimeout(poll, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING': return <Clock className="h-4 w-4" />;
      case 'COMPLETED': return <CheckCircle2 className="h-4 w-4" />;
      case 'ERROR': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleDownloadResults = (executionId: string, format: string) => {
    const url = `/api/results/download?executionId=${executionId}&format=${format}`;
    window.open(url, '_blank');
  };

  const handleDownloadTestCases = (validationType?: string, format: string = 'excel') => {
    const params = new URLSearchParams({
      format,
      module: 'SAMPLE_MODULE'
    });
    
    if (validationType) {
      params.append('validationType', validationType);
    }
    
    const url = `/api/testcases/template?${params.toString()}`;
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Data Validation Testing Framework
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive metadata-driven validation for feeds, databases, and business rules
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Execution Status */}
      {currentExecution && (
        <Alert className="mb-6">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge className={getStatusColor(currentExecution.status)}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(currentExecution.status)}
                    <span>{currentExecution.status}</span>
                  </div>
                </Badge>
                <span className="font-medium">{currentExecution.suite_name}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{currentExecution.current_step}</span>
              </div>
              {currentExecution.status === 'RUNNING' && (
                <div className="flex items-center space-x-2 min-w-0 w-48">
                  <Progress value={currentExecution.progress} className="w-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {Math.round(currentExecution.progress)}%
                  </span>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Upload Metadata</span>
          </TabsTrigger>
          <TabsTrigger value="configure" disabled={!metadataFile} className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configure Tests</span>
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Monitor Execution</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>View Results</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Upload Metadata File</span>
              </CardTitle>
              <CardDescription>
                Upload your Excel metadata file containing validation rules, enumerations, patterns, and reconciliation definitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="metadata-file">Metadata Excel File</Label>
                <Input
                  id="metadata-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>

              {uploadedFile && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">File Upload Successful!</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>File:</strong> {uploadedFile.originalName}</p>
                    <p><strong>Size:</strong> {Math.round(uploadedFile.size / 1024)} KB</p>
                    <p><strong>Records:</strong> {uploadedFile.metadata.recordCounts.feedMetadata} feed metadata, {uploadedFile.metadata.recordCounts.stagingMetadata} staging metadata</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Required Sheets:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Feed_to_staging</li>
                    <li>• Staging to GRI</li>
                    <li>• Enumeration</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Optional Sheets:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Rules</li>
                    <li>• Patterns</li>
                    <li>• Reconciliations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configure">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Configure Validation Suite</span>
              </CardTitle>
              <CardDescription>
                Set up database connections, test parameters, and execution options for your validation suite.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Validation Types</h4>
                  <div className="space-y-2">
                    {[
                      'File Availability',
                      'Autosys Job Status', 
                      'Data Loading',
                      'Data Types',
                      'Mandatory Fields',
                      'Unique Constraints',
                      'Range Validation',
                      'Enumeration Checks'
                    ].map((type) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Execution Settings</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="execution" value="sequential" defaultChecked />
                      <span className="text-sm">Sequential Execution</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="execution" value="parallel" />
                      <span className="text-sm">Parallel Execution</span>
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Demo execution without metadata file
                    const demoExecution = {
                      id: `exec_demo_${Date.now()}`,
                      suite_name: `Demo Validation - ${new Date().toLocaleTimeString()}`,
                      status: 'PENDING' as const,
                      progress: 0,
                      current_step: 'Initializing demo validation...',
                      start_time: new Date().toISOString(),
                      metadata_file: 'demo-metadata.xlsx',
                      modules: ['DEMO_MODULE'],
                      validation_types: ['file_availability', 'data_loading', 'data_types'],
                      execution_mode: 'sequential'
                    };
                    setCurrentExecution(demoExecution);
                    setActiveTab('monitor');
                    
                    // Simulate demo execution
                    let progress = 0;
                    const interval = setInterval(() => {
                      progress += Math.random() * 20;
                      if (progress >= 100) {
                        progress = 100;
                        clearInterval(interval);
                        const completedExecution = {
                          ...demoExecution,
                          status: 'COMPLETED' as const,
                          progress: 100,
                          current_step: 'Demo execution completed',
                          end_time: new Date().toISOString(),
                          results_summary: {
                            total_tests: Math.floor(Math.random() * 30) + 20,
                            passed_tests: 0,
                            failed_tests: 0,
                            warning_tests: Math.floor(Math.random() * 3),
                            pass_rate: 0,
                            execution_time: Math.floor(Math.random() * 180) + 60
                          }
                        };
                        completedExecution.results_summary.passed_tests = Math.floor(
                          completedExecution.results_summary.total_tests * (0.75 + Math.random() * 0.2)
                        );
                        completedExecution.results_summary.failed_tests = 
                          completedExecution.results_summary.total_tests - 
                          completedExecution.results_summary.passed_tests - 
                          completedExecution.results_summary.warning_tests;
                        completedExecution.results_summary.pass_rate = 
                          (completedExecution.results_summary.passed_tests / completedExecution.results_summary.total_tests) * 100;
                        
                        setCurrentExecution(completedExecution);
                        setExecutionHistory(prev => [completedExecution, ...prev]);
                        setActiveTab('results');
                      } else {
                        setCurrentExecution(prev => prev ? {...prev, progress, current_step: `Processing validation step ${Math.floor(progress/12) + 1}...`} : null);
                      }
                    }, 1000);
                  }}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Try Demo Execution
                </Button>
                
                <Button onClick={handleExecuteValidation} size="lg" disabled={!metadataFile}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Execute Validation Suite
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor">
          <Card>
            <CardHeader>
              <CardTitle>Execution Monitoring</CardTitle>
              <CardDescription>
                Real-time monitoring of validation execution with progress tracking and live updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentExecution ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{currentExecution.suite_name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Started: {new Date(currentExecution.start_time).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(currentExecution.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(currentExecution.status)}
                        <span>{currentExecution.status}</span>
                      </div>
                    </Badge>
                  </div>

                  {currentExecution.status === 'RUNNING' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{currentExecution.current_step}</span>
                        <span>{Math.round(currentExecution.progress)}%</span>
                      </div>
                      <Progress value={currentExecution.progress} />
                    </div>
                  )}

                  {currentExecution.results_summary && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {currentExecution.results_summary.total_tests}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Tests</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {currentExecution.results_summary.passed_tests}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {currentExecution.results_summary.failed_tests}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(currentExecution.results_summary.pass_rate)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No active execution. Start a validation suite to see monitoring data.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <div className="space-y-6">
            {/* Download Templates Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Download Test Case Templates</span>
                </CardTitle>
                <CardDescription>
                  Download ready-to-use test case templates for different validation types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => handleDownloadTestCases('file_availability', 'excel')}
                  >
                    <Download className="h-4 w-4" />
                    <span>File Availability</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => handleDownloadTestCases('data_loading', 'excel')}
                  >
                    <Download className="h-4 w-4" />
                    <span>Data Loading</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => handleDownloadTestCases('data_types', 'excel')}
                  >
                    <Download className="h-4 w-4" />
                    <span>Data Types</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => handleDownloadTestCases('mandatory_fields', 'excel')}
                  >
                    <Download className="h-4 w-4" />
                    <span>Mandatory Fields</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => handleDownloadTestCases('enumeration_checks', 'excel')}
                  >
                    <Download className="h-4 w-4" />
                    <span>Enumerations</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => handleDownloadTestCases(undefined, 'excel')}
                  >
                    <Download className="h-4 w-4" />
                    <span>All Templates</span>
                  </Button>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Download formats:</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDownloadTestCases(undefined, 'csv')}
                  >
                    CSV
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDownloadTestCases(undefined, 'html')}
                  >
                    HTML
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDownloadTestCases(undefined, 'json')}
                  >
                    JSON
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Results Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Execution Results</span>
                </CardTitle>
                <CardDescription>
                  Historical validation results and detailed analysis with download options
                </CardDescription>
              </CardHeader>
              <CardContent>
                {executionHistory.length > 0 ? (
                  <div className="space-y-4">
                    {executionHistory.map((execution) => (
                      <div key={execution.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{execution.suite_name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(execution.status)}>
                              {execution.status}
                            </Badge>
                            {execution.status === 'COMPLETED' && (
                              <div className="flex space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadResults(execution.id, 'excel')}
                                  className="flex items-center space-x-1"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Excel</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadResults(execution.id, 'html')}
                                  className="flex items-center space-x-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>HTML</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadResults(execution.id, 'csv')}
                                  className="flex items-center space-x-1"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>CSV</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {execution.results_summary && (
                          <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Total: </span>
                              <span className="font-medium">{execution.results_summary.total_tests}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Passed: </span>
                              <span className="font-medium text-green-600">{execution.results_summary.passed_tests}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Failed: </span>
                              <span className="font-medium text-red-600">{execution.results_summary.failed_tests}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Pass Rate: </span>
                              <span className="font-medium">{Math.round(execution.results_summary.pass_rate)}%</span>
                            </div>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Completed: {execution.end_time ? new Date(execution.end_time).toLocaleString() : 'In progress'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No test results available. Execute a validation suite to see results.</p>
                    <Button 
                      variant="outline"
                      onClick={() => handleDownloadResults('exec_sample_123', 'html')}
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View Sample Report</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}