import { apiService } from './apiService';
import { DocumentAttachment } from '@/types/task';
import { dbService } from './dbService';
import { toast } from 'sonner';

export interface AttachmentResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  errors?: Array<{
    propertyName: string;
    errorMessage: string;
    errorCode: string;
  }>;
  traceId?: string;
}

export const attachmentService = {
  /**
   * 1. POST /api/document-attachments
   * Creates an entry in the database for the given file before uploading.
   */
  async createEntry(fileName: string, companyNo: number, formNo: number): Promise<DocumentAttachment> {
    const payload = [
      {
        fileName,
        companyNo,
        formNo
      }
    ];

    const response = await apiService.post<AttachmentResponse<DocumentAttachment[]>>(
      '/api/document-attachments',
      payload
    );

    if (response.success && response.data && response.data.length > 0) {
      return response.data[0];
    } else {
      throw new Error(response.message || response.error || 'Failed to create database attachment entry');
    }
  },

  /**
   * 2. PUT /api/document-attachments
   * Uploads the file binary for the created entry id.
   */
  async uploadFile(id: number, file: File): Promise<boolean> {
    const formData = new FormData();

    // Fallbacks for direct binders
    formData.append('id', id.toString());
    formData.append('file', file);

    // Pass standard array-indexed fields requested by the backend model binder
    formData.append('Attachment[0].id', id.toString());
    formData.append('Attachment[0].file', file);

    const response = await apiService.putMultipart<AttachmentResponse<boolean>>(
      '/api/document-attachments',
      formData
    );

    return response.success && response.data;
  },

  /**
   * 3. GET /api/document-attachments/status
   * Verifies the upload status.
   */
  async checkStatus(id: number): Promise<boolean> {
    try {
      const response = await apiService.get<AttachmentResponse<any>>(
        '/api/document-attachments/status',
        {
          params: {
            'DocNo': id.toString()
          }
        }
      );
      return response && response.success;
    } catch (error) {
      console.error('Failed to verify attachment upload status:', error);
      throw new Error('Verification of uploaded attachment failed');
    }
  },

  /**
   * 4. GET /api/document-attachments/{docNo}/download
   * Downloads the file content securely with authorization headers, then opens it in a new window (PDF/Images) or downloads it.
   */
  async downloadAttachment(id: number, name: string): Promise<void> {
    const lowercaseName = name.toLowerCase();
    const isInlineViewable =
      lowercaseName.endsWith('.pdf') ||
      lowercaseName.endsWith('.png') ||
      lowercaseName.endsWith('.jpg') ||
      lowercaseName.endsWith('.jpeg') ||
      lowercaseName.endsWith('.gif') ||
      lowercaseName.endsWith('.webp');

    let newTab: Window | null = null;
    if (isInlineViewable) {
      // Open a tab immediately inside the click handler to satisfy browser security & popup blockers
      newTab = window.open('about:blank', '_blank');
      if (newTab) {
        newTab.document.write(`
          <html>
            <head>
              <title>Loading ${name}...</title>
              <style>
                body {
                  margin: 0;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background-color: #0f172a;
                  color: #94a3b8;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                .spinner {
                  width: 40px;
                  height: 40px;
                  border: 4px solid #1e293b;
                  border-top: 4px solid #006699;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                  margin-bottom: 16px;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .title {
                  font-size: 14px;
                  font-weight: 600;
                  letter-spacing: 0.05em;
                  text-transform: uppercase;
                }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <div class="title">Securing Connection & Retrieving Document...</div>
            </body>
          </html>
        `);
      }
    }

    try {
      const token = await dbService.getItem<string>('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/document-attachments/${id}/download`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      // Explicitly set matching mimeType to override backend attachment disposition headers
      let mimeType = '';
      if (lowercaseName.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (lowercaseName.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (lowercaseName.endsWith('.jpg') || lowercaseName.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (lowercaseName.endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (lowercaseName.endsWith('.webp')) {
        mimeType = 'image/webp';
      }

      const rawBlob = await response.blob();
      const blob = mimeType ? new Blob([rawBlob], { type: mimeType }) : rawBlob;
      const url = window.URL.createObjectURL(blob);

      if (isInlineViewable && newTab) {
        // Direct the pre-opened tab to the secure local Blob URL
        newTab.location.href = url;
      } else {
        // Normal download for other file types
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Cleanup local URL allocation after some time
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Failed to download document:', error);
      if (newTab) {
        newTab.close();
      }
      toast.error('Failed to download or view the document. Please try again.');
      throw error;
    }
  },

  /**
   * Fetches the attachment as a File object (useful for direct analysis/OCR).
   */
  async getAttachmentFile(id: number, name: string): Promise<File> {
    const token = await dbService.getItem<string>('auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/document-attachments/${id}/download`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    let mimeType = '';
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (lowercaseName.endsWith('.png')) mimeType = 'image/png';
    else if (lowercaseName.endsWith('.jpg') || lowercaseName.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (lowercaseName.endsWith('.gif')) mimeType = 'image/gif';
    else if (lowercaseName.endsWith('.webp')) mimeType = 'image/webp';

    const rawBlob = await response.blob();
    const blob = mimeType ? new Blob([rawBlob], { type: mimeType }) : rawBlob;
    return new File([blob], name, { type: blob.type || 'application/octet-stream' });
  },

  /**
   * 5. GET /api/document-attachments
   * Gets the list of attachments for a given transactionId (taskNo).
   */
  async getAttachments(transactionId: number, formNo: number): Promise<DocumentAttachment[]> {
    try {
      const response = await apiService.get<AttachmentResponse<any[]>>(
        '/api/document-attachments',
        {
          params: {
            'transactionId': transactionId.toString(),
            'formNo': formNo.toString()
          }
        }
      );

      if (response && response.success && Array.isArray(response.data)) {
        return response.data.map((a: any) => ({
          id: a.id || a.docNo || a.operTaskAttachmentDetailNo || 0,
          name: a.docName || a.name || a.fileName || a.storedFileName || 'attachment',
          size: a.docSize || a.size || 0,
          storedFileName: a.storedFileName,
          storedFilePath: a.storedFilePath,
          relativePath: a.relativePath
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get attachments for transactionId:', transactionId, error);
      return [];
    }
  },

  /**
   * 6. DELETE /api/document-attachments/delete
   * Deletes an attachment by docNo.
   */
  async deleteAttachment(docNo: number): Promise<boolean> {
    try {
      const response = await apiService.delete<AttachmentResponse<boolean>>(
        '/api/document-attachments/delete',
        {
          params: {
            'docNo': docNo.toString()
          }
        }
      );
      return response && response.success;
    } catch (error) {
      console.error('Failed to delete attachment:', docNo, error);
      throw error;
    }
  }
};

