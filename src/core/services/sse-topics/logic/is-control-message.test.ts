import { isControlMessage } from './is-control-message';

describe('isControlMessage', () => {
  it('should accept a topic-joined message with a topic in its props', () => {
    const actualResult = isControlMessage({ control: 'topic-joined', props: { topic: 'chat:7' } });

    expect(actualResult).toBe(true);
  });

  it('should accept a topic-left message with a topic in its props', () => {
    const actualResult = isControlMessage({ control: 'topic-left', props: { topic: 'chat:7' } });

    expect(actualResult).toBe(true);
  });

  it('should reject a topic message whose topic is not a string', () => {
    const actualResult = isControlMessage({ control: 'topic-joined', props: { topic: 7 } });

    expect(actualResult).toBe(false);
  });

  it('should accept a session-ended message with a session id in its props', () => {
    const actualResult = isControlMessage({ control: 'session-ended', props: { sessionId: 'session-1' } });

    expect(actualResult).toBe(true);
  });

  it('should reject a session-ended message without a session id', () => {
    const actualResult = isControlMessage({ control: 'session-ended' });

    expect(actualResult).toBe(false);
  });

  it('should reject an unknown control type', () => {
    const actualResult = isControlMessage({ control: 'unknown', props: { topic: 'chat:7' } });

    expect(actualResult).toBe(false);
  });

  it('should reject a data envelope', () => {
    const actualResult = isControlMessage({ event: 'update', data: { a: 1 } });

    expect(actualResult).toBe(false);
  });
});
