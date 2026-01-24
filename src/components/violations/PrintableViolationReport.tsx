/**
 * Printable Violation Report Template
 * Based on ASTU Official Format
 * 
 * Following Ethiopian university academic discipline report standards
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import universityLogo from '@/assets/university-logo.png';

interface ViolationData {
  id: string;
  incident_date: string;
  course_name: string;
  course_code: string;
  exam_type: string;
  violation_type: string;
  invigilator: string;
  dac_decision: string;
  cmc_decision: string;
  workflow_status: string;
  is_repeat_offender: boolean;
  description?: string;
  created_at: string;
  students?: {
    id: string;
    student_id: string;
    full_name: string;
    program: string;
    departments?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
}

interface PrintableViolationReportProps {
  violation: ViolationData;
  priorViolationCount?: number;
}

export const PrintableViolationReport = ({ 
  violation, 
  priorViolationCount = 0 
}: PrintableViolationReportProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Violation Report - ${violation.students?.student_id}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            margin: 0;
            padding: 0;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .header img {
            width: 80px;
            height: auto;
            margin-bottom: 10px;
          }
          
          .header h1 {
            font-size: 16pt;
            margin: 5px 0;
            text-transform: uppercase;
          }
          
          .header h2 {
            font-size: 14pt;
            margin: 5px 0;
            font-weight: normal;
          }
          
          .header h3 {
            font-size: 12pt;
            margin: 10px 0 0;
            font-weight: bold;
          }
          
          .ref-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 11pt;
          }
          
          .section {
            margin-bottom: 20px;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 12pt;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          
          .info-item {
            display: flex;
          }
          
          .info-label {
            font-weight: bold;
            width: 140px;
            flex-shrink: 0;
          }
          
          .info-value {
            flex: 1;
          }
          
          .repeat-warning {
            background: #fee2e2;
            border: 2px solid #dc2626;
            padding: 10px;
            margin: 15px 0;
            text-align: center;
            font-weight: bold;
            color: #dc2626;
          }
          
          .decision-box {
            border: 1px solid #333;
            padding: 15px;
            margin: 10px 0;
          }
          
          .decision-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .decision-value {
            font-size: 13pt;
            padding: 5px 0;
          }
          
          .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          
          .signature-block {
            text-align: center;
          }
          
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 50px;
            padding-top: 5px;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #333;
            font-size: 10pt;
            text-align: center;
            color: #666;
          }
          
          .confidential {
            text-align: center;
            font-style: italic;
            color: #666;
            margin-top: 20px;
          }
          
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const reportDate = format(new Date(), 'MMMM dd, yyyy');
  const incidentDate = violation.incident_date 
    ? format(new Date(violation.incident_date), 'MMMM dd, yyyy') 
    : 'N/A';
  const refNumber = `ASTU/DISC/${format(new Date(violation.created_at), 'yyyy')}/${violation.id.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handlePrint}
        className="gap-2"
      >
        <Printer className="h-4 w-4" />
        Print Report
      </Button>

      {/* Hidden printable content */}
      <div className="hidden">
        <div ref={printRef}>
          {/* Header */}
          <div className="header">
            <img src={universityLogo} alt="ASTU Logo" />
            <h1>Adama Science and Technology University</h1>
            <h2>Office of Academic Affairs</h2>
            <h3>EXAMINATION MISCONDUCT INCIDENT REPORT</h3>
          </div>

          {/* Reference Info */}
          <div className="ref-section">
            <div><strong>Ref No:</strong> {refNumber}</div>
            <div><strong>Date:</strong> {reportDate}</div>
          </div>

          {/* Student Information */}
          <div className="section">
            <div className="section-title">I. STUDENT INFORMATION</div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Full Name:</span>
                <span className="info-value">{violation.students?.full_name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Student ID:</span>
                <span className="info-value">{violation.students?.student_id || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Department:</span>
                <span className="info-value">{violation.students?.departments?.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Program:</span>
                <span className="info-value">{violation.students?.program || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Repeat Offender Warning */}
          {violation.is_repeat_offender && (
            <div className="repeat-warning">
              ⚠️ REPEAT OFFENDER - This student has {priorViolationCount} prior violation(s) on record
            </div>
          )}

          {/* Incident Details */}
          <div className="section">
            <div className="section-title">II. INCIDENT DETAILS</div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Incident Date:</span>
                <span className="info-value">{incidentDate}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Exam Type:</span>
                <span className="info-value">{violation.exam_type}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Course Name:</span>
                <span className="info-value">{violation.course_name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Course Code:</span>
                <span className="info-value">{violation.course_code}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Violation Type:</span>
                <span className="info-value">{violation.violation_type}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Invigilator:</span>
                <span className="info-value">{violation.invigilator}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {violation.description && (
            <div className="section">
              <div className="section-title">III. INCIDENT DESCRIPTION</div>
              <p>{violation.description}</p>
            </div>
          )}

          {/* Decisions */}
          <div className="section">
            <div className="section-title">IV. COMMITTEE DECISIONS</div>
            
            <div className="decision-box">
              <div className="decision-title">Department Academic Council (DAC) Decision:</div>
              <div className="decision-value">{violation.dac_decision}</div>
            </div>
            
            <div className="decision-box">
              <div className="decision-title">College Management Council (CMC) Decision:</div>
              <div className="decision-value">{violation.cmc_decision}</div>
            </div>
          </div>

          {/* Signatures */}
          <div className="signature-section">
            <div className="signature-block">
              <div className="signature-line">
                Department Head<br />
                Date: ________________
              </div>
            </div>
            <div className="signature-block">
              <div className="signature-line">
                Academic Vice Dean<br />
                Date: ________________
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="confidential">
            This document is confidential and intended for official use only.
          </div>
          
          <div className="footer">
            Adama Science and Technology University | P.O. Box 1888, Adama, Ethiopia<br />
            Generated from ASTU Violation Management System
          </div>
        </div>
      </div>
    </>
  );
};
