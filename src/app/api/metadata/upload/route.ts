import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Only Excel files (.xlsx, .xls) are supported' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `metadata-${timestamp}-${file.name}`;

    // In a real implementation, you would save the file and parse it
    const fileInfo = {
      id: fileName,
      originalName: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      metadata: {
        sheets: [
          'Feed_to_staging',
          'Staging to GRI', 
          'Enumeration',
          'Rules',
          'Patterns',
          'Reconciliations'
        ],
        validated: true,
        recordCounts: {
          feedMetadata: 45,
          stagingMetadata: 32,
          enumerations: 12,
          patterns: 8,
          reconciliationRules: 15
        }
      }
    };

    return NextResponse.json(
      {
        message: 'Metadata file uploaded successfully',
        file: fileInfo
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error uploading metadata file:', error);
    return NextResponse.json(
      { error: 'Failed to upload metadata file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return list of uploaded metadata files
    const mockFiles = [
      {
        id: 'metadata-2024-01-15-sample.xlsx',
        originalName: 'Customer_Data_Metadata.xlsx',
        size: 156789,
        uploadedAt: '2024-01-15T10:30:25.000Z',
        validated: true,
        recordCounts: {
          feedMetadata: 45,
          stagingMetadata: 32,
          enumerations: 12
        }
      }
    ];

    return NextResponse.json({ files: mockFiles });

  } catch (error) {
    console.error('Error fetching metadata files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata files' },
      { status: 500 }
    );
  }
}