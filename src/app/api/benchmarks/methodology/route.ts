import { NextResponse } from 'next/server';
import { generateMethodologyPdf } from '@/lib/export/methodology-pdf';

export async function GET() {
  try {
    const pdfBuffer = generateMethodologyPdf();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Benchmark_Methodology_India_Steel_MSME.pdf"',
      },
    });
  } catch (error) {
    console.error('GET /api/benchmarks/methodology error:', error);
    return NextResponse.json({ error: 'Failed to generate methodology PDF' }, { status: 500 });
  }
}
