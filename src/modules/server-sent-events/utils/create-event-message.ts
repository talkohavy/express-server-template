type CreateEventMessageProps = {
  content: string;
  eventName?: string;
};

export function createEventMessage(props: CreateEventMessageProps) {
  const { content, eventName } = props;

  let message = `data: ${content}\n\n`;

  if (eventName) message = `event: ${eventName}\n${message}`;

  return message;
}
