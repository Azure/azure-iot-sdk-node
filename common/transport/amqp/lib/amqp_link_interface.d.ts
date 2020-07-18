import { AmqpError } from 'rhea';
export interface AmqpLink {
    attach: (callback: (err?: Error) => void) => void;
    detach: (callback: (err?: Error) => void, err?: Error | AmqpError) => void;
    forceDetach: () => void;
}
