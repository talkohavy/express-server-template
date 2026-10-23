import { isNullish } from '@talkohavy/lodash';

const LINE_BREAK_REGEX = /\r\n|\r|\n/;
const ALL_LINE_BREAKS_REGEX = /[\r\n]/g;

type FormatSseMessageProps = {
  data?: string;
  event?: string;
  id?: string;
  comment?: string;
};

/**
 * Serializes a message into the `text/event-stream` wire format.
 *
 * Multi-line `data` and `comment` values are split into one field line per line, since a raw line break
 * would otherwise terminate the field (or the whole message) early. Line breaks are stripped from `event`
 * and `id`, which are single-line fields.
 */
export function formatSseMessage(props: FormatSseMessageProps): string {
  const { data, event, id, comment } = props;

  const lines: string[] = [];

  if (comment != null) {
    const commentLines = comment.split(LINE_BREAK_REGEX);

    commentLines.forEach((line) => lines.push(`: ${line}`));
  }

  if (!isNullish(id)) lines.push(`id: ${id.replace(ALL_LINE_BREAKS_REGEX, '')}`);

  if (event) lines.push(`event: ${event.replace(ALL_LINE_BREAKS_REGEX, '')}`);

  if (!isNullish(data)) {
    const dataLines = data.split(LINE_BREAK_REGEX);

    dataLines.forEach((line) => lines.push(`data: ${line}`));
  }

  const message = `${lines.join('\n')}\n\n`;

  return message;
}
