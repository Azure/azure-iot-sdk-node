export interface AmqpLink {
  attach: (callback: (err?: Error) => void) => void;
  detach: (callback: (err?: Error) => void) => void;
  forceDetach: () => void;
}
