import { describe, it, expect } from 'vitest';
import { getRightsFileErrorMessage } from '@/components/admin/RightsIntakeDetail/rightsFileErrors';
import { ApiError } from '@/types/api';

// WP-9: ошибки хранилища приходят телом { message, code }. Редактор должен читать причину,
// а не «Failed to fetch».
describe('getRightsFileErrorMessage (WP-9)', () => {
  it('translates a backend code from the response body', () => {
    const error = new ApiError({
      message: 'Архивная копия уже загружена.',
      statusCode: 400,
      data: { code: 'EVIDENCE_ARCHIVE_ALREADY_UPLOADED' },
    });

    expect(getRightsFileErrorMessage(error)).toContain('заведите новое доказательство');
  });

  it('explains the size limit behind a 413', () => {
    expect(getRightsFileErrorMessage(new ApiError({ message: '', statusCode: 413 }))).toContain(
      'больше допустимого размера'
    );
  });

  it('explains the unsupported media type behind a 415', () => {
    expect(getRightsFileErrorMessage(new ApiError({ message: '', statusCode: 415 }))).toContain(
      'application/pdf'
    );
  });

  it('replaces a raw network failure with a readable message', () => {
    expect(getRightsFileErrorMessage(new TypeError('Failed to fetch'))).toContain(
      'Сервер недоступен'
    );
  });

  it('falls back to a generic message for unknown values', () => {
    expect(getRightsFileErrorMessage('boom')).toContain('Не удалось выполнить операцию с файлом');
  });
});
