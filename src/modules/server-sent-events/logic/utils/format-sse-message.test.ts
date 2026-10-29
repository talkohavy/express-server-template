import { formatSseMessage } from './format-sse-message';

describe('formatSseMessage', () => {
  it('should format a data-only message', () => {
    const expectedResult = 'data: hello\n\n';

    const actualResult = formatSseMessage({ data: 'hello' });

    expect(actualResult).toEqual(expectedResult);
  });

  it('should place id and event before data', () => {
    const expectedResult = 'id: 1\nevent: update\ndata: {"a":1}\n\n';

    const actualResult = formatSseMessage({ id: '1', event: 'update', data: '{"a":1}' });

    expect(actualResult).toEqual(expectedResult);
  });

  it('should split multi-line data into one data line per line', () => {
    const expectedResult = 'data: line1\ndata: line2\ndata: line3\n\n';

    const actualResult = formatSseMessage({ data: 'line1\nline2\r\nline3' });

    expect(actualResult).toEqual(expectedResult);
  });

  it('should strip line breaks from event and id to prevent field injection', () => {
    const expectedResult = 'id: 12\nevent: updatedata: injected\ndata: x\n\n';

    const actualResult = formatSseMessage({ id: '1\n2', event: 'update\ndata: injected', data: 'x' });

    expect(actualResult).toEqual(expectedResult);
  });

  it('should format a comment line', () => {
    const expectedResult = ': ping\n\n';

    const actualResult = formatSseMessage({ comment: 'ping' });

    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep empty data as an empty data line', () => {
    const expectedResult = 'data: \n\n';

    const actualResult = formatSseMessage({ data: '' });

    expect(actualResult).toEqual(expectedResult);
  });
});
