import { toErrorMessage } from '@/lib/toErrorMessage';

export interface ParsedSaveError {
  fieldErrors: Record<string, string>;
  serverError: string | null;
}

export function parseApiSaveError(err: any): ParsedSaveError {
  console.error('Save failed:', err);

  if (!(err && err.data)) {
    return {
      fieldErrors: {},
      serverError: toErrorMessage(err?.message, 'Operation failed due to connection error.'),
    };
  }

  const errData = err.data;

  if (Array.isArray(errData.errors)) {
    const newFieldErrors: Record<string, string> = {};
    const unmappedErrors: string[] = [];

    errData.errors.forEach((e: any) => {
      if (e && e.propertyName && e.errorMessage) {
        const prop = e.propertyName;
        const msg = toErrorMessage(e.errorMessage, 'Invalid value');
        const propLower = prop.toLowerCase();

        if (propLower.includes('name')) {
          newFieldErrors.name = msg;
        } else if (propLower === 'priorityduration') {
          newFieldErrors.priorityDuration = msg;
        } else if (propLower.includes('frequency') || propLower.includes('unit')) {
          newFieldErrors.frequencyUnit = msg;
        } else if (propLower.includes('sequence')) {
          newFieldErrors.sequence = msg;
        } else if (propLower === 'valuationtype' || propLower === 'valuationtypeno') {
          newFieldErrors.valuationType = msg;
        } else if (propLower.includes('parentlocation') || propLower.includes('parentno')) {
          newFieldErrors.parentLocationNo = msg;
        } else if (propLower.includes('inchargeno') || propLower.includes('incharge')) {
          newFieldErrors.inchargeNo = msg;
        } else if (propLower === 'address1') {
          newFieldErrors.address1 = msg;
        } else if (propLower === 'address2') {
          newFieldErrors.address2 = msg;
        } else if (propLower === 'address3') {
          newFieldErrors.address3 = msg;
        } else if (propLower === 'regionno' || propLower === 'locationregion') {
          newFieldErrors.locationRegion = msg;
        } else if (propLower === 'description') {
          newFieldErrors.description = msg;
        } else if (propLower.includes('user') || propLower.includes('member')) {
          newFieldErrors.selectedUsers = msg;
        } else {
          unmappedErrors.push(`${prop}: ${msg}`);
        }
      }
    });

    return {
      fieldErrors: newFieldErrors,
      serverError: unmappedErrors.length > 0 ? unmappedErrors.join(' | ') : null,
    };
  }

  const serverErrors = errData.errors;
  if (serverErrors && typeof serverErrors === 'object') {
    const messages: string[] = [];
    Object.entries(serverErrors).forEach(([field, msgs]) => {
      if (Array.isArray(msgs)) {
        messages.push(
          `${field}: ${msgs.map((m) => toErrorMessage(m, '')).filter(Boolean).join(', ')}`
        );
      } else if (typeof msgs === 'string') {
        messages.push(`${field}: ${msgs}`);
      } else {
        const text = toErrorMessage(msgs, '');
        if (text) messages.push(`${field}: ${text}`);
      }
    });
    return {
      fieldErrors: {},
      serverError:
        messages.length > 0
          ? messages.join(' | ')
          : toErrorMessage(errData.title ?? errData.message ?? err.message, 'Validation error occurred'),
    };
  }

  return {
    fieldErrors: {},
    serverError: toErrorMessage(
      errData.title ?? errData.message ?? err.message,
      'Operation failed'
    ),
  };
}
